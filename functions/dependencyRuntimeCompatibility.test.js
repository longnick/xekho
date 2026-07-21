const fs = require('fs');
const path = require('path');
const axios = require('axios');
const indexSource = require('fs').readFileSync(require('path').join(__dirname, 'index.js'), 'utf8');
const telegramSendSource = require('fs').readFileSync(require('path').join(__dirname, 'telegram', 'send.js'), 'utf8');

function installedPackageVersion(packageName) {
  let directory = path.dirname(require.resolve(packageName));
  while (directory !== path.dirname(directory)) {
    const packagePath = path.join(directory, 'package.json');
    if (fs.existsSync(packagePath)) {
      const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (metadata.name === packageName) return metadata.version;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`package metadata not found for ${packageName}`);
}

function atLeast(actual, required) {
  const parse = version => String(version).split('.').map(part => Number(part.replace(/\D.*$/, '')) || 0);
  const [aMajor, aMinor, aPatch] = parse(actual);
  const [rMajor, rMinor, rPatch] = parse(required);
  return aMajor > rMajor || (aMajor === rMajor && (aMinor > rMinor || (aMinor === rMinor && aPatch >= rPatch)));
}

/**
 * Recursively find all installed copies of a package under a root node_modules
 * directory. Handles scoped packages, nested node_modules (hoisting artifacts),
 * and cycle-safe via a visited-realpath set.
 *
 * @param {string} startDir  – directory that contains a node_modules folder to
 *                             begin the search from (not the node_modules itself)
 * @param {string} pkgName   – npm package name (scoped names supported)
 * @param {Set<string>}  visited  – realpath-keyed cycle guard (internal)
 * @param {Array<{installedPath:string, version:string}>} results – accumulator
 * @returns {Array<{installedPath:string, version:string}>}
 */
function findAllInstalledCopies(startDir, pkgName, visited = new Set(), results = []) {
  const nmDir = path.join(startDir, 'node_modules');
  if (!fs.existsSync(nmDir)) return results;

  let realNm;
  try { realNm = fs.realpathSync(nmDir); } catch { return results; }
  if (visited.has(realNm)) return results;
  visited.add(realNm);

  // Determine the filesystem path of this candidate package inside nmDir.
  // pkgName may be scoped (e.g. "@scope/pkg") or plain.
  const candidatePath = path.join(nmDir, ...pkgName.split('/'));
  const pkgJsonPath = path.join(candidatePath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (meta.name === pkgName) {
        results.push({ installedPath: candidatePath, version: meta.version });
        // Recurse into this package's own node_modules (nested hoisting).
        findAllInstalledCopies(candidatePath, pkgName, visited, results);
      }
    } catch { /* malformed package.json – skip */ }
  }

  // Walk every sibling package in this node_modules for nested copies.
  let entries;
  try { entries = fs.readdirSync(nmDir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const entryName = entry.name;
    if (entryName === pkgName.split('/')[0] && !pkgName.startsWith('@')) continue; // already checked
    if (entryName.startsWith('@')) {
      // Scoped namespace – iterate children.
      const scopeDir = path.join(nmDir, entryName);
      let scopeEntries;
      try { scopeEntries = fs.readdirSync(scopeDir, { withFileTypes: true }); } catch { continue; }
      for (const scopedEntry of scopeEntries) {
        if (!scopedEntry.isDirectory() && !scopedEntry.isSymbolicLink()) continue;
        findAllInstalledCopies(path.join(scopeDir, scopedEntry.name), pkgName, visited, results);
      }
    } else {
      findAllInstalledCopies(path.join(nmDir, entryName), pkgName, visited, results);
    }
  }
  return results;
}

/** Returns true when the version string is a stable release (no pre-release tag). */
function isStableRelease(version) {
  return /^\d+\.\d+\.\d+$/.test(String(version).trim());
}

describe('Functions runtime dependency compatibility', () => {
  test('uses an axios release outside the 2026 advisory range', () => {
    expect(atLeast(axios.VERSION, '1.16.0')).toBe(true);
  });

  test('keeps the Functions outbound HTTP call sites on the patched axios client', () => {
    expect(indexSource).toContain("const axios = require('axios');");
    expect(telegramSendSource).toContain("require('axios')");
  });

  test('uses the Sprint 6A Firebase dependency pair that removes the Functions critical audit path', () => {
    const adminVersion = installedPackageVersion('firebase-admin');
    const functionsVersion = installedPackageVersion('firebase-functions');
    // Must be Admin major 13 (not 11, not 12, not 14)
    expect(adminVersion).toMatch(/^13\./);
    // Must be Functions major 7
    expect(functionsVersion).toMatch(/^7\./);
    // Minimum patch versions
    expect(atLeast(adminVersion, '13.10.0')).toBe(true);
    expect(atLeast(functionsVersion, '7.2.5')).toBe(true);
  });

  // ── R4 S6C-C: transitive vulnerability floor tests ────────────────────────

  describe('R4 S6C-C transitive vulnerability floors', () => {
    /**
     * brace-expansion: CVE range 2.0.0–2.1.1.
     * Every copy installed under functions/ at major 2 must be >=2.1.2.
     * Pre-release versions are rejected.
     */
    test('all brace-expansion@2.x copies are >=2.1.2 (no pre-release)', () => {
      const copies = findAllInstalledCopies(__dirname, 'brace-expansion');
      const major2 = copies.filter(c => String(c.version).startsWith('2.'));
      expect(major2.length).toBeGreaterThan(0); // sanity: we expect at least one copy
      for (const { installedPath, version } of major2) {
        expect(isStableRelease(version)).toBe(true);
        expect(atLeast(version, '2.1.2')).toBe(true);
      }
    });

    /**
     * form-data: CVE range 4.0.0–4.0.5.
     * Every copy at major 4 must be >=4.0.6.
     * Every copy at major 2 must be >=2.5.6.
     * Pre-release versions are rejected for both majors.
     */
    test('all form-data@4.x copies are >=4.0.6 (no pre-release)', () => {
      const copies = findAllInstalledCopies(__dirname, 'form-data');
      const major4 = copies.filter(c => String(c.version).startsWith('4.'));
      expect(major4.length).toBeGreaterThan(0); // sanity: axios ships form-data@4
      for (const { installedPath, version } of major4) {
        expect(isStableRelease(version)).toBe(true);
        expect(atLeast(version, '4.0.6')).toBe(true);
      }
    });

    test('all form-data@2.x copies are >=2.5.6 (no pre-release)', () => {
      const copies = findAllInstalledCopies(__dirname, 'form-data');
      const major2 = copies.filter(c => String(c.version).startsWith('2.'));
      // major-2 copies may be absent if hoisted away; only enforce when present.
      for (const { installedPath, version } of major2) {
        expect(isStableRelease(version)).toBe(true);
        expect(atLeast(version, '2.5.6')).toBe(true);
      }
    });

    /**
     * protobufjs: CVE range <=7.6.4.
     * Every copy at major 7 must be >=7.6.5.
     * Pre-release versions are rejected.
     */
    test('all protobufjs@7.x copies are >=7.6.5 (no pre-release)', () => {
      const copies = findAllInstalledCopies(__dirname, 'protobufjs');
      const major7 = copies.filter(c => String(c.version).startsWith('7.'));
      expect(major7.length).toBeGreaterThan(0); // sanity: multiple dependents ship it
      for (const { installedPath, version } of major7) {
        expect(isStableRelease(version)).toBe(true);
        expect(atLeast(version, '7.6.5')).toBe(true);
      }
    });
  });
});
