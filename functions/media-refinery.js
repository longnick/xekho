const crypto = require('crypto');

const MEDIA_COLLECTION = 'media_assets';
const REFINED_COLLECTION = 'refined_media_assets';
const TAG_COLLECTION = 'media_asset_tags';
const SCORE_COLLECTION = 'media_asset_scores';

const CONTENT_ALLOWED_STATUSES = new Set([
  'REFINED',
  'TAGGED',
  'PUBLISH_READY',
  'HERO_ASSET',
]);

const BRAND_RULES = {
  brandName: 'XE KHÔ CHỮA LÀNH',
  moods: ['warm', 'healing', 'night_chill', 'street_food', 'casual'],
  avoid: ['neon', 'fake_food', 'hard_sell', 'wrong_price', 'privacy_risk'],
  preferredFormats: ['4:5', '1:1', '9:16'],
};

function nowField(admin) {
  return admin.firestore.FieldValue.serverTimestamp();
}

function clampScore(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeVi(input = '') {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(input = '') {
  return normalizeVi(input).replace(/\s+/g, '_');
}

function parseDataUrl(dataUrl = '') {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function detectAssetType(mimeType = '', url = '') {
  const mime = String(mimeType || '').toLowerCase();
  const path = String(url || '').toLowerCase().split('?')[0];
  if (mime.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(path)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac)$/i.test(path)) return 'audio';
  return 'image';
}

function detectOrientation(width, height) {
  const w = Number(width || 0);
  const h = Number(height || 0);
  if (!w || !h) return 'unknown';
  if (Math.abs(w - h) / Math.max(w, h) < 0.08) return 'square';
  return h > w ? 'portrait' : 'landscape';
}

function inferSceneType(text = '') {
  const key = normalizeVi(text);
  if (/(combo|met|set)/.test(key)) return 'combo_table';
  if (/(nuong|bep|khoi|cham|gap|chien|xao)/.test(key)) return 'cooking_closeup';
  if (/(quan|ban be|khach|chill|khong gian)/.test(key)) return 'ambience';
  if (/(menu|bang gia|gia)/.test(key)) return 'menu';
  if (key) return 'food_hero';
  return 'unknown';
}

function weightedPublishScore(parts = {}) {
  const technical = clampScore(parts.technical_quality, 70);
  const food = clampScore(parts.food_appeal, 70);
  const brand = clampScore(parts.brand_fit, 70);
  const composition = clampScore(parts.composition_for_social, 70);
  const editability = clampScore(parts.editability, 70);
  const commercial = clampScore(parts.commercial_usefulness, 70);
  return Math.round(
    technical * 0.25 +
    food * 0.20 +
    brand * 0.20 +
    composition * 0.15 +
    editability * 0.10 +
    commercial * 0.10
  );
}

function statusFromScore(score) {
  const n = clampScore(score);
  if (n < 50) return 'REJECTED';
  if (n < 65) return 'ARCHIVED';
  if (n < 75) return 'NEEDS_MANUAL_REVIEW';
  if (n < 85) return 'REFINE_READY';
  return 'HERO_ASSET';
}

function buildHeuristicScore(asset = {}, overrides = {}) {
  const assetType = String(asset.asset_type || overrides.asset_type || 'image');
  const width = Number(asset.width || overrides.width || 0);
  const height = Number(asset.height || overrides.height || 0);
  const orientation = String(asset.orientation || detectOrientation(width, height));
  const sceneType = String(asset.scene_type || overrides.scene_type || 'unknown');
  const risks = Array.isArray(overrides.publish_risks) ? overrides.publish_risks : [];

  let technical = width >= 900 && height >= 900 ? 78 : (width || height ? 62 : 58);
  if (assetType === 'video') technical = 72;
  if (orientation === 'portrait' || orientation === 'square') technical += 4;
  if (risks.length) technical -= Math.min(25, risks.length * 8);

  const foodAppeal = /food|cooking|combo/.test(sceneType) ? 80 : (sceneType === 'unknown' ? 60 : 68);
  const brandFit = /food|cooking|combo|ambience/.test(sceneType) ? 78 : 62;
  const composition = orientation === 'portrait' ? 82 : (orientation === 'square' ? 78 : 70);
  const editability = width && height ? 78 : 65;
  const commercial = /food|combo/.test(sceneType) ? 80 : 66;

  const parts = {
    technical_quality: clampScore(overrides.technical_quality, technical),
    food_appeal: clampScore(overrides.food_appeal, foodAppeal),
    brand_fit: clampScore(overrides.brand_fit, brandFit),
    composition_for_social: clampScore(overrides.composition_for_social, composition),
    editability: clampScore(overrides.editability, editability),
    commercial_usefulness: clampScore(overrides.commercial_usefulness, commercial),
  };
  parts.publish_score = clampScore(overrides.publish_score, weightedPublishScore(parts));
  parts.decision = String(overrides.decision || statusFromScore(parts.publish_score));
  parts.best_formats = Array.isArray(overrides.best_formats)
    ? overrides.best_formats
    : (orientation === 'portrait' ? ['4:5', '9:16'] : ['1:1', '4:5']);
  parts.recommended_edits = Array.isArray(overrides.recommended_edits)
    ? overrides.recommended_edits
    : ['warm_color_balance', 'light_denoise', 'social_crop'];
  parts.rejection_reason = String(overrides.rejection_reason || (parts.decision === 'REJECTED' ? 'Score dưới ngưỡng publish.' : '')).trim();
  parts.qa_notes = String(overrides.qa_notes || 'Scored by media-refinery heuristic MVP.').trim();
  return parts;
}

function buildTags(asset = {}, classification = {}, score = {}) {
  const tags = [];
  const product = String(classification.detected_product_name || asset.detected_product_name || '').trim();
  const scene = String(classification.scene_type || asset.scene_type || '').trim();
  const orientation = String(classification.orientation || asset.orientation || '').trim();
  if (product) tags.push({ tag: `product:${slug(product)}`, tag_type: 'product', confidence: 0.86 });
  if (scene) tags.push({ tag: `scene:${scene}`, tag_type: 'scene', confidence: 0.8 });
  if (orientation && orientation !== 'unknown') tags.push({ tag: `format:${orientation}`, tag_type: 'format', confidence: 0.75 });
  (classification.mood_tags || BRAND_RULES.moods.slice(0, 2)).slice(0, 4).forEach(mood => {
    tags.push({ tag: `mood:${String(mood).trim()}`, tag_type: 'mood', confidence: 0.7 });
  });
  (classification.recommended_use_cases || ['facebook_post']).slice(0, 4).forEach(useCase => {
    tags.push({ tag: `use_case:${String(useCase).trim()}`, tag_type: 'use_case', confidence: 0.72 });
  });
  if (clampScore(score.publish_score) >= 85) tags.push({ tag: 'quality:hero', tag_type: 'quality', confidence: 0.9 });
  else if (clampScore(score.publish_score) >= 75) tags.push({ tag: 'quality:publish_ready', tag_type: 'quality', confidence: 0.82 });
  return tags;
}

async function loadMenuProducts(db) {
  const snap = await db.collection('Product_Catalog').limit(500).get().catch(() => null);
  if (!snap) return [];
  return snap.docs.map(doc => {
    const data = doc.data() || {};
    return {
      id: String(data.item_id || doc.id),
      name: String(data.display_name || data.name || data.item_id || doc.id).trim(),
      aliases: Array.isArray(data.aliases) ? data.aliases : String(data.aliases || '').split(',').map(x => x.trim()).filter(Boolean),
    };
  }).filter(x => x.name);
}

function matchProductFromText(products = [], text = '') {
  const key = normalizeVi(text);
  if (!key) return null;
  const candidates = products.map(product => ({
    product,
    keys: [product.name, ...(product.aliases || [])].map(normalizeVi).filter(Boolean),
  }));
  const exact = candidates.find(row => row.keys.some(k => k && (key.includes(k) || k.includes(key))));
  return exact ? exact.product : null;
}

async function classifyAsset({ db, asset, input = {} }) {
  const products = await loadMenuProducts(db);
  const hint = [
    input.productName,
    input.detected_product_name,
    input.fileName,
    asset.original_file_url,
    asset.qa_notes,
  ].filter(Boolean).join(' ');
  const product = matchProductFromText(products, hint);
  const sceneType = String(input.scene_type || asset.scene_type || inferSceneType(hint)).trim();
  return {
    asset_type: asset.asset_type,
    detected_product_id: product?.id || input.productId || asset.detected_product_id || null,
    detected_product_name: product?.name || input.productName || input.detected_product_name || asset.detected_product_name || '',
    scene_type: sceneType,
    orientation: input.orientation || asset.orientation || detectOrientation(asset.width, asset.height),
    contains_people: input.contains_people === true,
    contains_text: input.contains_text === true,
    visible_text: Array.isArray(input.visible_text) ? input.visible_text : [],
    mood_tags: Array.isArray(input.mood_tags) ? input.mood_tags : ['warm', 'healing'],
    recommended_use_cases: Array.isArray(input.recommended_use_cases) ? input.recommended_use_cases : ['facebook_post', 'ad_creative'],
    publish_risks: Array.isArray(input.publish_risks) ? input.publish_risks : [],
    confidence: product ? 0.82 : 0.58,
    notes: product ? `Matched product ${product.name} from metadata/hints.` : 'No product match from metadata/hints.',
  };
}

async function saveTags({ db, admin, assetId, tags = [] }) {
  const batch = db.batch();
  tags.forEach(item => {
    const ref = db.collection(TAG_COLLECTION).doc();
    batch.set(ref, {
      id: ref.id,
      asset_id: assetId,
      tag: String(item.tag || '').trim(),
      tag_type: String(item.tag_type || '').trim(),
      confidence: Number(item.confidence || 0),
      created_at: nowField(admin),
    });
  });
  if (tags.length) await batch.commit();
}

async function createAssetFromInput({ db, admin, sharp, saveStorageBuffer, input = {}, actor = {} }) {
  const dataUrlParsed = parseDataUrl(input.dataUrl || '');
  const fileUrl = String(input.file_url || input.fileUrl || '').trim();
  if (!dataUrlParsed && !fileUrl) throw new Error('Missing file_url or dataUrl');

  const mimeType = String(input.mime_type || input.mimeType || dataUrlParsed?.mimeType || '').trim();
  const assetType = detectAssetType(mimeType, fileUrl || input.fileName);
  const id = String(input.asset_id || input.id || crypto.randomUUID());
  let originalFileUrl = fileUrl;
  let fileSizeBytes = Number(input.file_size_bytes || 0) || 0;
  let width = Number(input.width || 0) || null;
  let height = Number(input.height || 0) || null;
  let thumbnailUrl = String(input.thumbnail_url || input.thumbnailUrl || '').trim();
  let originalObjectPath = '';

  if (dataUrlParsed) {
    fileSizeBytes = dataUrlParsed.buffer.length;
    const safeName = String(input.fileName || `${id}.jpg`).replace(/[^A-Za-z0-9._-]/g, '_') || `${id}.jpg`;
    const ext = safeName.includes('.') ? safeName.split('.').pop() : (mimeType.split('/')[1] || 'jpg');
    const saved = await saveStorageBuffer({
      objectPath: `media-refinery/raw/${id}/original.${ext}`,
      contentType: mimeType || 'application/octet-stream',
      buffer: dataUrlParsed.buffer,
      metadata: {
        assetId: id,
        uploadedBy: actor.email || actor.uid || 'unknown',
        source: String(input.source || 'upload'),
      },
    });
    originalFileUrl = saved.imageUrl;
    originalObjectPath = saved.objectPath;

    if (assetType === 'image') {
      const metadata = await sharp(dataUrlParsed.buffer).metadata();
      width = Number(metadata.width || width || 0) || null;
      height = Number(metadata.height || height || 0) || null;
      const thumb = await sharp(dataUrlParsed.buffer)
        .rotate()
        .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();
      const savedThumb = await saveStorageBuffer({
        objectPath: `media-refinery/thumbs/${id}/thumb.jpg`,
        contentType: 'image/jpeg',
        buffer: thumb,
        metadata: { assetId: id, kind: 'thumbnail' },
      });
      thumbnailUrl = savedThumb.imageUrl;
    }
  }

  const asset = {
    id,
    original_file_url: originalFileUrl,
    original_object_path: originalObjectPath,
    refined_file_url: '',
    thumbnail_url: thumbnailUrl,
    asset_type: assetType,
    mime_type: mimeType,
    width,
    height,
    duration_seconds: Number(input.duration_seconds || input.durationSeconds || 0) || null,
    file_size_bytes: fileSizeBytes || null,
    source: String(input.source || 'upload').trim(),
    status: 'INGESTED',
    detected_product_id: String(input.productId || input.detected_product_id || '').trim() || null,
    detected_product_name: String(input.productName || input.detected_product_name || '').trim(),
    scene_type: String(input.scene_type || '').trim() || 'unknown',
    orientation: String(input.orientation || detectOrientation(width, height)),
    technical_score: 0,
    brand_score: 0,
    publish_score: 0,
    rejection_reason: '',
    qa_notes: String(input.qa_notes || '').trim(),
    classification: {},
    created_by: actor,
    created_at: nowField(admin),
    updated_at: nowField(admin),
  };

  await db.collection(MEDIA_COLLECTION).doc(id).set(asset, { merge: true });
  return asset;
}

async function scoreAndTagAsset({ db, admin, assetId, input = {} }) {
  const ref = db.collection(MEDIA_COLLECTION).doc(String(assetId));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Media asset not found');
  const current = { id: snap.id, ...(snap.data() || {}) };
  const classification = await classifyAsset({ db, asset: current, input });
  const scored = buildHeuristicScore({ ...current, ...classification }, input.score || input);
  const scoreDecision = scored.decision === 'ARCHIVE' ? 'ARCHIVED' : scored.decision;
  const nextStatus = scoreDecision === 'HERO_ASSET' ? 'REFINE_READY' : scoreDecision;

  const scoreRef = db.collection(SCORE_COLLECTION).doc();
  await scoreRef.set({
    id: scoreRef.id,
    asset_id: current.id,
    sharpness_score: scored.technical_quality,
    lighting_score: scored.technical_quality,
    composition_score: scored.composition_for_social,
    color_score: scored.brand_fit,
    noise_score: scored.technical_quality,
    subject_clarity_score: scored.food_appeal,
    audio_cleanliness_score: current.asset_type === 'video' ? scored.technical_quality : null,
    motion_stability_score: current.asset_type === 'video' ? scored.technical_quality : null,
    brand_fit_score: scored.brand_fit,
    food_appeal_score: scored.food_appeal,
    total_score: scored.publish_score,
    model_used: 'media-refinery-heuristic-v1',
    raw_ai_response: { classification, scored },
    created_at: nowField(admin),
  });

  await ref.set({
    ...classification,
    status: nextStatus,
    technical_score: scored.technical_quality,
    brand_score: scored.brand_fit,
    publish_score: scored.publish_score,
    rejection_reason: scored.rejection_reason || '',
    qa_notes: scored.qa_notes || '',
    classification,
    score_breakdown: scored,
    hero_candidate: scoreDecision === 'HERO_ASSET',
    updated_at: nowField(admin),
  }, { merge: true });

  const tags = buildTags({ ...current, ...classification }, classification, scored);
  await saveTags({ db, admin, assetId: current.id, tags });

  return {
    asset_id: current.id,
    classification,
    score: scored,
    status: nextStatus,
    hero_candidate: scoreDecision === 'HERO_ASSET',
    tags,
  };
}

function cropTargetsFor(asset = {}) {
  if (asset.asset_type !== 'image') return [];
  return [
    { format: '1:1', width: 1200, height: 1200, use_case: 'facebook_post' },
    { format: '4:5', width: 1200, height: 1500, use_case: 'facebook_post' },
    { format: '9:16', width: 1080, height: 1920, use_case: 'story' },
  ];
}

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot fetch media: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function refineAsset({ db, admin, sharp, saveStorageBuffer, assetId, input = {}, actor = {} }) {
  const ref = db.collection(MEDIA_COLLECTION).doc(String(assetId));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Media asset not found');
  const asset = { id: snap.id, ...(snap.data() || {}) };

  if (!['REFINE_READY', 'HERO_ASSET', 'NEEDS_MANUAL_REVIEW', 'SCORED', 'TAGGED'].includes(String(asset.status || ''))) {
    throw new Error(`Asset status ${asset.status || 'unknown'} is not refine-ready`);
  }
  if (asset.asset_type !== 'image') {
    await ref.set({
      status: 'NEEDS_MANUAL_REVIEW',
      qa_notes: 'Video/audio refinement is queued for manual workflow in MVP.',
      updated_at: nowField(admin),
    }, { merge: true });
    return { asset_id: asset.id, status: 'NEEDS_MANUAL_REVIEW', refined: [] };
  }

  const rawBuffer = input.dataUrl ? parseDataUrl(input.dataUrl)?.buffer : await fetchBuffer(asset.original_file_url);
  if (!rawBuffer) throw new Error('Cannot load image buffer for refinement');

  const targets = cropTargetsFor(asset);
  const refined = [];
  for (const target of targets) {
    const out = await sharp(rawBuffer)
      .rotate()
      .resize({ width: target.width, height: target.height, fit: 'cover', position: 'attention' })
      .modulate({ brightness: 1.04, saturation: 1.06 })
      .sharpen({ sigma: 0.7 })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    const saved = await saveStorageBuffer({
      objectPath: `media-refinery/refined/${asset.id}/${target.format.replace(':', 'x')}.jpg`,
      contentType: 'image/jpeg',
      buffer: out,
      metadata: {
        sourceAssetId: asset.id,
        format: target.format,
        uploadedBy: actor.email || actor.uid || 'media-refinery',
      },
      cacheControl: 'public,max-age=31536000',
    });
    const refinedRef = db.collection(REFINED_COLLECTION).doc();
    const refinedDoc = {
      id: refinedRef.id,
      source_asset_id: asset.id,
      file_url: saved.imageUrl,
      object_path: saved.objectPath,
      thumbnail_url: asset.thumbnail_url || saved.imageUrl,
      format: target.format,
      use_case: target.use_case,
      edit_type: 'crop_color_sharpen',
      text_safe_area: { top: 0.10, right: 0.08, bottom: 0.12, left: 0.08 },
      dominant_colors: ['warm', 'wood', 'charcoal'],
      recommended_caption_angles: ['healing_after_work', 'night_chill', 'best_seller'],
      publish_score: clampScore(asset.publish_score, 78),
      qa_status: clampScore(asset.publish_score, 78) >= 75 ? 'APPROVED' : 'PENDING',
      qa_notes: 'Auto-refined by media-refinery MVP.',
      created_by: actor,
      created_at: nowField(admin),
    };
    await refinedRef.set(refinedDoc);
    refined.push(refinedDoc);
  }

  const best = refined.find(item => item.format === '4:5') || refined[0];
  const nextStatus = clampScore(asset.publish_score) >= 85 ? 'HERO_ASSET' : 'PUBLISH_READY';
  await ref.set({
    status: nextStatus,
    refined_file_url: best?.file_url || '',
    updated_at: nowField(admin),
  }, { merge: true });

  return { asset_id: asset.id, status: nextStatus, refined };
}

async function updateQa({ db, admin, assetId, input = {}, actor = {} }) {
  const status = String(input.status || input.qa_status || '').trim().toUpperCase();
  const allowed = new Set(['PUBLISH_READY', 'HERO_ASSET', 'REJECTED', 'NEEDS_MANUAL_REVIEW', 'TAGGED']);
  if (!allowed.has(status)) throw new Error('Invalid QA status');
  const ref = db.collection(MEDIA_COLLECTION).doc(String(assetId));
  await ref.set({
    status,
    qa_notes: String(input.qa_notes || input.notes || '').trim(),
    qa_by: actor,
    qa_at: nowField(admin),
    updated_at: nowField(admin),
  }, { merge: true });
  return { asset_id: String(assetId), status };
}

async function listAssets({ db, query = {} }) {
  let ref = db.collection(MEDIA_COLLECTION);
  const status = String(query.status || '').trim();
  const productId = String(query.product_id || query.productId || '').trim();
  if (status) ref = ref.where('status', '==', status);
  if (productId) ref = ref.where('detected_product_id', '==', productId);
  const limit = Math.max(1, Math.min(100, Number(query.limit || 50) || 50));
  const snap = await ref.limit(limit).get();
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
}

async function getAsset({ db, assetId }) {
  const [assetSnap, refinedSnap, tagSnap, scoreSnap] = await Promise.all([
    db.collection(MEDIA_COLLECTION).doc(String(assetId)).get(),
    db.collection(REFINED_COLLECTION).where('source_asset_id', '==', String(assetId)).limit(20).get(),
    db.collection(TAG_COLLECTION).where('asset_id', '==', String(assetId)).limit(100).get(),
    db.collection(SCORE_COLLECTION).where('asset_id', '==', String(assetId)).limit(20).get(),
  ]);
  if (!assetSnap.exists) return null;
  return {
    id: assetSnap.id,
    ...(assetSnap.data() || {}),
    refined_assets: refinedSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) })),
    tags: tagSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) })),
    scores: scoreSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) })),
  };
}

async function findPublishReady({ db, query = {} }) {
  const productId = String(query.product_id || query.productId || '').trim();
  const productName = String(query.product_name || query.productName || '').trim();
  const format = String(query.format || '').trim();
  const limit = Math.max(1, Math.min(20, Number(query.limit || 5) || 5));

  let assetQuery = db.collection(MEDIA_COLLECTION).where('status', 'in', Array.from(CONTENT_ALLOWED_STATUSES));
  const snap = await assetQuery.limit(60).get();
  const productKey = normalizeVi(productName);
  let assets = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter(asset => !productId || String(asset.detected_product_id || '') === productId)
    .filter(asset => !productKey || normalizeVi(asset.detected_product_name).includes(productKey) || productKey.includes(normalizeVi(asset.detected_product_name)))
    .sort((a, b) => Number(b.publish_score || 0) - Number(a.publish_score || 0));

  const results = [];
  for (const asset of assets.slice(0, 20)) {
    let refinedQuery = db.collection(REFINED_COLLECTION).where('source_asset_id', '==', asset.id);
    if (format) refinedQuery = refinedQuery.where('format', '==', format);
    const refinedSnap = await refinedQuery.limit(5).get();
    refinedSnap.docs.forEach(doc => {
      const refined = { id: doc.id, ...(doc.data() || {}) };
      results.push({
        asset_id: asset.id,
        refined_asset_id: refined.id,
        file_url: refined.file_url || asset.refined_file_url || asset.thumbnail_url || asset.original_file_url,
        score: Number(refined.publish_score || asset.publish_score || 0),
        status: asset.status,
        product_name: asset.detected_product_name || '',
        format: refined.format || '',
        tags: [],
        reason: 'Asset đã qua media-refinery gate và đạt trạng thái publish-ready.',
      });
    });
    if (!refinedSnap.size && asset.refined_file_url) {
      results.push({
        asset_id: asset.id,
        refined_asset_id: '',
        file_url: asset.refined_file_url,
        score: Number(asset.publish_score || 0),
        status: asset.status,
        product_name: asset.detected_product_name || '',
        format: asset.orientation || '',
        tags: [],
        reason: 'Asset có trạng thái publish-ready nhưng chưa có biến thể refined riêng.',
      });
    }
    if (results.length >= limit) break;
  }

  return {
    can_generate_post: results.length > 0,
    reason: results.length ? '' : 'Không có media publish-ready cho món này.',
    recommended_action: results.length ? '' : 'Cần refine asset hiện có hoặc chụp/quay bổ sung.',
    results: results.slice(0, limit),
  };
}

async function searchAssets({ db, query = {} }) {
  const q = normalizeVi(query.q || query.query || '');
  const readyOnly = query.readyOnly !== false;
  const base = readyOnly
    ? await findPublishReady({ db, query: { productName: query.productName || query.product_name || q, limit: query.limit || 10, format: query.format } })
    : { results: (await listAssets({ db, query: { limit: query.limit || 50 } })).map(asset => ({ asset_id: asset.id, score: asset.publish_score, product_name: asset.detected_product_name, status: asset.status, file_url: asset.refined_file_url || asset.thumbnail_url || asset.original_file_url })) };
  const results = (base.results || []).filter(item => {
    if (!q) return true;
    return normalizeVi([item.product_name, item.status, item.format, item.reason].join(' ')).includes(q)
      || q.split(' ').some(part => normalizeVi(item.product_name).includes(part));
  });
  return { query: query.q || query.query || '', results };
}

async function createBrief({ db, query = {} }) {
  const ready = await findPublishReady({ db, query });
  if (!ready.can_generate_post) {
    return {
      can_generate_post: false,
      reason: ready.reason,
      recommended_action: ready.recommended_action,
    };
  }
  const selected = ready.results[0];
  return {
    can_generate_post: true,
    selected_refined_asset: selected,
    creative_direction: 'Giữ món thật làm hero, tone ấm, gần gũi, không nhồi chữ.',
    target_format: query.format || selected.format || '4:5',
    content_angle: query.content_angle || 'healing_after_work',
    brand_rules: BRAND_RULES,
    required_qa_gate: true,
  };
}

module.exports = {
  MEDIA_COLLECTION,
  REFINED_COLLECTION,
  TAG_COLLECTION,
  SCORE_COLLECTION,
  CONTENT_ALLOWED_STATUSES,
  BRAND_RULES,
  createAssetFromInput,
  scoreAndTagAsset,
  refineAsset,
  updateQa,
  listAssets,
  getAsset,
  findPublishReady,
  searchAssets,
  createBrief,
  classifyAsset,
  buildHeuristicScore,
  weightedPublishScore,
  statusFromScore,
};
