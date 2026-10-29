/**
 * Discord Webhook Dispatch Script
 * Sends concise English changelog summary to Discord as a rich Embed
 *
 * Usage:
 *   npm run changelog
 *   or: node scripts/sendDiscordChangelog.mjs "v1.15.0" "-feature A\n-bugfix B"
 */

const WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1565384796052525056/fuXQABnujrCaB_Vz5WKoZSiydNHwWUStVAvM6ZptxnvDf8bHk4RFyZN3gbQzcV6sVmx5';

const defaultBullets = [
  '-duplicate deck on table fixed',
  '-deck cut & merge animation smoothed',
  '-duplicate social button removed',
  '-online match stats & history fixed',
  '-pisti placement & cascade updated'
].join('\n');

const versionTitle = process.argv[2] || 'v1.14.3';
const changelogDescription = process.argv[3] || defaultBullets;

async function sendWebhook() {
  try {
    const payload = {
      username: 'Peeshtee Release Bot',
      avatar_url: 'https://raw.githubusercontent.com/adoqet/peeshtee/main/public/favicon.ico',
      embeds: [
        {
          title: versionTitle,
          description: changelogDescription,
          color: 0x10B981, // Emerald brand color
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Project P • Peeshtee: Overdrive'
          }
        }
      ]
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

    console.log(`✅ Discord embed update log for ${versionTitle} successfully delivered!`);
  } catch (err) {
    console.error('Webhook error:', err);
    process.exit(1);
  }
}

sendWebhook();
