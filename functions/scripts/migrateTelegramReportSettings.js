const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Ensure firebase-admin is initialized if not already
if (!admin.apps.length) {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'pos-v2-909ff';
  admin.initializeApp({
    projectId
  });
  console.log(`[MIGRATION] Initialized with project ID: ${projectId}`);
}

const db = admin.firestore();

async function migrateTelegramReportSettings({ dryRun = true } = {}) {
  const oldDocRef = db.doc('config/settings');
  const newDocRef = db.doc('settings/telegram_report');

  const oldSnap = await oldDocRef.get();
  const newSnap = await newDocRef.get();

  const old = oldSnap.exists ? oldSnap.data() : {};
  const existingNew = newSnap.exists ? newSnap.data() : {};

  const migrated = {
    enabled: old.telegramReportEnabled ?? existingNew.enabled ?? false,
    sendHour: old.telegramReportSendHour ?? existingNew.sendHour ?? 22,
    sendMinute: old.telegramReportSendMinute ?? existingNew.sendMinute ?? 30,
    timezone: old.telegramReportTimezone ?? existingNew.timezone ?? 'Asia/Ho_Chi_Minh',
    includeRevenue: old.telegramReportIncludeRevenue ?? existingNew.includeRevenue ?? true,
    includeOnlineOfflineBreakdown: old.telegramReportIncludeOnlineOfflineBreakdown ?? existingNew.includeOnlineOfflineBreakdown ?? true,
    includeTopItems: old.telegramReportIncludeTopItems ?? existingNew.includeTopItems ?? true,
    includePaymentMethods: old.telegramReportIncludePaymentMethods ?? existingNew.includePaymentMethods ?? true,
    includeMarketingSummary: old.telegramReportIncludeMarketingSummary ?? existingNew.includeMarketingSummary ?? false,
    migratedFrom: 'config/settings',
    migratedAt: new Date(),
  };

  if (dryRun) {
    console.log('[DRY RUN] Would write settings/telegram_report:', migrated);
    return migrated;
  }

  await newDocRef.set(migrated, { merge: true });
  console.log('[MIGRATION] Successfully wrote settings/telegram_report:', migrated);
  return migrated;
}

// Allow running from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  console.log(`Starting Telegram Report Settings Migration... (Dry Run: ${dryRun})`);
  migrateTelegramReportSettings({ dryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateTelegramReportSettings };
