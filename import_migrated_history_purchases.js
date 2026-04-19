const fs = require('fs');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

function sanitize(value) {
  if (Array.isArray(value)) {
    return value.map(sanitize).filter(v => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.entries(value).forEach(([key, val]) => {
      const next = sanitize(val);
      if (next !== undefined) out[key] = next;
    });
    return out;
  }
  return value === undefined ? null : value;
}

async function flush(items, docIdFn, colName, transform) {
  const BATCH_SIZE = 400;
  let written = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = db.batch();
    items.slice(i, i + BATCH_SIZE).forEach(item => {
      const id = String(docIdFn(item));
      const payload = sanitize(transform(item));
      batch.set(db.collection(colName).doc(id), payload, { merge: true });
      written++;
    });
    await batch.commit();
  }
  return written;
}

async function run() {
  const raw = JSON.parse(fs.readFileSync('GanhKho_Migrated_Backup.json', 'utf8'));
  const data = raw.data || {};
  const history = Array.isArray(data.history) ? data.history : [];
  const purchases = Array.isArray(data.purchases) ? data.purchases : [];

  const histWritten = await flush(
    history,
    item => item.historyId || item.id || `h_${item.paidAt || Date.now()}`,
    'history',
    item => ({
      ...item,
      is_migrated: true,
    })
  );

  const purchaseWritten = await flush(
    purchases,
    item => item.id || `pur_${item.date || Date.now()}_${item.name || 'unknown'}`,
    'purchases',
    item => ({ ...item })
  );

  console.log(JSON.stringify({
    ok: true,
    source: 'GanhKho_Migrated_Backup.json',
    history: {
      fromBackup: history.length,
      written: histWritten,
      migratedFlagForced: true,
    },
    purchases: {
      fromBackup: purchases.length,
      written: purchaseWritten,
    },
  }, null, 2));
}

run().catch(error => {
  console.error(JSON.stringify({
    ok: false,
    message: error.message,
    stack: error.stack,
  }, null, 2));
  process.exit(1);
});
