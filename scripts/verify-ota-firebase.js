'use strict';
/**
 * verify-ota-firebase.js
 * Checks dist/ota/latest.json, zip existence, zip sha256, fileCount,
 * and ensures forbidden paths are absent from the zip.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OTA_DIR = path.join(ROOT, 'dist', 'ota');
const LATEST_JSON = path.join(OTA_DIR, 'latest.json');

const FORBIDDEN_ENTRY_PATTERNS = [
  /^ota\//,
  /^android\//,
  /^android-native\//,
  /^functions\//,
  /^node_modules\//,
  /^\.env/,
  /google-services\.json$/,
  /serviceAccount(Key)?\.json$/i,
];

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

// 1. latest.json exists and is valid
if (!fs.existsSync(LATEST_JSON)) fail('dist/ota/latest.json not found. Run npm run cap:ota:bundle first.');
let latest;
try { latest = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf8')); } catch (e) { fail('latest.json is not valid JSON: ' + e.message); }

const required = ['version', 'url', 'sha256', 'sizeBytes', 'fileCount', 'appId', 'createdAt'];
for (const k of required) {
  if (!latest[k]) fail(`latest.json missing field: ${k}`);
}
console.log('OK: latest.json valid, version=' + latest.version);

// 2. url must start with /ota/ and point to a zip
if (!latest.url.startsWith('/ota/') || !latest.url.endsWith('.zip')) {
  fail('latest.json url must be /ota/<name>.zip, got: ' + latest.url);
}

// 3. Zip file exists in dist/ota/
const zipName = path.basename(latest.url);
const zipPath = path.join(OTA_DIR, zipName);
if (!fs.existsSync(zipPath)) fail(`zip not found in dist/ota/: ${zipName}`);
console.log('OK: zip exists at dist/ota/' + zipName);

// 4. sha256 matches
const actual = sha256File(zipPath);
if (actual !== latest.sha256) {
  fail(`sha256 mismatch.\n  expected: ${latest.sha256}\n  actual:   ${actual}`);
}
console.log('OK: sha256 verified');

// 5. sizeBytes matches
const actualSize = fs.statSync(zipPath).size;
if (actualSize !== latest.sizeBytes) {
  fail(`sizeBytes mismatch: expected ${latest.sizeBytes}, got ${actualSize}`);
}
console.log('OK: sizeBytes verified');

// 6. Inspect zip entries for forbidden paths
// Use unzip -Z1 (list filenames only) — available on Linux/macOS
let entries;
try {
  entries = execSync(`unzip -Z1 "${zipPath}"`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
} catch (e) {
  // Fallback: try python zipfile
  try {
    entries = execSync(
      `python3 -c "import zipfile,sys; [print(n) for n in zipfile.ZipFile(sys.argv[1]).namelist()]" "${zipPath}"`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);
  } catch {
    fail('Cannot inspect zip entries (neither unzip nor python3 available).');
  }
}

const fileCount = entries.length;
if (fileCount !== latest.fileCount) {
  fail(`fileCount mismatch: manifest says ${latest.fileCount}, zip has ${fileCount} entries`);
}
console.log(`OK: fileCount=${fileCount}`);

// 7. No forbidden entries
const violations = entries.filter(e => FORBIDDEN_ENTRY_PATTERNS.some(re => re.test(e)));
if (violations.length) {
  fail('Zip contains forbidden entries:\n  ' + violations.join('\n  '));
}
console.log('OK: no forbidden entries in zip');

// 8. per-release manifest json also exists in dist/ota/
const releaseJson = path.join(OTA_DIR, zipName.replace('.zip', '.json'));
if (!fs.existsSync(releaseJson)) fail('per-release manifest not found: ' + path.basename(releaseJson));
console.log('OK: per-release manifest exists');

console.log('\nAll OTA Firebase checks passed ✓');
