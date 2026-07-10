const axios = require('axios');
const indexSource = require('fs').readFileSync(require('path').join(__dirname, 'index.js'), 'utf8');
const telegramSendSource = require('fs').readFileSync(require('path').join(__dirname, 'telegram', 'send.js'), 'utf8');

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
});
