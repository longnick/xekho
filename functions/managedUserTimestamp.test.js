const fs = require('fs');
const path = require('path');

describe('managed-user callable timestamp compatibility', () => {
  const indexSource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

  test('uses the modular Firestore FieldValue import for provisioning timestamps', () => {
    expect(indexSource).toContain("const { FieldValue } = require('firebase-admin/firestore');");
    expect(indexSource).toMatch(/now:\s*\(\)\s*=>\s*FieldValue\.serverTimestamp\(\)/);
  });
});
