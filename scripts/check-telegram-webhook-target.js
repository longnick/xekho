'use strict';

const path = require('path');
const https = require('https');

const projectId = process.env.XEKHO_FIREBASE_PROJECT_ID || 'pos-v2-909ff';
const region = process.env.XEKHO_FUNCTION_REGION || 'asia-southeast1';
const serviceId = process.env.XEKHO_TELEGRAM_SERVICE_ID || 'telegramwebhook';
const forbiddenTargetPattern = /aidirectorbrieftelegramwebhook/i;

function loadFirebaseAuth() {
  const candidates = [
    'firebase-tools/lib/auth.js',
    '/home/longnick/.npm/_npx/ba4f1959e38407b5/node_modules/firebase-tools/lib/auth.js',
  ];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (_) {}
  }
  throw new Error('firebase-tools auth module not found; run via npx firebase-tools first or set local tool path');
}

function requestJson(url, options = {}, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : '';
    const req = https.request(url, {
      method: options.method || (body ? 'POST' : 'GET'),
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        ...(options.headers || {}),
      },
      timeout: 30000,
    }, (res) => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', c => { out += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(out); } catch (_) {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${out.slice(0, 300)}`));
        }
        resolve(parsed || {});
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (body) req.write(body);
    req.end();
  });
}

function redactUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname.replace(/[A-Za-z0-9_-]{8,}/g, '[REDACTED]')}`;
  } catch (_) {
    return '[REDACTED_URL]';
  }
}

(async () => {
  const auth = loadFirebaseAuth();
  let account = auth.getGlobalDefaultAccount() || (auth.getAllAccounts() || [])[0];
  if (!account?.tokens) throw new Error('No Firebase CLI account available');
  auth.setActiveAccount({}, account);
  const cloudToken = (await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform'])).access_token;
  const service = await requestJson(`https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/services/${serviceId}`, {
    headers: { Authorization: `Bearer ${cloudToken}` },
  });
  const serviceUrl = String(service.uri || '').trim();
  const envList = (service.template?.containers || []).flatMap(c => c.env || []);
  const env = new Map(envList.map(e => [e.name, e.value || '']));
  const botToken = String(env.get('TELEGRAM_REPORT_BOT_TOKEN') || env.get('TELEGRAM_BOT_TOKEN') || '').trim();
  if (!botToken) throw new Error('Missing deployed Telegram bot token env');
  const info = await requestJson(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const webhookUrl = String(info.result?.url || '').trim();
  if (!webhookUrl) throw new Error('Telegram webhook URL is empty');
  if (forbiddenTargetPattern.test(webhookUrl)) {
    throw new Error(`Telegram webhook points to forbidden target: ${redactUrl(webhookUrl)}`);
  }
  if (!webhookUrl.includes(new URL(serviceUrl).host) && !webhookUrl.includes(serviceId)) {
    throw new Error(`Telegram webhook does not look like ${serviceId}: ${redactUrl(webhookUrl)}`);
  }
  if (info.result?.last_error_message) {
    throw new Error(`Telegram webhook has last error: ${info.result.last_error_message}`);
  }
  console.log(JSON.stringify({
    ok: true,
    serviceId,
    webhookUrlRedacted: redactUrl(webhookUrl),
    pendingUpdateCount: info.result?.pending_update_count || 0,
  }));
})().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
