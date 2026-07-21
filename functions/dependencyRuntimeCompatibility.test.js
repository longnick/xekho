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
});
