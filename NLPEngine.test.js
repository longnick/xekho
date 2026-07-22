const fs = require('fs');
const path = require('path');
const { NLPEngine } = require('./NLPEngine');

const source = fs.readFileSync(path.join(__dirname, 'NLPEngine.js'), 'utf8');

describe('NLPEngine — @nlpjs/nlp migration (R4 S6C-A)', () => {
  let engine;

  beforeAll(async () => {
    engine = new NLPEngine({
      trainingPath: path.join(__dirname, 'POS_NLU_Training.json'),
      masterDataPath: path.join(__dirname, 'GanhKho_MasterData.json'),
    });
    await engine.trainModel();
  }, 60000);

  // ── Source / version tests ────────────────────────────────────────────────

  test('source imports Nlp from @nlpjs/nlp — not node-nlp', () => {
    expect(source).toContain("const { Nlp } = require('@nlpjs/nlp')");
    expect(source).not.toContain("require('node-nlp')");
    expect(source).not.toContain('NlpManager');
  });

  test('source instantiates Nlp with { languages, autoSave: false }', () => {
    expect(source).toContain("new Nlp({ languages: ['vi'], autoSave: false })");
  });

  test('source calls nluManager.train({ log: false }) for quiet training', () => {
    expect(source).toContain('nluManager.train({ log: false })');
  });

  // ── Behaviour tests ───────────────────────────────────────────────────────

  test.each([
    ['bàn 5 gọi 2 tiger bạc', 'pos_order'],
    ['tính tiền bàn 5', 'pos_checkout'],
    ['tồn kho tiger bạc', 'query_inventory'],
    ['doanh thu hôm nay', 'query_sales'],
    ['hôm nay nhập bao nhiêu tiger bạc', 'query_import'],
  ])('classifies "%s" as intent %s', async (text, expectedIntent) => {
    const result = await engine.process(text);
    expect(result.intent).toBe(expectedIntent);
  });

  test('process returns expected shape', async () => {
    const result = await engine.process('doanh thu hôm nay');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('entities');
    expect(typeof result.score).toBe('number');
  });

  // ── Public contract tests ─────────────────────────────────────────────────

  test('NLPEngine exposes constructor / trainModel / process / normalizeVi', () => {
    const { normalizeVi } = require('./NLPEngine');
    expect(typeof NLPEngine).toBe('function');
    expect(typeof engine.trainModel).toBe('function');
    expect(typeof engine.process).toBe('function');
    expect(typeof normalizeVi).toBe('function');
  });

  test('normalizeVi strips diacritics and lowercases', () => {
    const { normalizeVi } = require('./NLPEngine');
    expect(normalizeVi('Hôm Nay')).toBe('hom nay');
    expect(normalizeVi('Bàn số 5')).toBe('ban so 5');
  });
});
