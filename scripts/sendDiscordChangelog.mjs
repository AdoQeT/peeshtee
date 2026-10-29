/**
 * Discord Webhook Dispatch Script
 * Sends concise English changelog summary to Discord
 */

const WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1565384796052525056/fuXQABnujrCaB_Vz5WKoZSiydNHwWUStVAvM6ZptxnvDf8bHk4RFyZN3gbQzcV6sVmx5';

const message = `v1.14.3
-social screen redesigned
-general bugfix
-online lobby remake
-animation update`;

async function sendWebhook() {
  try {
    const payload = {
      content: message,
      username: 'Peeshtee Release Bot'
    };

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Webhook failed with HTTP ${res.status}: ${errText}`);
      process.exit(1);
    }

    console.log('✅ Discord webhook update log successfully delivered!');
  } catch (err) {
    console.error('Webhook error:', err);
    process.exit(1);
  }
}

sendWebhook();
