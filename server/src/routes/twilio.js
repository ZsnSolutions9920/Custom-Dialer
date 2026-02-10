const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const config = require('../config');
const agentService = require('../services/agentService');
const callService = require('../services/callService');
const validateTwilio = require('../middleware/validateTwilio');
const logger = require('../utils/logger');

const router = express.Router();

// Main voice webhook - handles both outbound (from TwiML App) and inbound calls
router.post('/voice', validateTwilio, async (req, res) => {
  const twiml = new VoiceResponse();
  const { To, From, CallSid, Direction } = req.body;

  logger.info({ To, From, CallSid, Direction }, 'Voice webhook hit');

  try {
    // Outbound call from agent (To is a phone number)
    if (To && !To.startsWith('client:') && To !== config.twilio.phoneNumber) {
      const conferenceName = `conf_${CallSid}`;

      // Put the agent into a conference
      const dial = twiml.dial({ callerId: config.twilio.phoneNumber });
      dial.conference(
        {
          startConferenceOnEnter: true,
          endConferenceOnExit: true,
          record: 'record-from-start',
          recordingStatusCallback: `${config.serverBaseUrl}/api/twilio/recording-status`,
          recordingStatusCallbackEvent: 'completed',
          statusCallback: `${config.serverBaseUrl}/api/twilio/conference-status`,
          statusCallbackEvent: 'start end join leave',
          waitUrl: `${config.serverBaseUrl}/api/twilio/hold-music`,
        },
        conferenceName
      );

      // Find the agent by their Twilio identity
      const fromIdentity = req.body.From ? req.body.From.replace('client:', '') : null;
      const agent = fromIdentity ? await agentService.findByIdentity(fromIdentity) : null;

      // Dial the external number into the conference via REST API
      const twilioClient = require('../services/twilioClient');
      twilioClient.conferences(conferenceName)
        .participants
        .create({
          to: To,
          from: config.twilio.phoneNumber,
          earlyMedia: true,
          endConferenceOnExit: true,
          statusCallback: `${config.serverBaseUrl}/api/twilio/conference-status`,
          statusCallbackEvent: 'initiated ringing answered completed',
        })
        .then(async (participant) => {
          logger.info({ conferenceName, participantSid: participant.callSid }, 'External participant added');

          // Track the active call
          if (agent) {
            await callService.createActiveCall({
              callSid: CallSid,
              conferenceName,
              agentId: agent.id,
              direction: 'outbound',
              from: config.twilio.phoneNumber,
              to: To,
              status: 'in-progress',
            });

            await callService.createCallLog({
              callSid: CallSid,
              direction: 'outbound',
              agentId: agent.id,
              from: config.twilio.phoneNumber,
              to: To,
              status: 'initiated',
            });

            await agentService.updateStatus(agent.id, 'on_call');

            const io = req.app.get('io');
            if (io) {
              io.emit('agent:status', { id: agent.id, status: 'on_call' });
              io.emit('call:outbound', {
                callSid: CallSid,
                conferenceName,
                agentId: agent.id,
                to: To,
                participantCallSid: participant.callSid,
              });
            }
          }
        })
        .catch((err) => {
          logger.error(err, 'Failed to add external participant');
        });

      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Inbound call to our Twilio number
    if (Direction === 'inbound' || To === config.twilio.phoneNumber) {
      logger.info({ From, CallSid }, 'Inbound call received');

      const availableAgents = await agentService.listAvailable();

      if (availableAgents.length === 0) {
        twiml.say('We are sorry, no agents are available right now. Please try again later.');
        twiml.hangup();
        res.type('text/xml');
        return res.send(twiml.toString());
      }

      // Ring all available agents simultaneously
      const dial = twiml.dial({
        callerId: From,
        timeout: 30,
        record: 'record-from-answer',
        recordingStatusCallback: `${config.serverBaseUrl}/api/twilio/recording-status`,
        recordingStatusCallbackEvent: 'completed',
        action: `${config.serverBaseUrl}/api/twilio/voice-action`,
      });

      for (const agent of availableAgents) {
        dial.client(agent.twilio_identity);
      }

      // Log the inbound call
      await callService.createCallLog({
        callSid: CallSid,
        direction: 'inbound',
        from: From,
        to: config.twilio.phoneNumber,
        status: 'ringing',
      });

      // Notify agents of incoming call via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('call:incoming', {
          callSid: CallSid,
          from: From,
        });
      }

      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Default
    twiml.say('Unexpected call routing. Please contact support.');
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (err) {
    logger.error(err, 'Error in voice webhook');
    twiml.say('An error occurred. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Action URL after inbound dial completes - redirect accepted call into conference
router.post('/voice-action', validateTwilio, async (req, res) => {
  const twiml = new VoiceResponse();
  const { DialCallStatus, CallSid, DialCallSid, From } = req.body;

  logger.info({ DialCallStatus, CallSid, DialCallSid }, 'Voice action callback');

  try {
    if (DialCallStatus === 'completed' || DialCallStatus === 'answered') {
      // The call was answered - it will have already been handled
      // Just acknowledge
      twiml.hangup();
    } else {
      // No one answered
      twiml.say('We are sorry, no agents are available right now. Please try again later.');
      twiml.hangup();

      await callService.updateCallLog(CallSid, {
        status: 'no-answer',
        endedAt: new Date(),
      });
    }
  } catch (err) {
    logger.error(err, 'Error in voice-action');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Conference status callback
router.post('/conference-status', validateTwilio, async (req, res) => {
  const {
    ConferenceSid,
    FriendlyName,
    StatusCallbackEvent,
    CallSid,
    Muted,
    Hold,
  } = req.body;

  logger.info({ ConferenceSid, FriendlyName, StatusCallbackEvent, CallSid }, 'Conference status event');

  try {
    const io = req.app.get('io');

    if (StatusCallbackEvent === 'conference-start') {
      // Update active calls with conference SID
      const activeCall = await callService.getActiveCallByConference(FriendlyName);
      if (activeCall) {
        await callService.createActiveCall({
          callSid: activeCall.call_sid,
          conferenceSid: ConferenceSid,
          conferenceName: FriendlyName,
          agentId: activeCall.agent_id,
          direction: activeCall.direction,
          from: activeCall.from_number,
          to: activeCall.to_number,
          status: 'in-progress',
        });

        await callService.updateCallLog(activeCall.call_sid, {
          conferenceSid: ConferenceSid,
          status: 'in-progress',
        });

        if (io) {
          io.emit('call:conference-started', {
            conferenceSid: ConferenceSid,
            conferenceName: FriendlyName,
          });
        }
      }
    }

    if (StatusCallbackEvent === 'participant-join') {
      if (io) {
        io.emit('call:participant-joined', { conferenceSid: ConferenceSid, callSid: CallSid, conferenceName: FriendlyName });
      }
    }

    if (StatusCallbackEvent === 'participant-leave') {
      if (io) {
        io.emit('call:participant-left', { conferenceSid: ConferenceSid, callSid: CallSid, conferenceName: FriendlyName });
      }
    }

    if (StatusCallbackEvent === 'conference-end') {
      // Clean up active calls
      await callService.removeActiveCallsByConference(FriendlyName);

      // Update call log
      const { rows } = await require('../db/pool').query(
        'SELECT * FROM call_logs WHERE conference_sid = $1',
        [ConferenceSid]
      );
      for (const log of rows) {
        if (!log.ended_at) {
          const now = new Date();
          const durationSeconds = Math.round((now - new Date(log.started_at)) / 1000);
          await callService.updateCallLog(log.call_sid, {
            status: 'completed',
            endedAt: now,
            durationSeconds,
          });
        }
        if (log.agent_id) {
          await agentService.updateStatus(log.agent_id, 'available');
          if (io) {
            io.emit('agent:status', { id: log.agent_id, status: 'available' });
          }
        }
      }

      if (io) {
        io.emit('call:ended', { conferenceSid: ConferenceSid, conferenceName: FriendlyName });
      }

      // Fetch recording from Twilio API after a delay (recording takes time to process)
      const callSidsToCheck = rows.map((log) => log.call_sid).filter(Boolean);
      setTimeout(async () => {
        try {
          const twilioClient = require('../services/twilioClient');
          const recordings = await twilioClient.recordings.list({
            conferenceSid: ConferenceSid,
            limit: 1,
          });
          if (recordings.length > 0) {
            const rec = recordings[0];
            const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Recordings/${rec.sid}`;
            for (const callSid of callSidsToCheck) {
              await callService.updateCallLog(callSid, {
                recordingSid: rec.sid,
                recordingUrl,
              });
            }
            logger.info({ conferenceSid: ConferenceSid, recordingSid: rec.sid }, 'Recording saved from API');
          }
        } catch (err) {
          logger.error(err, 'Failed to fetch recording from Twilio API');
        }
      }, 15000);
    }
  } catch (err) {
    logger.error(err, 'Error handling conference status');
  }

  res.sendStatus(200);
});

// Hold music TwiML
router.post('/hold-music', validateTwilio, (req, res) => {
  const twiml = new VoiceResponse();
  twiml.play({ loop: 0 }, 'https://api.twilio.com/cowbell.mp3');
  res.type('text/xml');
  res.send(twiml.toString());
});

// Recording status callback - Twilio calls this when a recording is ready
router.post('/recording-status', validateTwilio, async (req, res) => {
  const { RecordingSid, RecordingUrl, CallSid, ConferenceSid } = req.body;

  logger.info({ RecordingSid, RecordingUrl, CallSid, ConferenceSid }, 'Recording status callback');

  try {
    if (!RecordingSid || !RecordingUrl) {
      return res.sendStatus(200);
    }

    const pool = require('../db/pool');

    // For inbound calls (Dial recording) — match by CallSid
    // For outbound calls (Conference recording) — match by ConferenceSid
    let updated = false;

    if (CallSid) {
      const { rowCount } = await pool.query(
        'UPDATE call_logs SET recording_sid = $1, recording_url = $2 WHERE call_sid = $3 AND recording_sid IS NULL',
        [RecordingSid, RecordingUrl, CallSid]
      );
      if (rowCount > 0) updated = true;
    }

    if (!updated && ConferenceSid) {
      await pool.query(
        'UPDATE call_logs SET recording_sid = $1, recording_url = $2 WHERE conference_sid = $3 AND recording_sid IS NULL',
        [RecordingSid, RecordingUrl, ConferenceSid]
      );
    }
  } catch (err) {
    logger.error(err, 'Error handling recording status');
  }

  res.sendStatus(200);
});

module.exports = router;
