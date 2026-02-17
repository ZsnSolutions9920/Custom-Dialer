const logger = require('../utils/logger');

const WEBHOOK_URL = process.env.DISCORD_ATTENDANCE_WEBHOOK_URL;

async function sendAttendanceNotification({ agentName, type, timestamp, durationSeconds }) {
  if (!WEBHOOK_URL) {
    logger.warn('DISCORD_ATTENDANCE_WEBHOOK_URL not set, skipping notification');
    return;
  }

  const isClockIn = type === 'clock_in';
  const time = new Date(timestamp).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const fields = [
    { name: 'Agent', value: agentName, inline: true },
    { name: 'Time', value: time, inline: true },
  ];

  if (!isClockIn && durationSeconds != null) {
    const hrs = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    const secs = durationSeconds % 60;
    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    fields.push({ name: 'Duration', value: parts.join(' '), inline: true });
  }

  const embed = {
    title: isClockIn ? '🟢 Clock In' : '🔴 Clock Out',
    color: isClockIn ? 0x10b981 : 0xef4444,
    fields,
    timestamp: new Date(timestamp).toISOString(),
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text }, 'Discord webhook failed');
    }
  } catch (err) {
    logger.error({ err }, 'Discord webhook request error');
  }
}

module.exports = { sendAttendanceNotification };
