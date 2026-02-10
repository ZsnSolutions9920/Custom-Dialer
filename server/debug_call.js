require('dotenv').config();
const agentService = require('./src/services/agentService');
const config = require('./src/config');

(async () => {
  const From = 'client:agent_eve';
  const To = '+15551234567';

  const fromIdentity = From ? From.replace('client:', '') : null;
  console.log('fromIdentity:', fromIdentity);

  const agent = fromIdentity ? await agentService.findByIdentity(fromIdentity) : null;
  console.log('agent found:', !!agent);
  if (agent) {
    console.log('agent.id:', agent.id);
    console.log('agent.twilio_phone_number:', agent.twilio_phone_number);
  }

  const agentPhone = agent?.twilio_phone_number || null;
  console.log('agentPhone:', agentPhone);
  console.log('config.twilio.phoneNumber:', config.twilio.phoneNumber);

  const isOutbound = !!(To && !To.startsWith('client:') && To !== agentPhone && To !== config.twilio.phoneNumber);
  console.log('isOutbound:', isOutbound);
  console.log('wouldBlock (!agentPhone):', !agentPhone);

  process.exit(0);
})();
