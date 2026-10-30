/**
 * Discord Webhook Dispatch Script
 * Sends concise English changelog summary to Discord as a rich Embed
 *
 * Usage:
 *   npm run changelog
 *   or: node scripts/sendDiscordChangelog.mjs "v1.15.0" "-feature A\n-bugfix B"
 */

import fs from 'node:fs';
import path from 'node:path';

// Automatically load DISCORD_WEBHOOK_URL from .env if present
let WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^\s*DISCORD_WEBHOOK_URL\s*=\s*["']?(.*?)["']?\s*$/m);
      if (match && match[1]) {
        WEBHOOK_URL = match[1].trim();
      }
    }
  } catch {}
}

if (!WEBHOOK_URL) {
  console.error('❌ DISCORD_WEBHOOK_URL environment variable is missing.');
  console.log('ℹ️  Skipping Discord changelog dispatch. Set DISCORD_WEBHOOK_URL in environment or .env file to enable.');
  process.exit(0);
}

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
