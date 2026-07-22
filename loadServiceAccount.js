const fs = require('fs');
const path = require('path');

function parseJson(text, sourceLabel) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid service account JSON from ${sourceLabel}: ${error.message || error}`);
  }
}

function loadFromFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) return null;
  const text = fs.readFileSync(resolvedPath, 'utf8');
  return parseJson(text, resolvedPath);
}

function loadServiceAccount(baseDir = __dirname) {
  const envPathKeys = [
    'GOOGLE_APPLICATION_CREDENTIALS',
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    'SERVICE_ACCOUNT_JSON_PATH',
  ];
  for (const key of envPathKeys) {
    const filePath = String(process.env[key] || '').trim();
    if (!filePath) continue;
    const loaded = loadFromFile(filePath);
    if (loaded) return loaded;
  }

  const envJsonKeys = [
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
  ];
  for (const key of envJsonKeys) {
    const raw = String(process.env[key] || '').trim();
    if (!raw) continue;
    return parseJson(raw, key);
  }

  const directPath = path.join(baseDir, 'serviceAccountKey.json');
  if (fs.existsSync(directPath)) return loadFromFile(directPath);

  const fallback = fs.readdirSync(baseDir).find(name =>
    /^.+-firebase-adminsdk-[^.]+\.json$/i.test(name)
  );
  if (!fallback) return null;
  return loadFromFile(path.join(baseDir, fallback));
}

module.exports = { loadServiceAccount };
