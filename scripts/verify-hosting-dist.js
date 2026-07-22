'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const requiredFiles = [
  'index.html', 'app.js', 'data.js', 'store.js', 'db.js',
  'ai-core.js', 'ai-actions.js', 'ai-ui.js',
  'offlineBackup.js', 'offlineSync.js', 'offlineFirestoreAdapter.js',
  'offlineRuntime.js', 'offlineStatusUI.js', 'offlineOrderFallback.js',
  'offlineOrderFallbackDevTools.js', 'kitchen.html', 'manifest.json',
];
const forbiddenSegments = new Set(['functions', 'docs', 'scripts', 'android', 'android-native']);
const forbiddenFilePattern = /(^|\/)(?:\.env(?:\.|$)|serviceaccount|.*(?:credential|secret).*\.json$)/i;

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function verifyHostingDist({ distDir = dist } = {}) {
  const failures = [];
  if (!fs.existsSync(distDir)) return ['dist directory is missing; run npm run build:hosting first'];

  for (const relativePath of requiredFiles) {
    if (!fs.existsSync(path.join(distDir, relativePath))) failures.push(`missing required runtime file: ${relativePath}`);
  }

  for (const file of walk(distDir)) {
    const relativePath = path.relative(distDir, file).split(path.sep).join('/');
    const segments = relativePath.split('/').map(segment => segment.toLowerCase());
    if (segments.some(segment => forbiddenSegments.has(segment))) failures.push(`forbidden build path: ${relativePath}`);
    if (forbiddenFilePattern.test(relativePath)) failures.push(`forbidden sensitive-looking artifact: ${relativePath}`);
  }

  const sourceIndex = path.join(root, 'index.html');
  const distIndex = path.join(distDir, 'index.html');
  if (fs.existsSync(sourceIndex) && fs.existsSync(distIndex)) {
    const sourceHtml = fs.readFileSync(sourceIndex, 'utf8');
    const distHtml = fs.readFileSync(distIndex, 'utf8');
    if (distHtml !== sourceHtml) failures.push('index.html must remain byte-identical to source static runtime');
    if (!distHtml.includes('type="module" src="db.js')) failures.push('index.html must load db.js module directly');
    if (!distHtml.includes('type="module" src="app/esm/main.js')) failures.push('index.html must load app/esm/main.js directly');
    if (/\/assets\/main-[^"']+\.js/.test(distHtml)) failures.push('index.html must not use Vite-bundled main runtime');
  }
  return failures;
}

if (require.main === module) {
  const failures = verifyHostingDist();
  if (failures.length) {
    console.error('HOSTING_DIST_VERIFY_FAILED');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`HOSTING_DIST_VERIFY_OK required=${requiredFiles.length}`);
  }
}

module.exports = { verifyHostingDist, requiredFiles };
