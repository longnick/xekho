const fs = require('fs');
const path = require('path');
const { NlpManager } = require('node-nlp');
const iconv = require('iconv-lite');

function normalizeVi(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function repairVietnameseMojibake(input) {
  let str = String(input ?? '');
  if (!str) return str;
  const suspect = /[ÃÂÄÆâð�├┤╗▒]/.test(str) || /\uFFFD/.test(str);
  if (!suspect) return str;
  try {
    const b = Buffer.from(str, 'latin1');
    const fixed = b.toString('utf8');
    if (fixed && !/\uFFFD/.test(fixed)) str = fixed;
  } catch (_) {}
  try {
    const bytes = Uint8Array.from(str, ch => (ch.charCodeAt(0) & 0xFF));
    const fixed2 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (fixed2 && !/\uFFFD/.test(fixed2)) str = fixed2;
  } catch (_) {}
  try {
    const b3 = Buffer.from(str, 'binary');
    const fixed3 = iconv.decode(b3, 'utf8');
    if (fixed3 && !/\uFFFD/.test(fixed3)) str = fixed3;
  } catch (_) {}
  return str;
}

function parseViNumber(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);

  const w = normalizeVi(raw);
  const map = {
    mot: 1, mot1: 1, mot2: 1,
    hai: 2,
    ba: 3,
    bon: 4, tu: 4,
    nam: 5, lam: 5,
    sau: 6,
    bay: 7, bayy: 7,
    tam: 8,
    chin: 9,
    muoi: 10,
  };
  if (map[w] != null) return map[w];
  return null;
}

function parseTimeEntity(text) {
  const t = normalizeVi(text);
  if (!t) return null;
  if (/(hom nay)\b/.test(t)) return { key: 'today', label: 'hôm nay' };
  if (/(hom qua)\b/.test(t)) return { key: 'yesterday', label: 'hôm qua' };
  if (/(tuan nay)\b/.test(t)) return { key: 'this_week', label: 'tuần này' };
  if (/(thang nay)\b/.test(t)) return { key: 'this_month', label: 'tháng này' };
  if (/(nam nay)\b/.test(t)) return { key: 'this_year', label: 'năm nay' };
  return null;
}

function buildDateRange(timeKey) {
  const now = new Date();
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  if (timeKey === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (timeKey === 'yesterday') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { from: startOfDay(d), to: endOfDay(d) };
  }
  if (timeKey === 'this_week') {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return { from: startOfDay(d), to: endOfDay(now) };
  }
  if (timeKey === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  if (timeKey === 'this_year') {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  return { from: startOfDay(now), to: endOfDay(now) };
}

function extractTable(text) {
  const raw = String(text || '');
  const t = normalizeVi(raw);
  const m = t.match(/\bban\s*(?:so\s*)?(\d+)\b/);
  if (!m) return null;
  return String(parseInt(m[1], 10));
}

function extractQtyNear(textNorm, itemNorm) {
  const patternBefore = new RegExp(`\\b(\\d+)\\s+${itemNorm}\\b`, 'i');
  const m1 = textNorm.match(patternBefore);
  if (m1) return Number(m1[1]);

  const patternAfter = new RegExp(`\\b${itemNorm}\\s+(\\d+)\\b`, 'i');
  const m2 = textNorm.match(patternAfter);
  if (m2) return Number(m2[1]);

  const wordBefore = new RegExp(`\\b([a-z]+)\\s+${itemNorm}\\b`, 'i');
  const m3 = textNorm.match(wordBefore);
  if (m3) {
    const n = parseViNumber(m3[1]);
    if (typeof n === 'number') return n;
  }

  return 1;
}

function detectItems(text, catalogNames) {
  const normText = normalizeVi(text);
  if (!normText) return [];

  const sorted = [...catalogNames].sort((a, b) => b.norm.length - a.norm.length);
  const used = new Set();
  const hits = [];

  for (const item of sorted) {
    if (!item.norm) continue;
    if (used.has(item.norm)) continue;
    const re = new RegExp(`\\b${item.norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (!re.test(normText)) continue;

    const qty = extractQtyNear(normText, item.norm);
    hits.push({ name: item.name, qty: Math.max(1, Number(qty) || 1) });
    used.add(item.norm);
  }

  return hits;
}

function expandTrainingPhrase(phrase, items) {
  const p = String(phrase || '');
  if (!p) return [];

  const timeSamples = ['hôm nay', 'hôm qua', 'tuần này', 'tháng này'];
  const qtySamples = ['1', '2', '3', '5'];
  const tableSamples = ['1', '2', '3', '5', '10'];
  const itemSamples = items.length ? items.slice(0, 20).map(x => x.name) : ['tiger bạc', 'ken lớn'];

  const slots = [
    { key: '%time%', values: timeSamples },
    { key: '%qty%', values: qtySamples },
    { key: '%table%', values: tableSamples },
    { key: '%item%', values: itemSamples },
  ];

  let results = [p];
  slots.forEach(slot => {
    if (!results.some(r => r.includes(slot.key))) return;
    const next = [];
    results.forEach(r => {
      if (!r.includes(slot.key)) { next.push(r); return; }
      slot.values.forEach(v => next.push(r.split(slot.key).join(v)));
    });
    results = next.slice(0, 120);
  });

  return results;
}

class NLPEngine {
  constructor(options = {}) {
    this.trainingPath = options.trainingPath || path.join(__dirname, 'POS_NLU_Training.json');
    this.masterDataPath = options.masterDataPath || path.join(__dirname, 'GanhKho_MasterData.json');
    this.language = 'vi';
    this.manager = null;
    this.catalogNames = [];
    this.trained = false;
  }

  _loadCatalog() {
    let master = null;
    try {
      master = JSON.parse(fs.readFileSync(this.masterDataPath, 'utf8'));
    } catch (_) {
      master = null;
    }

    const products = Array.isArray(master?.Product_Catalog) ? master.Product_Catalog : [];
    this.catalogNames = products
      .map(p => repairVietnameseMojibake(String(p.display_name || '').trim()))
      .filter(Boolean)
      .map(name => ({ name, norm: normalizeVi(name) }))
      .filter(x => x.norm.length >= 2);
  }

  async trainModel() {
    this._loadCatalog();

    const training = JSON.parse(fs.readFileSync(this.trainingPath, 'utf8'));
    const intents = training?.intents || {};

    let manager = null;
    try {
      manager = new NlpManager({ languages: ['vi'], forceNER: false, autoSave: false });
      manager.nlp.settings.autoSave = false;
    } catch (_) {
      manager = new NlpManager({ languages: ['en'], forceNER: false, autoSave: false });
      this.language = 'en';
    }

    Object.entries(intents).forEach(([intent, meta]) => {
      const phrases = Array.isArray(meta?.phrases) ? meta.phrases : [];
      phrases.forEach(p => {
        const expanded = expandTrainingPhrase(p, this.catalogNames);
        (expanded.length ? expanded : [String(p || '')]).forEach(sample => {
          manager.addDocument(this.language, String(sample || ''), intent);
        });
      });
    });

    await manager.train();
    this.manager = manager;
    this.trained = true;
  }

  extractEntities(text) {
    const raw = String(text || '');
    const time = parseTimeEntity(raw);
    const table = extractTable(raw);
    const items = detectItems(raw, this.catalogNames);

    const qtyMatches = normalizeVi(raw).match(/\b(\d+)\b/g) || [];
    const qtyCandidates = qtyMatches.map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0);
    const qty = qtyCandidates.length ? qtyCandidates[0] : null;

    return {
      time,
      timeRange: buildDateRange(time?.key || 'today'),
      table,
      qty,
      items,
    };
  }

  async process(text) {
    const rawText = String(text || '').trim();
    const entities = this.extractEntities(rawText);

    if (!this.trained || !this.manager) {
      await this.trainModel();
    }

    const result = await this.manager.process(this.language, rawText);
    const intent = result?.intent || 'None';
    const score = typeof result?.score === 'number' ? result.score : 0;

    return {
      text: rawText,
      intent,
      score,
      entities,
    };
  }
}

module.exports = { NLPEngine, normalizeVi };
