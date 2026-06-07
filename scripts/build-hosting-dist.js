'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const EXCLUDED_DIRS = new Set([
  '.git',
  '.firebase',
  '.codex',
  '.vscode',
  'node_modules',
  'functions',
  'docs',
  'scripts',
  'backups',
  'dist',
  'coverage',
]);

const STATIC_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.svg',
  '.png',
  '.webp',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webmanifest',
]);

const JSON_ALLOWLIST = new Set([
  'manifest.json',
  'package.json',
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(full, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!STATIC_EXTENSIONS.has(ext) && !(ext === '.json' && JSON_ALLOWLIST.has(entry.name))) continue;
    if (rel === 'index.html') continue; // keep the Vite-transformed index.html in dist.
    files.push({ full, rel });
  }
  return files;
}

function copyFile(src, rel) {
  const dest = path.join(dist, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main() {
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
    cwd: root,
    stdio: 'inherit',
  });

  const copied = walk(root);
  for (const { full, rel } of copied) copyFile(full, rel);

  const required = [
    'index.html',
    'app.js',
    'data.js',
    'store.js',
    'db.js',
    'ai-core.js',
    'ai-actions.js',
    'ai-ui.js',
    'offlineBackup.js',
    'offlineSync.js',
    'offlineFirestoreAdapter.js',
    'offlineRuntime.js',
    'offlineStatusUI.js',
    'offlineOrderFallback.js',
    'offlineOrderFallbackDevTools.js',
    'kitchen.html',
    'manifest.json',
  ];

  const missing = required.filter(rel => !fs.existsSync(path.join(dist, rel)));
  if (missing.length) {
    throw new Error(`Hosting dist missing required runtime files: ${missing.join(', ')}`);
  }

  const allFiles = [];
  walkDist(dist, allFiles);
  const bytes = allFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  console.log(`OK: hosting dist prepared with ${allFiles.length} files (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
}

function walkDist(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDist(full, files);
    else if (entry.isFile()) files.push(full);
  }
}

main();
