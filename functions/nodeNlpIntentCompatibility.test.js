const fs = require('fs');
const path = require('path');
const { NlpManager } = require('./node_modules/node-nlp');
const training = require('./POS_NLU_Training.json');
const indexSource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

const fixtureValues = {
  '%time%': 'hôm nay',
  '%qty%': '2',
  '%table%': '5',
  '%item%': 'tiger bạc',
};

function phraseForFixture(phrase) {
  return Object.entries(fixtureValues).reduce((text, [token, value]) => text.split(token).join(value), String(phrase));
}

async function buildManager() {
  const manager = new NlpManager({ languages: ['vi'], autoSave: false, forceNER: false });
  manager.settings.autoSave = false;
  for (const [intent, metadata] of Object.entries(training.intents || {})) {
    for (const phrase of metadata.phrases || []) {
      manager.addDocument('vi', phraseForFixture(phrase), intent);
    }
  }
  await manager.train();
  return manager;
}

describe('Vietnamese POS intent compatibility', () => {
  let manager;

  test('uses the NlpManager settings API available in the Functions lockfile', () => {
    expect(indexSource).toContain('manager.settings.autoSave = false;');
    expect(indexSource).not.toContain('manager.nlp.settings.autoSave');
  });

  beforeAll(async () => {
    manager = await buildManager();
  }, 60000);

  test.each([
    ['bàn 5 gọi 2 tiger bạc', 'pos_order'],
    ['tính tiền bàn 5', 'pos_checkout'],
    ['tồn kho tiger bạc', 'query_inventory'],
    ['doanh thu hôm nay', 'query_sales'],
    ['hôm nay nhập bao nhiêu tiger bạc', 'query_import'],
  ])('classifies %s as %s', async (utterance, intent) => {
    const result = await manager.process('vi', utterance);
    expect(result.intent).toBe(intent);
  });
});
