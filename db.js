// ============================================================
// DB.JS  –  Online Data Layer · Firebase Web SDK v9 (Modular)
// Gánh Khô Chữa Lành POS
//
// KIẾN TRÚC:
//   • Firestore   → tất cả nghiệp vụ (bàn, đơn, menu, kho,
//                   cài đặt, lịch sử, chi phí, nhập hàng, NCC)
//   • RTDB        → ĐỘC QUYỀN presence (online/offline nhân viên)
//   • onSnapshot  → đẩy liên tục vào window.appState
//   • runTransaction → mọi thay đổi đơn hàng (thêm/sửa/đóng)
//   • RBAC        → role đọc từ Firestore /users/{uid}
//
// SẮC LỆNH CẤM:
//   ✗ Không đụng app.js / index.html / style.css
//   ✗ Không viết Firebase lẫn vào các file khác
//   ✗ Không làm vỡ UTF-8 tiếng Việt
// ============================================================

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
}
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, collection,
  getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot,
  runTransaction,
  query, orderBy, limit, where,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
}
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import {
  getDatabase,
  ref         as rtRef,
  set         as rtSet,
  onValue     as rtOnValue,
  onDisconnect,
  serverTimestamp as rtServerTimestamp,
}
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';


// ============================================================
// §0  CẤU HÌNH – THAY BẰNG CONFIG THỰC CỦA PROJECT
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDOxVZDZ1JkpermI-J2L7AEioP0CWERqOY',
  authDomain:        'pos-v2-909ff.firebaseapp.com',
  databaseURL:       'https://pos-v2-909ff-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId:         'pos-v2-909ff',
  storageBucket:     'pos-v2-909ff.firebasestorage.app',
  messagingSenderId: '774115283908',
  appId:             '1:774115283908:web:55ed845aad8ade281d8a91',
};

// Email của chủ quán → luôn được cấp quyền admin
const OWNER_EMAIL = 'owner@ganhkho.vn';

// Settings mặc định – khớp hoàn toàn với store.js getSettings()
const SETTINGS_DEFAULTS = {
  tableCount:                      20,
  currency:                        'đ',
  taxRate:                         0,
  storeName:                       'Gánh Khô Chữa Lành',
  storeAddress:                    '',
  storePhone:                      '0937707900',
  storeSlogan:                     'Ăn là nhớ, nhớ là ghiền!',
  bankName:                        'Vietinbank',
  bankAccount:                     '0937707900',
  bankOwner:                       'Gánh Khô Chữa Lành',
  autoBackup:                      true,
  storageQuotaMb:                  500,
  ocrMode:                         'auto',
  photoRetentionDays:              0,
  autoExportWeekly:                false,
  autoExportMonthly:               false,
  autoPushWeeklyReportToGoogleDrive: false,
  reportExportType:                'revenue',
  reportExportPeriod:              'today',
  reportExportDate:                '',
  autoUploadToGoogleDrive:         false,
  googleDriveUploadUrl:            '',
  googleDriveFolderId:             '',
};


// ============================================================
// §1  KHỞI TẠO SDK
// ============================================================
const _firebaseApp = initializeApp(FIREBASE_CONFIG);
const _auth        = getAuth(_firebaseApp);
// Bật cache đa tab để Safari/iPhone không báo failed-precondition khi mở nhiều tab.
const _db          = initializeFirestore(_firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
const _rtdb        = getDatabase(_firebaseApp);


// ============================================================
// §2  GLOBAL STATE  –  onSnapshot liên tục cập nhật vào đây
//     Khớp hoàn toàn với những gì app.js đang đọc từ Store
// ============================================================
window.appState = {
  ready:      false,   // true sau khi tất cả snapshot đầu tiên xong
  uid:        null,
  userDoc:    null,    // { uid, email, role, displayName, username }

  // --- Dữ liệu nghiệp vụ (thay thế Store.get...()) ---
  tables:     null,
  orders:     null,
  menu:       null,
  inventory:  null,
  settings:   null,
  users:      null,
  history:    null,
  expenses:   null,
  purchases:  null,
  suppliers:  null,
  masterData: {
    products: null,
    inventoryItems: null,
    recipes: null,
  },

  // --- Presence (RTDB) ---
  presence:   {},      // { [uid]: { displayName, online, lastSeen } }
};

function _hasBrokenVietnamese(text) {
  const s = String(text || '');
  if (!s) return false;
  const badTokens = ['\uFFFD', 'Ã', 'Â', 'Ä‘', 'Æ°', 'â€™', 'â€œ', 'â€', 'ðŸ'];
  return badTokens.some(t => s.includes(t));
}

function _slugRepairKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function _consonantSkeleton(text) {
  return _slugRepairKey(text)
    .replace(/[aeiouy]/g, '')
    .replace(/\s+/g, '');
}

function _levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[m][n];
}

function _bestCanonicalMatch(raw, candidates = []) {
  const repairedRaw = _repairVietnameseString(raw);
  const key = _slugRepairKey(repairedRaw || raw);
  if (!key) return null;

  // 1) Ưu tiên match theo "xương phụ âm" (rất hiệu quả cho chuỗi mất nguyên âm kiểu "kh c m i")
  const sk = _consonantSkeleton(repairedRaw || raw);
  if (sk) {
    const sameSkeleton = candidates.filter(name => _consonantSkeleton(name) === sk);
    if (sameSkeleton.length === 1) return sameSkeleton[0];
    if (sameSkeleton.length > 1) {
      let best = null;
      let bestScore = Number.POSITIVE_INFINITY;
      sameSkeleton.forEach(name => {
        const score = _levenshtein(key, _slugRepairKey(name)) / Math.max(_slugRepairKey(name).length, 1);
        if (score < bestScore) {
          bestScore = score;
          best = name;
        }
      });
      if (best) return best;
    }
  }

  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach(name => {
    const ck = _slugRepairKey(name);
    const dist = _levenshtein(key, ck);
    const score = dist / Math.max(ck.length, 1);
    if (score < bestScore) {
      bestScore = score;
      best = name;
    }
  });
  return bestScore <= 0.58 ? best : null;
}

function _repairAppStateData(kind, rows, options = {}) {
  const forceCanonicalIds = options.forceCanonicalIds !== false;
  if (!Array.isArray(rows)) return rows;
  const canonicalMenu = Array.isArray(window.DEFAULT_MENU) ? window.DEFAULT_MENU : [];
  const canonicalInv = Array.isArray(window.DEFAULT_INVENTORY) ? window.DEFAULT_INVENTORY : [];
  const categories = Array.isArray(window.DEFAULT_CATEGORIES) ? window.DEFAULT_CATEGORIES : [];

  const menuById = Object.fromEntries(canonicalMenu.map(x => [x.id, x]));
  const invById = Object.fromEntries(canonicalInv.map(x => [x.id, x]));
  const invCandidates = canonicalInv.map(x => x.name);
  const menuCandidates = canonicalMenu.map(x => x.name);
  const categoryCandidates = categories;
  const invNameByKey = Object.fromEntries(canonicalInv.map(x => [_slugRepairKey(x.name), x.name]));

  if (kind === 'inventory') {
    return rows.map(item => {
      const next = { ...item };
      const byId = invById[next.id];
      if (forceCanonicalIds && byId?.name) {
        next.name = byId.name;
        return next;
      }
      if (_hasBrokenVietnamese(next.name)) {
        next.name = byId?.name || invNameByKey[_slugRepairKey(next.name)] || _bestCanonicalMatch(next.name, invCandidates) || next.name;
      }
      return next;
    });
  }

  if (kind === 'menu') {
    return rows.map(item => {
      const next = { ...item };
      const byId = menuById[next.id];
      if (forceCanonicalIds && byId) {
        next.name = byId.name || next.name;
        next.category = byId.category || next.category;
      }
      if (_hasBrokenVietnamese(next.name)) {
        next.name = byId?.name || _bestCanonicalMatch(next.name, menuCandidates) || next.name;
      }
      if (_hasBrokenVietnamese(next.category)) {
        next.category = byId?.category || _bestCanonicalMatch(next.category, categoryCandidates) || next.category;
      }
      if (Array.isArray(next.ingredients)) {
        next.ingredients = next.ingredients.map(ing => {
          const n = { ...ing };
          if (forceCanonicalIds && byId?.ingredients?.length) {
            const hit = byId.ingredients.find(x => _slugRepairKey(x.name) === _slugRepairKey(n.name));
            if (hit?.name) n.name = hit.name;
          }
          if (_hasBrokenVietnamese(n.name)) {
            n.name = invNameByKey[_slugRepairKey(n.name)] || _bestCanonicalMatch(n.name, invCandidates) || n.name;
          }
          return n;
        });
      }
      return next;
    });
  }

  return rows;
}

function _repairSettingsText(settings = {}) {
  const next = { ...settings };
  if (_hasBrokenVietnamese(next.storeName)) next.storeName = 'Gánh Khô Chữa Lành';
  if (_hasBrokenVietnamese(next.bankOwner)) next.bankOwner = 'Gánh Khô Chữa Lành';
  if (_hasBrokenVietnamese(next.storeSlogan)) next.storeSlogan = 'Ăn là nhớ, nhớ là ghiền!';
  return next;
}

function _repairVietnameseString(input) {
  let s = String(input ?? '');
  if (!_hasBrokenVietnamese(s)) return s;

  try { s = decodeURIComponent(escape(s)); } catch (_) {}
  try {
    const bytes = Uint8Array.from(s, ch => ch.charCodeAt(0) & 0xFF);
    const fixed = new TextDecoder('utf-8').decode(bytes);
    if (fixed) s = fixed;
  } catch (_) {}

  const dict = [
    [/h�m/gi, 'hôm'],
    [/h�m nay/gi, 'hôm nay'],
    [/h�m qua/gi, 'hôm qua'],
    [/v�i/gi, 'với'],
    [/gi�m/gi, 'giảm'],
    [/kh�ng/gi, 'không'],
    [/n�ng/gi, 'nướng'],
    [/th�nh ph?m/gi, 'thành phẩm'],
    [/�\s*�ng/gi, 'đồng'],
  ];
  dict.forEach(([re, val]) => { s = s.replace(re, val); });
  return s;
}

function _deepRepairVietnameseValue(val) {
  if (Array.isArray(val)) return val.map(_deepRepairVietnameseValue);
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = _deepRepairVietnameseValue(v);
    return out;
  }
  if (typeof val === 'string') return _repairVietnameseString(val);
  return val;
}

async function _commitUpdatesInChunks(updates, chunkSize = 380) {
  if (!updates.length) return 0;
  let committed = 0;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const batch = writeBatch(_db);
    chunk.forEach(({ ref, data }) => batch.update(ref, sanitize(data)));
    await batch.commit();
    committed += chunk.length;
  }
  return committed;
}

async function repairVietnameseNow(options = {}) {
  const dryRun = !!options.dryRun;
  const forceCanonicalIds = options.forceCanonicalIds !== false;
  const ud = window.appState.userDoc;
  if (!ud || !['admin', 'owner', 'superadmin'].includes(String(ud.role || '').toLowerCase())) {
    throw new Error('Chỉ admin mới được phép chạy sửa dữ liệu Cloud.');
  }

  const report = {
    dryRun,
    startedAt: new Date().toISOString(),
    collections: {
      settings: 0,
      menu: 0,
      inventory: 0,
      suppliers: 0,
      purchases: 0,
      expenses: 0,
      history: 0,
    },
    totalUpdates: 0,
  };

  const updates = [];

  // 1) Settings
  const settingsSnap = await getDoc(_settingsDoc());
  if (settingsSnap.exists()) {
    const saved = settingsSnap.data() || {};
    const repaired = _repairSettingsText({ ...SETTINGS_DEFAULTS, ...saved });
    if (JSON.stringify(saved) !== JSON.stringify(repaired)) {
      report.collections.settings++;
      updates.push({ ref: _settingsDoc(), data: repaired });
    }
  }

  // 2) Product_Catalog
  {
    const snap = await getDocs(_col(MASTER_COLLECTIONS.products));
    const raw = snap.docs.map(_fromDoc).filter(Boolean);
    const repaired = _repairAppStateData('menu', _buildMenuViewFromMaster(raw, window.appState?.inventory || [], window.appState?.masterData?.recipes || []), { forceCanonicalIds });
    raw.forEach((item, idx) => {
      const fixed = repaired[idx];
      if (!fixed) return;
      const needs = _hasBrokenVietnamese(item.display_name) || _hasBrokenVietnamese(item.category);
      if (!needs) return;
      report.collections.menu++;
      updates.push({
        ref: _masterProductDoc(fixed.id),
        data: {
          display_name: fixed.name,
          category: fixed.category,
        }
      });
    });
  }

  // 3) Inventory_Items
  {
    const snap = await getDocs(_col(MASTER_COLLECTIONS.inventory));
    const raw = snap.docs.map(_fromDoc).filter(Boolean);
    const repaired = _repairAppStateData('inventory', _buildInventoryViewFromMaster(raw), { forceCanonicalIds });
    raw.forEach((item, idx) => {
      const fixed = repaired[idx];
      if (!fixed) return;
      if (!_hasBrokenVietnamese(item.material_name)) return;
      report.collections.inventory++;
      updates.push({ ref: _masterInventoryDoc(fixed.id), data: { material_name: fixed.name } });
    });
  }

  // 4) Generic collections (text fields only)
  for (const colName of ['suppliers', 'purchases', 'expenses', 'history']) {
    const snap = await getDocs(_col(colName));
    snap.docs.forEach(docSnap => {
      const raw = _fromDoc(docSnap);
      if (!raw) return;
      const repaired = _deepRepairVietnameseValue(raw);
      if (JSON.stringify(raw) !== JSON.stringify(repaired)) {
        report.collections[colName]++;
        updates.push({ ref: _doc(colName, docSnap.id), data: repaired });
      }
    });
  }

  report.totalUpdates = updates.length;
  if (!dryRun && updates.length > 0) {
    await _commitUpdatesInChunks(updates);
  }
  report.finishedAt = new Date().toISOString();
  return report;
}

// Đếm số snapshot đã ready để biết khi nào appState.ready = true
let _snapshotReadyCount  = 0;
const TOTAL_SNAPSHOTS    = 9;   // tables, orders, menu, inventory, settings, users, history, expenses, purchases

function _markSnapshotReady() {
  _snapshotReadyCount++;
  if (_snapshotReadyCount >= TOTAL_SNAPSHOTS && !window.appState.ready) {
    window.appState.ready = true;
    _dispatchEvent('db:ready');
    console.log('[DB] ✅ appState.ready – tất cả snapshot đã kết nối');
  }
}


// ============================================================
// §3  UTILITIES
// ============================================================

/**
 * Lọc bỏ undefined/null đệ quy trước khi ghi Firestore.
 * Tránh lỗi "Function setDoc() called with invalid data: undefined is not allowed"
 */
function sanitize(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj
      .map(sanitize)
      .filter(v => v !== null && v !== undefined);
  }
  if (obj instanceof Timestamp) return obj;
  if (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj._methodName === 'string'
  ) {
    // Preserve Firestore FieldValue sentinels such as serverTimestamp()/increment()
    return obj;
  }
  if (typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      const sv = sanitize(v);
      if (sv === null) continue;
      clean[k] = sv;
    }
    return clean;
  }
  return obj;
}

async function _safeSetDoc(ref, data, options, context) {
  try {
    await setDoc(ref, sanitize(data), options);
  } catch (err) {
    console.error(`[DB] setDoc failed${context ? ' · ' + context : ''}:`, err);
    throw err;
  }
}

async function _safeUpdateDoc(ref, data, context) {
  try {
    await updateDoc(ref, sanitize(data));
  } catch (err) {
    console.error(`[DB] updateDoc failed${context ? ' · ' + context : ''}:`, err);
    throw err;
  }
}

async function _safeDeleteDoc(ref, context) {
  try {
    await deleteDoc(ref);
  } catch (err) {
    console.error(`[DB] deleteDoc failed${context ? ' · ' + context : ''}:`, err);
    throw err;
  }
}

/** Chuyển Firestore Timestamp → ISO string (format quen thuộc với app.js) */
function _tsToIso(val) {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string')  return val;
  return null;
}

/** Chuẩn hóa document từ Firestore snapshot → object thường */
function _fromDoc(docSnap) {
  if (!docSnap || !docSnap.exists()) return null;
  const raw = docSnap.data();
  const out = { ...raw };
  // Tránh ghi đè id gốc nếu có (như id đơn hàng)
  if (!out.id) out.id = docSnap.id;
  out._docId = docSnap.id;
  // Chuyển tất cả Timestamp field
  for (const k of Object.keys(out)) {
    if (out[k] instanceof Timestamp) out[k] = _tsToIso(out[k]);
  }
  return out;
}

function _dispatchEvent(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// Shorthand paths
const _col = name => collection(_db, name);
const _doc = (col, id) => doc(_db, col, String(id));
const _settingsDoc = () => doc(_db, 'config', 'settings');
const MASTER_COLLECTIONS = {
  products: 'Product_Catalog',
  inventory: 'Inventory_Items',
  recipes: 'Recipes_BOM',
};
const _masterProductDoc = id => _doc(MASTER_COLLECTIONS.products, id);
const _masterInventoryDoc = id => _doc(MASTER_COLLECTIONS.inventory, id);
const _masterRecipeDoc = id => _doc(MASTER_COLLECTIONS.recipes, id);

function _normalizeUnitLabel(unit) {
  const raw = _repairVietnameseString(String(unit || '').trim());
  if (!raw) return 'pháº§n';
  const key = _slugRepairKey(raw);
  const map = {
    gram: 'Gram',
    gam: 'Gram',
    kg: 'Kg',
    kilogram: 'Kg',
    kilogam: 'Kg',
    con: 'Con',
    lon: 'Lon',
    chai: 'Chai',
    phan: 'pháº§n',
    portion: 'pháº§n',
    mieng: 'Miáº¿ng',
    piece: 'Miáº¿ng',
  };
  return map[key] || raw;
}

function _masterInventoryTypeToApp(invType) {
  return String(invType || '').toLowerCase() === 'retail'
    ? 'retail_item'
    : 'raw_material';
}

function _appInventoryTypeToMaster(itemType) {
  return String(itemType || '').toLowerCase() === 'retail_item'
    ? 'Retail'
    : 'Raw';
}

function _masterMenuTypeToApp(itemType) {
  return String(itemType || '').toLowerCase() === 'retail'
    ? 'retail_item'
    : 'finished_good';
}

function _appMenuTypeToMaster(itemType) {
  return String(itemType || '').toLowerCase() === 'retail_item'
    ? 'Retail'
    : 'Finished';
}

function _buildInventoryViewFromMaster(rows = []) {
  return [...rows]
    .map(item => {
      const id = String(item.inv_id || item.id || item._docId || '').trim();
      if (!id) return null;
      return {
        id,
        name: _repairVietnameseString(item.material_name || item.name || id),
        unit: _normalizeUnitLabel(item.base_unit || item.unit),
        itemType: item.itemType || _masterInventoryTypeToApp(item.inv_type),
        qty: Number(item.current_stock ?? item.qty ?? 0),
        minQty: Number(item.min_alert ?? item.minQty ?? 0),
        costPerUnit: Number(item.costPerUnit ?? 0),
        hidden: !!item.hidden,
        supplierName: item.supplierName || '',
        supplierPhone: item.supplierPhone || '',
        supplierAddress: item.supplierAddress || '',
        masterInventoryId: id,
        _docId: String(item._docId || id),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
}

function _buildMenuViewFromMaster(products = [], inventoryRows = [], recipes = []) {
  const inventoryById = new Map(inventoryRows.map(item => [String(item.id), item]));
  const recipeMap = new Map();

  (Array.isArray(recipes) ? recipes : []).forEach(recipe => {
    const parentId = String(recipe.parent_item_id || '').trim();
    if (!parentId) return;
    if (!recipeMap.has(parentId)) recipeMap.set(parentId, []);
    recipeMap.get(parentId).push(recipe);
  });

  return [...products]
    .map(product => {
      const id = String(product.item_id || product.id || product._docId || '').trim();
      if (!id) return null;

      const itemType = product.itemType || _masterMenuTypeToApp(product.item_type);
      const bomLines = recipeMap.get(id) || [];
      const ingredients = itemType === 'finished_good'
        ? bomLines.map(line => {
            const inventoryItem = inventoryById.get(String(line.ingredient_inv_id || ''));
            return inventoryItem ? {
              name: inventoryItem.name,
              qty: Number(line.quantity_needed ?? line.qty ?? 0),
              unit: inventoryItem.unit || _normalizeUnitLabel(line.unit),
            } : null;
          }).filter(Boolean)
        : [];
      const linkedInventory = itemType === 'retail_item'
        ? inventoryById.get(String(product.linkedInventoryId || bomLines[0]?.ingredient_inv_id || '')) || null
        : null;

      return {
        id,
        name: _repairVietnameseString(product.display_name || product.name || id),
        category: _repairVietnameseString(product.category || 'Khac'),
        price: Number(product.sell_price ?? product.price ?? 0),
        unit: _normalizeUnitLabel(product.unit || (linkedInventory ? linkedInventory.unit : 'phan')),
        cost: Number(product.cost ?? 0),
        itemType,
        linkedInventoryId: itemType === 'retail_item' ? (linkedInventory?.id || null) : null,
        ingredients,
        aliases: product.aliases || '',
        masterProductId: id,
        _docId: String(product._docId || id),
      };
    })
    .filter(Boolean);
}

const _masterSnapshotState = {
  countedMenu: false,
  countedInventory: false,
};

function _rebuildMasterDerivedState() {
  const master = window.appState.masterData || {};
  if (!Array.isArray(master.products) || !Array.isArray(master.inventoryItems) || !Array.isArray(master.recipes)) {
    return;
  }

  const inventory = _repairAppStateData('inventory', _buildInventoryViewFromMaster(master.inventoryItems));
  const menu = _repairAppStateData('menu', _buildMenuViewFromMaster(master.products, inventory, master.recipes));

  window.appState.inventory = inventory;
  window.appState.menu = menu;

  if (!_masterSnapshotState.countedInventory) {
    _masterSnapshotState.countedInventory = true;
    _markSnapshotReady();
  }
  if (!_masterSnapshotState.countedMenu) {
    _masterSnapshotState.countedMenu = true;
    _markSnapshotReady();
  }

  _dispatchEvent('db:update', { key: 'inventory' });
  _dispatchEvent('db:update', { key: 'menu' });
}

let _masterListenersAttached = false;
function _listenMasterCollections() {
  if (_masterListenersAttached) return;
  _masterListenersAttached = true;

  _unsubs.push(onSnapshot(_col(MASTER_COLLECTIONS.products), snap => {
    window.appState.masterData.products = snap.docs.map(_fromDoc).filter(Boolean);
    _rebuildMasterDerivedState();
  }, _snapErr(MASTER_COLLECTIONS.products)));

  _unsubs.push(onSnapshot(_col(MASTER_COLLECTIONS.inventory), snap => {
    window.appState.masterData.inventoryItems = snap.docs.map(_fromDoc).filter(Boolean);
    _rebuildMasterDerivedState();
  }, _snapErr(MASTER_COLLECTIONS.inventory)));

  _unsubs.push(onSnapshot(_col(MASTER_COLLECTIONS.recipes), snap => {
    window.appState.masterData.recipes = snap.docs.map(_fromDoc).filter(Boolean);
    _rebuildMasterDerivedState();
  }, _snapErr(MASTER_COLLECTIONS.recipes)));
}


// ============================================================
// §4  REALTIME PRESENCE  –  chỉ dùng RTDB, không dùng Firestore
// ============================================================
let _presenceAttached = false;

/** Gắn listener đọc toàn bộ presence – chạy 1 lần */
function _attachPresenceListener() {
  if (_presenceAttached) return;
  _presenceAttached = true;
  rtOnValue(rtRef(_rtdb, 'presence'), snap => {
    window.appState.presence = snap.val() || {};
    _dispatchEvent('db:update', { key: 'presence' });
  });
}

/** Đăng ký online/offline cho user hiện tại (gọi sau khi Auth thành công) */
async function _setupPresence(uid, displayName) {
  const myRef   = rtRef(_rtdb, `presence/${uid}`);
  const connRef = rtRef(_rtdb, '.info/connected');

  rtOnValue(connRef, async snap => {
    if (!snap.val()) return;

    // Khi mất kết nối → tự set offline
    await onDisconnect(myRef).set({
      displayName,
      online:   false,
      lastSeen: rtServerTimestamp(),
    });

    // Hiện tại đang online
    await rtSet(myRef, {
      displayName,
      online:   true,
      lastSeen: rtServerTimestamp(),
    });
  });
}


// ============================================================
// §5  ONSNAPSHOT LISTENERS  –  10 collection nghiệp vụ
// ============================================================
const _unsubs = [];

function _listen() {
  // 5a. Settings (single doc trong collection 'config')
  _unsubs.push(onSnapshot(_settingsDoc(), snap => {
    const saved = snap.exists() ? snap.data() : {};
    const repaired = _repairSettingsText({ ...SETTINGS_DEFAULTS, ...saved });
    window.appState.settings = repaired;
    _markSnapshotReady();
    _dispatchEvent('db:update', { key: 'settings' });

    if (snap.exists() && JSON.stringify(repaired) !== JSON.stringify({ ...SETTINGS_DEFAULTS, ...saved })) {
      Settings.save(repaired).catch(err => console.warn('[db:repair] settings warning', err));
    }
  }, _snapErr('settings')));

  // 5b. Tables  (sắp xếp theo id)
  _unsubs.push(onSnapshot(query(_col('tables'), orderBy('id')), snap => {
    window.appState.tables = snap.docs.map(_fromDoc).filter(Boolean);
    _markSnapshotReady();
    _dispatchEvent('db:update', { key: 'tables' });
  }, _snapErr('tables')));

  // 5c. Active Orders  (chỉ đơn status != 'closed')
  _unsubs.push(onSnapshot(
    query(_col('orders'), where('status', '!=', 'closed')),
    snap => {
      const map = {};
      snap.docs.forEach(d => {
        const o = _fromDoc(d);
        if (o) map[o.tableId] = o;
      });
      window.appState.orders = map;
      _markSnapshotReady();
      _dispatchEvent('db:update', { key: 'orders' });
    }, _snapErr('orders')
  ));

  // 5d. Menu
  _unsubs.push(onSnapshot(_col('menu'), snap => {
    const raw = snap.docs.map(_fromDoc).filter(Boolean);
    if (Array.isArray(window.appState?.masterData?.products)) return;
    const repaired = _repairAppStateData('menu', raw);
    window.appState.menu = repaired;
    _markSnapshotReady();
    _dispatchEvent('db:update', { key: 'menu' });

    let needCommit = 0;
    const batch = writeBatch(_db);
    raw.forEach((item, idx) => {
      const fixed = repaired[idx];
      if (!fixed) return;
      const ing = Array.isArray(item.ingredients) ? item.ingredients : [];
      const needs = _hasBrokenVietnamese(item.name) ||
        _hasBrokenVietnamese(item.category) ||
        ing.some(x => _hasBrokenVietnamese(x?.name));
      if (!needs) return;
      needCommit++;
      batch.update(_doc('menu', fixed.id), sanitize({
        name: fixed.name,
        category: fixed.category,
        ingredients: fixed.ingredients || [],
      }));
    });
    if (needCommit > 0) {
      batch.commit().then(() => {
        console.log(`[db:repair] ✅ menu repaired: ${needCommit} items`);
      }).catch(err => console.warn('[db:repair] menu warning', err));
    }
  }, _snapErr('menu')));

  // 5e. Inventory
  _unsubs.push(onSnapshot(query(_col('inventory'), orderBy('name')), snap => {
    const raw = snap.docs.map(_fromDoc).filter(Boolean);
    if (Array.isArray(window.appState?.masterData?.inventoryItems)) return;
    const repaired = _repairAppStateData('inventory', raw);
    window.appState.inventory = repaired;
    _markSnapshotReady();
    _dispatchEvent('db:update', { key: 'inventory' });

    let needCommit = 0;
    const batch = writeBatch(_db);
    raw.forEach((item, idx) => {
      const fixed = repaired[idx];
      if (!fixed) return;
      if (!_hasBrokenVietnamese(item.name)) return;
      needCommit++;
      batch.update(_doc('inventory', fixed.id), sanitize({ name: fixed.name }));
    });
    if (needCommit > 0) {
      batch.commit().then(() => {
        console.log(`[db:repair] ✅ inventory repaired: ${needCommit} items`);
      }).catch(err => console.warn('[db:repair] inventory warning', err));
    }
  }, _snapErr('inventory')));

  // 5f. Users
  _unsubs.push(onSnapshot(_col('users'), snap => {
    window.appState.users = snap.docs.map(_fromDoc).filter(Boolean);
    _markSnapshotReady();
    _dispatchEvent('db:update', { key: 'users' });
  }, _snapErr('users')));

  // 5g. History  (500 đơn mới nhất – đủ cho báo cáo tháng)
  _unsubs.push(onSnapshot(
    query(_col('history'), orderBy('paidAt', 'desc'), limit(500)),
    snap => {
      const raw = snap.docs.map(_fromDoc).filter(Boolean);
      const repaired = raw.map(item => _deepRepairVietnameseValue(item));
      window.appState.history = repaired;
      _markSnapshotReady();
      _dispatchEvent('db:update', { key: 'history' });

      let needCommit = 0;
      const batch = writeBatch(_db);
      raw.forEach((item, idx) => {
        const fixed = repaired[idx];
        if (!fixed) return;
        if (JSON.stringify(item) === JSON.stringify(fixed)) return;
        needCommit++;
        batch.update(_doc('history', fixed.id), sanitize(fixed));
      });
      if (needCommit > 0) {
        batch.commit().then(() => {
          console.log(`[db:repair] ✅ history repaired: ${needCommit} items`);
        }).catch(err => console.warn('[db:repair] history warning', err));
      }
    }, _snapErr('history')
  ));

  // 5h. Expenses
  _unsubs.push(onSnapshot(query(_col('expenses'), orderBy('date', 'desc')), snap => {
    const raw = snap.docs.map(_fromDoc).filter(Boolean);
    const repaired = raw.map(item => _deepRepairVietnameseValue(item));
    window.appState.expenses = repaired;
    _markSnapshotReady();
    _dispatchEvent('db:update', { key: 'expenses' });

    let needCommit = 0;
    const batch = writeBatch(_db);
    raw.forEach((item, idx) => {
      const fixed = repaired[idx];
      if (!fixed) return;
      if (JSON.stringify(item) === JSON.stringify(fixed)) return;
      needCommit++;
      batch.update(_doc('expenses', fixed.id), sanitize(fixed));
    });
    if (needCommit > 0) {
      batch.commit().then(() => {
        console.log(`[db:repair] ✅ expenses repaired: ${needCommit} items`);
      }).catch(err => console.warn('[db:repair] expenses warning', err));
    }
  }, _snapErr('expenses')));

  // 5i. Purchases
  _unsubs.push(onSnapshot(query(_col('purchases'), orderBy('date', 'desc')), snap => {
    const raw = snap.docs.map(_fromDoc).filter(Boolean);
    const repaired = raw.map(item => _deepRepairVietnameseValue(item));
    window.appState.purchases = repaired;
    _markSnapshotReady();
    _dispatchEvent('db:update', { key: 'purchases' });

    let needCommit = 0;
    const batch = writeBatch(_db);
    raw.forEach((item, idx) => {
      const fixed = repaired[idx];
      if (!fixed) return;
      if (JSON.stringify(item) === JSON.stringify(fixed)) return;
      needCommit++;
      batch.update(_doc('purchases', fixed.id), sanitize(fixed));
    });
    if (needCommit > 0) {
      batch.commit().then(() => {
        console.log(`[db:repair] ✅ purchases repaired: ${needCommit} items`);
      }).catch(err => console.warn('[db:repair] purchases warning', err));
    }
  }, _snapErr('purchases')));

  // Presence listener (RTDB)
  _attachPresenceListener();
}

function _stopListeners() {
  _unsubs.forEach(u => u && u());
  _unsubs.length       = 0;
  _snapshotReadyCount  = 0;
  window.appState.ready = false;
}

function _snapErr(name) {
  return e => console.error(`[DB] onSnapshot error [${name}]:`, e);
}


// ============================================================
// §6  FIREBASE AUTH  +  RBAC
// ============================================================
onAuthStateChanged(_auth, async user => {
  if (!user) {
    // Nếu không có user, vẫn khởi tạo để app chạy (chế độ offline hoặc bỏ login)
    window.appState.uid = 'local-admin';
    window.appState.userDoc = { uid: 'local-admin', email: OWNER_EMAIL, role: 'admin', displayName: 'Admin', username: 'admin' };
    
    _listen();
    _listenMasterCollections();
    _dispatchEvent('db:signedIn', { userDoc: window.appState.userDoc });
    console.log('[DB] Chạy chế độ bỏ qua đăng nhập (Local Admin)');
    return;
  }

  // Đọc / tạo document users/{uid}
  const uRef  = _doc('users', user.uid);
  const uSnap = await getDoc(uRef);

  let role        = 'staff';
  let displayName = user.displayName || user.email;
  let username    = user.email.split('@')[0];

  if (uSnap.exists()) {
    const d = uSnap.data();
    role        = d.role        || 'staff';
    displayName = d.displayName || displayName;
    username    = d.username    || username;
  } else {
    // Lần đầu đăng nhập → tạo doc
    role = (user.email === OWNER_EMAIL) ? 'admin' : 'staff';
    await setDoc(uRef, sanitize({
      uid:         user.uid,
      email:       user.email,
      displayName,
      username,
      role,
      createdAt:   serverTimestamp(),
    }));
  }

  // Email chủ quán luôn là admin (bảo đảm không bị hạ quyền)
  if (user.email === OWNER_EMAIL) role = 'admin';

  // Tài khoản bị vô hiệu hóa → đăng xuất ngay
  if (role === 'disabled') {
    console.warn('[DB] Tài khoản bị disabled – đăng xuất');
    await signOut(_auth);
    return;
  }

  window.appState.uid     = user.uid;
  window.appState.userDoc = { uid: user.uid, email: user.email, role, displayName, username };

  // Setup presence RTDB
  await _setupPresence(user.uid, displayName || username);

  // Bắt đầu lắng nghe Firestore
  _listen();
  _listenMasterCollections();

  _dispatchEvent('db:signedIn', { userDoc: window.appState.userDoc });
  console.log('[DB] Auth OK –', role, user.email);
});


// ============================================================
// §7  AUTH API
// ============================================================
const Auth = {
  /** Đăng nhập email/password */
  async signIn(email, password) {
    return signInWithEmailAndPassword(_auth, email, password);
  },

  /** Đăng xuất */
  async signOut() {
    return signOut(_auth);
  },

  /** Tạo tài khoản Firebase Auth mới (dùng từ màn hình quản lý nhân viên) */
  async createUser(email, password) {
    return createUserWithEmailAndPassword(_auth, email, password);
  },

  get currentUser() { return _auth.currentUser; },
};


// ============================================================
// §8  TABLES API
// ============================================================
const Tables = {
  /** Lấy danh sách bàn từ appState (đã sync) – thay Store.getTables() */
  getAll() { return window.appState.tables; },

  /** Cập nhật bàn  */
  async update(tableId, data) {
    await _safeUpdateDoc(_doc('tables', tableId), data, `tables.update(${tableId})`);
  },

  /**
   * Khởi tạo bàn lần đầu (batch write).
   * Gọi khi migrate hoặc khi tableCount thay đổi.
   */
  async initTables(count) {
    const existing = window.appState.tables || [];
    const existingIds = new Set(existing.map(t => Number(t.id)));
    const batch = writeBatch(_db);
    
    // 1. Thêm các bàn còn thiếu (nếu tăng số lượng)
    for (let i = 1; i <= count; i++) {
      if (existingIds.has(i)) continue;
      batch.set(_doc('tables', i), sanitize({
        id:       i,
        name:     `Bàn ${i}`,
        status:   'empty',
        orderId:  null,
        openTime: null,
        note:     '',
      }));
    }
    
    // 2. Xóa các bàn dư thừa (nếu giảm số lượng)
    for (const t of existing) {
      if (Number(t.id) > count) {
        batch.delete(_doc('tables', t.id));
      }
    }
    
    await batch.commit();
  },
};


// ============================================================
// §9  ORDERS API  –  Transaction-first
//     Mọi thao tác thêm/sửa/xóa món đều dùng runTransaction
// ============================================================
const Orders = {
  /** Đơn đang mở của bàn – thay Store.getOrders()[tableId] */
  forTable(tableId) {
    return window.appState.orders[String(tableId)] || null;
  },

  /** Mở đơn mới cho bàn – thay Store.setOrders() + Store.setTables() */
  async open(tableId, tableName, staffUid) {
    const orderId  = `ORD-${tableId}-${Date.now()}`;
    const orderRef = _doc('orders',  orderId);
    const tableRef = _doc('tables',  tableId);

    await runTransaction(_db, async tx => {
      tx.set(orderRef, sanitize({
        id:           orderId,
        tableId:      String(tableId),
        tableName,
        staffUid:     staffUid || null,
        items:        [],
        discount:     0,
        discountType: 'vnd',
        shipping:     0,
        vatAmount:    0,
        note:         '',
        status:       'open',
        openedAt:     serverTimestamp(),
      }));
      tx.set(tableRef, sanitize({
        status:   'occupied',
        orderId,
        openTime: serverTimestamp(),
      }), { merge: true });
    });

    return orderId;
  },

  /**
   * Thêm món vào đơn (Transaction).
   * item = { id, name, price, qty, note?, ... }
   */
  async addItem(orderId, item) {
    const orderRef = _doc('orders', orderId);
    await runTransaction(_db, async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw new Error('Đơn không tồn tại: ' + orderId);

      const items = (snap.data().items || [])
        .map(sanitize)
        .filter(Boolean);

      // Gộp nếu trùng id + note
      const noteKey = item.note || '';
      const idx     = items.findIndex(i => i.id === item.id && (i.note || '') === noteKey);

      if (idx >= 0) {
        items[idx].qty = (items[idx].qty || 1) + (item.qty || 1);
      } else {
        items.push(sanitize({ ...item, qty: item.qty || 1 }));
      }

      tx.update(orderRef, { items });
    });
  },

  /**
   * Thay đổi số lượng món (Transaction).
   * delta: +1 hoặc -1 (hoặc số lớn hơn)
   */
  async changeQty(orderId, itemId, itemNote, delta) {
    const orderRef = _doc('orders', orderId);
    await runTransaction(_db, async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw new Error('Đơn không tồn tại: ' + orderId);

      let items = (snap.data().items || [])
        .map(sanitize)
        .filter(Boolean);

      const noteKey = itemNote || '';
      const idx     = items.findIndex(i => i.id === itemId && (i.note || '') === noteKey);
      if (idx < 0) return;

      items[idx].qty = (items[idx].qty || 1) + delta;
      if (items[idx].qty <= 0) items.splice(idx, 1);

      tx.update(orderRef, { items });
    });
  },

  /** Xóa hẳn 1 dòng món khỏi đơn (Transaction) */
  async removeItem(orderId, itemId, itemNote) {
    const orderRef = _doc('orders', orderId);
    await runTransaction(_db, async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) return;

      const noteKey = itemNote || '';
      const items   = (snap.data().items || [])
        .map(sanitize)
        .filter(i => i && !(i.id === itemId && (i.note || '') === noteKey));

      tx.update(orderRef, { items });
    });
  },

  /** Cập nhật ghi chú trên 1 dòng món (Transaction) */
  async updateItemNote(orderId, itemId, note) {
    const orderRef = _doc('orders', orderId);
    await runTransaction(_db, async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) return;

      const items = (snap.data().items || [])
        .map(sanitize)
        .filter(Boolean);

      const idx = items.findIndex(i => i.id === itemId);
      if (idx >= 0) items[idx].note = note || '';

      tx.update(orderRef, { items });
    });
  },

  /** Cập nhật metadata đơn (discount, shipping, vatAmount, note, discountType) */
  async updateMeta(orderId, meta) {
    await _safeUpdateDoc(_doc('orders', orderId), meta, `orders.updateMeta(${orderId})`);
  },

  /**
   * Đóng đơn / Thanh toán (Atomic Transaction).
   * Ghi vào collection 'history', xóa đơn, reset bàn,
   * VÀ trừ tồn kho nguyên liệu theo công thức món ăn – tất cả trong 1 transaction.
   * payInfo = { total, cost, payMethod, shipping, vatAmount, discount, discountType }
   */
  async close(orderId, payInfo) {
    const orderRef  = _doc('orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error('Đơn không tồn tại: ' + orderId);

    const order    = orderSnap.data();
    const menuList = window.appState.menu || [];
    const skipInventoryDeduction = order?.is_migrated === true;

    // FIX 5: Tính bản đồ nguyên liệu cần trừ TRƯỚC khi vào transaction
    const deductions = {}; // { [inventoryId]: amountToDeduct }
    if (!skipInventoryDeduction) {
      (order.items || []).forEach(orderItem => {
        const dish = menuList.find(m => m.id === orderItem.id);
        if (!dish) return;

        const itemType = dish.itemType || ((Array.isArray(dish.ingredients) && dish.ingredients.length > 0) ? 'finished_good' : 'retail_item');
        if (itemType === 'retail_item') {
          const stock =
            (window.appState.inventory || []).find(s => s.id === dish.linkedInventoryId) ||
            (window.appState.inventory || []).find(s => s.name === dish.name);
          if (!stock || !stock.id) return;
          deductions[stock.id] = (deductions[stock.id] || 0) + (orderItem.qty || 1);
          return;
        }

        if (!Array.isArray(dish.ingredients)) return;
        dish.ingredients.forEach(ing => {
          const stock = (window.appState.inventory || []).find(s => s.name === ing.name);
          if (!stock || !stock.id) return;
          deductions[stock.id] = (deductions[stock.id] || 0) + (ing.qty || 0) * (orderItem.qty || 1);
        });
      });
    }
    const deductIds = Object.keys(deductions);

    await runTransaction(_db, async tx => {
      // Đọc các inv doc trước khi write (quy tắc bắt buộc của Firestore Transaction)
      const invSnaps = await Promise.all(deductIds.map(id => tx.get(_masterInventoryDoc(id))));

      // Ghi history
      const histRef = doc(_col('history'));
      tx.set(histRef, sanitize({
        ...order,
        ...payInfo,
        historyId: histRef.id,
        paidAt:    serverTimestamp(),
        status:    'closed',
      }));

      // Xóa active order
      tx.delete(orderRef);

      // Reset bàn
      tx.update(_doc('tables', order.tableId), {
        status:   'empty',
        orderId:  null,
        openTime: null,
      });

      // FIX 5: Trừ tồn kho nguyên tử – dùng increment(-qty)
      invSnaps.forEach(snap => {
        if (!snap.exists()) return;
        const deductAmt = deductions[snap.id] || 0;
        if (deductAmt <= 0) return;
        const currentQty = Number(snap.data().current_stock ?? snap.data().qty ?? 0);
        tx.update(snap.ref, { current_stock: Math.max(0, currentQty - deductAmt) });
      });
    });
  },

  /**
   * Hủy đơn (không ghi history).
   * Tương đương clearTable() offline.
   */
  async cancel(orderId) {
    const snap = await getDoc(_doc('orders', orderId));
    if (!snap.exists()) return;
    const { tableId } = snap.data();

    await runTransaction(_db, async tx => {
      tx.delete(_doc('orders', orderId));
      tx.update(_doc('tables', tableId), {
        status:   'empty',
        orderId:  null,
        openTime: null,
      });
    });
  },
};


// ============================================================
// §10  MENU API  –  thay Store.getMenu / setMenu
// ============================================================
const Menu = {
  /** Trả về menu từ appState – dùng thay Store.getMenu() */
  getAll() { return window.appState.menu; },

  async add(item) {
    const ref = doc(_col(MASTER_COLLECTIONS.products));
    await _safeSetDoc(ref, sanitize({
      item_id: ref.id,
      display_name: item.name || ref.id,
      category: item.category || 'Khac',
      sell_price: Number(item.price || 0),
      item_type: _appMenuTypeToMaster(item.itemType),
      aliases: item.aliases || '',
      linkedInventoryId: item.linkedInventoryId || null,
      cost: Number(item.cost || 0),
      unit: item.unit || 'phan',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }), undefined, 'menu.add');
    if (Array.isArray(item.ingredients)) {
      await RecipesBOM.saveBatch(ref.id, item.ingredients);
    }
    return ref.id;
  },

  async update(id, data) {
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(data, 'name')) payload.display_name = data.name;
    if (Object.prototype.hasOwnProperty.call(data, 'category')) payload.category = data.category;
    if (Object.prototype.hasOwnProperty.call(data, 'price')) payload.sell_price = Number(data.price || 0);
    if (Object.prototype.hasOwnProperty.call(data, 'itemType')) payload.item_type = _appMenuTypeToMaster(data.itemType);
    if (Object.prototype.hasOwnProperty.call(data, 'aliases')) payload.aliases = data.aliases || '';
    if (Object.prototype.hasOwnProperty.call(data, 'linkedInventoryId')) payload.linkedInventoryId = data.linkedInventoryId || null;
    if (Object.prototype.hasOwnProperty.call(data, 'cost')) payload.cost = Number(data.cost || 0);
    if (Object.prototype.hasOwnProperty.call(data, 'unit')) payload.unit = data.unit || 'phan';
    payload.updatedAt = serverTimestamp();
    await _safeUpdateDoc(_masterProductDoc(id), payload, `menu.update(${id})`);
    if (Object.prototype.hasOwnProperty.call(data, 'ingredients')) {
      await RecipesBOM.saveBatch(id, data.ingredients || []);
    }
  },

  async delete(id) {
    const existingSnap = await getDocs(query(_col(MASTER_COLLECTIONS.recipes), where('parent_item_id', '==', String(id))));
    const batch = writeBatch(_db);
    existingSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
    batch.delete(_masterProductDoc(id));
    await batch.commit();
  },
};

// ============================================================
// §10b  RECIPES_BOM API  –  lưu công thức theo collection riêng
// ============================================================
const RecipesBOM = {
  async saveBatch(parent_item_id, ingredients) {
    const parentId = String(parent_item_id || '').trim();
    if (!parentId) return;

    const inv = Array.isArray(window.appState?.inventory) ? window.appState.inventory : [];
    const invByName = new Map(inv.map(i => [String(i.name || '').trim(), i]).filter(([k]) => !!k));
    const invByKey = new Map(inv.map(i => [_slugRepairKey(i.name), i]).filter(([k]) => !!k));

    const list = Array.isArray(ingredients) ? ingredients : [];
    const normalized = list.map(ing => {
      const name = String(ing?.name || '').trim();
      const qty = Number(ing?.qty ?? ing?.quantity_needed ?? 0);
      const unit = String(ing?.unit || '').trim();
      if (!name || !(qty > 0)) return null;

      const stock =
        invByName.get(name) ||
        invByKey.get(_slugRepairKey(name)) ||
        null;
      if (!stock?.id) return null;

      const ingredientId = String(stock.id);
      return {
        parent_item_id: parentId,
        ingredient_inv_id: ingredientId,
        ingredient_name: stock.name || name,
        quantity_needed: qty,
        unit: unit || stock.unit || '',
      };
    }).filter(Boolean);

    const nextIds = new Set(normalized.map(x => x.ingredient_inv_id));

    const existingSnap = await getDocs(query(_col('Recipes_BOM'), where('parent_item_id', '==', parentId)));
    const existing = existingSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));

    const batch = writeBatch(_db);

    existing.forEach(docItem => {
      const ingId = String(docItem.ingredient_inv_id || '');
      if (ingId && !nextIds.has(ingId)) {
        batch.delete(docItem.ref);
      }
    });

    normalized.forEach(row => {
      const docId = `${row.parent_item_id}_${row.ingredient_inv_id}`;
      batch.set(_doc('Recipes_BOM', docId), sanitize({
        ...row,
        updatedAt: serverTimestamp(),
      }), { merge: true });
    });

    await batch.commit();
  },
};


// ============================================================
// §11  INVENTORY API  –  thay Store.getInventory / setInventory
// ============================================================
const Inventory = {
  getAll() { return window.appState.inventory; },

  async add(item) {
    const ref = doc(_col(MASTER_COLLECTIONS.inventory));
    await _safeSetDoc(ref, sanitize({
      inv_id: ref.id,
      material_name: item.name || ref.id,
      inv_type: _appInventoryTypeToMaster(item.itemType),
      base_unit: item.unit || 'phan',
      current_stock: Number(item.qty || 0),
      min_alert: Number(item.minQty || 0),
      costPerUnit: Number(item.costPerUnit || 0),
      hidden: !!item.hidden,
      supplierName: item.supplierName || '',
      supplierPhone: item.supplierPhone || '',
      supplierAddress: item.supplierAddress || '',
      updatedAt: serverTimestamp(),
    }), undefined, 'inventory.add');
    return ref.id;
  },

  async update(id, data) {
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(data, 'name')) payload.material_name = data.name;
    if (Object.prototype.hasOwnProperty.call(data, 'unit')) payload.base_unit = data.unit || 'phan';
    if (Object.prototype.hasOwnProperty.call(data, 'itemType')) payload.inv_type = _appInventoryTypeToMaster(data.itemType);
    if (Object.prototype.hasOwnProperty.call(data, 'qty')) payload.current_stock = Number(data.qty || 0);
    if (Object.prototype.hasOwnProperty.call(data, 'minQty')) payload.min_alert = Number(data.minQty || 0);
    if (Object.prototype.hasOwnProperty.call(data, 'costPerUnit')) payload.costPerUnit = Number(data.costPerUnit || 0);
    if (Object.prototype.hasOwnProperty.call(data, 'hidden')) payload.hidden = !!data.hidden;
    if (Object.prototype.hasOwnProperty.call(data, 'supplierName')) payload.supplierName = data.supplierName || '';
    if (Object.prototype.hasOwnProperty.call(data, 'supplierPhone')) payload.supplierPhone = data.supplierPhone || '';
    if (Object.prototype.hasOwnProperty.call(data, 'supplierAddress')) payload.supplierAddress = data.supplierAddress || '';
    payload.updatedAt = serverTimestamp();
    await _safeUpdateDoc(_masterInventoryDoc(id), payload, `inventory.update(${id})`);
  },

  async delete(id) {
    await _safeDeleteDoc(_masterInventoryDoc(id), `inventory.delete(${id})`);
  },

  /**
   * Trừ tồn kho sau thanh toán (Transaction).
   * menuItems = array items từ đơn hàng.
   * Khớp logic deductInventory() trong store.js.
   */
  async deduct(menuItems) {
    const menu       = window.appState.menu || [];
    const inventory  = window.appState.inventory || [];
    const normalizeKey = (text) => String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    // Tính lượng cần trừ cho mỗi nguyên liệu
    const deductions = {}; // { [inventoryId]: amountToDeduct }

    menuItems.forEach(orderItem => {
      const dish = menu.find(m => m.id === orderItem.id);
      if (!dish) return;

      const itemType = dish.itemType || ((Array.isArray(dish.ingredients) && dish.ingredients.length > 0) ? 'finished_good' : 'retail_item');
      if (itemType === 'retail_item') {
        const stock = inventory.find(s => s.id === dish.linkedInventoryId) || inventory.find(s => normalizeKey(s.name) === normalizeKey(dish.name));
        if (!stock || !stock.id) return;
        deductions[stock.id] = (deductions[stock.id] || 0) + orderItem.qty;
        return;
      }

      if (!Array.isArray(dish.ingredients)) return;

      dish.ingredients.forEach(ing => {
        const stock = inventory.find(s => s.name === ing.name);
        if (!stock || !stock.id) return;
        deductions[stock.id] = (deductions[stock.id] || 0) + ing.qty * orderItem.qty;
      });
    });

    const ids = Object.keys(deductions);
    if (ids.length === 0) return;

    await runTransaction(_db, async tx => {
      // Đọc tất cả trước (quy tắc Transaction)
      const snaps = await Promise.all(ids.map(id => tx.get(_masterInventoryDoc(id))));

      // Tính & ghi tất cả
      snaps.forEach(snap => {
        if (!snap.exists()) return;
        const currentQty = Number(snap.data().current_stock ?? snap.data().qty ?? 0);
        const newQty     = Math.max(0, currentQty - (deductions[snap.id] || 0));
        tx.update(snap.ref, { current_stock: newQty });
      });
    });
  },
};


// ============================================================
// §12  SETTINGS API  –  thay Store.getSettings / setSettings
// ============================================================
const Settings = {
  /** Lấy settings (đã merge với defaults) – thay Store.getSettings() */
  get() { return window.appState.settings; },

  /** Lưu settings – thay Store.setSettings() */
  async save(data) {
    await _safeSetDoc(_settingsDoc(), { ...data }, { merge: true }, 'settings.save');
  },
};


// ============================================================
// §13  USERS API  –  thay Store.getUsers / setUsers
// ============================================================
const Users = {
  /** Lấy danh sách users – thay Store.getUsers() */
  getAll() { return window.appState.users; },

  /** Sửa thông tin user (role, displayName, password...) */
  async update(uid, data) {
    await _safeUpdateDoc(_doc('users', uid), data, `users.update(${uid})`);
  },

  /** Đặt role cho user */
  async setRole(uid, role) {
    await _safeUpdateDoc(_doc('users', uid), { role }, `users.setRole(${uid})`);
  },

  /** Vô hiệu hóa user */
  async disable(uid) {
    await _safeUpdateDoc(_doc('users', uid), { role: 'disabled' }, `users.disable(${uid})`);
  },

  /**
   * FIX 3: Tạo tài khoản nhân viên mới MÀ KHÔNG văng phiên Admin.
   * Dùng Secondary Firebase App ("GhostApp") để createUser,
   * sau đó đăng xuất app phụ và xóa nó. Admin không bị ảnh hưởng.
   * @param {string} email
   * @param {string} password
   * @param {string} displayName
   * @param {string} role - 'staff' | 'admin'
   */
  async add(email, password, displayName, role = 'staff') {
    let ghostApp;
    try {
      // Khởi tạo Firebase App phụ (ghost) tạm thời
      const { initializeApp: _initApp, deleteApp } = await import(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
      );
      const { getAuth: _getAuth,
              createUserWithEmailAndPassword: _createUser,
              signOut: _signOut } = await import(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
      );

      ghostApp  = _initApp(FIREBASE_CONFIG, `GhostApp_${Date.now()}`);
      const ghostAuth = _getAuth(ghostApp);

      // Tạo tài khoản trên Ghost app
      const cred = await _createUser(ghostAuth, email, password);
      const newUid = cred.user.uid;

      // Đăng xuất ngay khỏi ghost auth (không ảnh hưởng _auth chính)
      await _signOut(ghostAuth);

      // Ghi document user vào Firestore bằng app chính (Admin)
      const username = displayName || email.split('@')[0];
      await setDoc(_doc('users', newUid), sanitize({
        uid: newUid,
        email,
        displayName: displayName || username,
        username,
        role,
        createdAt: serverTimestamp(),
      }));

      // Dọn sạch Ghost App
      await deleteApp(ghostApp);
      ghostApp = null;

      console.log('[DB] Users.add: Tạo thành công nhân viên', email, '| role:', role);
      return { success: true, uid: newUid };
    } catch (err) {
      if (ghostApp) {
        try {
          const { deleteApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
          await deleteApp(ghostApp);
        } catch(_) {}
      }
      console.error('[DB] Users.add error:', err);
      throw err;
    }
  },
};


// ============================================================
// §14  HISTORY / EXPENSES / PURCHASES / SUPPLIERS
//      Thay Store.getHistory(), Store.getExpenses() ...
// ============================================================
const History = {
  getAll() { return window.appState.history; },
  async add(data) {
    const histRef = doc(_col('history'));
    await _safeSetDoc(histRef, {
      ...data,
      historyId: histRef.id,
    }, undefined, 'history.add');
    return histRef.id;
  }
};

const Expenses = {
  getAll() { return window.appState.expenses; },

  async add(data) {
    // data = { id, name, amount, category, date }  – khớp store.js addExpense
    const ref = doc(_col('expenses'));
    await _safeSetDoc(ref, {
      ...data,
      id:   ref.id,
      date: data.date || new Date().toISOString(),
    }, undefined, 'expenses.add');
    return ref.id;
  },

  async delete(id) {
    await _safeDeleteDoc(_doc('expenses', id), `expenses.delete(${id})`);
  },
};

const Purchases = {
  getAll() { return window.appState.purchases; },

  async add(data) {
    // data = { name, qty, unit, price, costPerUnit, date, supplier, supplierId }
    // Khớp store.js addPurchase
    const ref = doc(_col('purchases'));
    await _safeSetDoc(ref, {
      ...data,
      id:   ref.id,
      date: data.date || new Date().toISOString(),
    }, undefined, 'purchases.add');
    return ref.id;
  },

  async update(id, data) {
    await _safeUpdateDoc(_doc('purchases', id), data, `purchases.update(${id})`);
  },

  async delete(id) {
    await _safeDeleteDoc(_doc('purchases', id), `purchases.delete(${id})`);
  },
};

const Suppliers = {
  getAll() { return window.appState.suppliers; },

  async add(data) {
    const ref = doc(_col('suppliers'));
    await _safeSetDoc(ref, { ...data, id: ref.id }, undefined, 'suppliers.add');
    return ref.id;
  },

  async update(id, data) {
    await _safeUpdateDoc(_doc('suppliers', id), data, `suppliers.update(${id})`);
  },

  async delete(id) {
    await _safeDeleteDoc(_doc('suppliers', id), `suppliers.delete(${id})`);
  },
};


// ============================================================
// §14b  SHIFTLOGS API  –  Chốt ca, ghi lên Firestore
// ============================================================
const ShiftLogs = {
  /**
   * Ghi 1 bản ghi chốt ca lên Firestore.
   * logData = { staffUid, staffName, cashAtHand, totalRevenue,
   *             totalOrders, totalExpense, note, shiftStart, shiftEnd }
   */
  async add(logData) {
    const ref = doc(_col('shiftLogs'));
    await _safeSetDoc(ref, {
      ...logData,
      id:       ref.id,
      loggedAt: serverTimestamp(),
    }, undefined, 'shiftLogs.add');
    console.log('[DB] ShiftLogs.add: Đã ghi chốt ca', ref.id);
    return ref.id;
  },

  /** Lấy danh sách log chốt ca (50 ca gần nhất) */
  async getLast50() {
    const { getDocs } = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
    );
    const q    = query(_col('shiftLogs'), orderBy('loggedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(_fromDoc).filter(Boolean);
  },
};


// ============================================================
// §15  PRESENCE API  (RTDB – read only sau khi _setupPresence)
// ============================================================
const Presence = {
  /** Tất cả presence  */
  getAll() { return window.appState.presence; },

  /** Chỉ user đang online */
  getOnline() {
    return Object.entries(window.appState.presence)
      .filter(([, v]) => v && v.online)
      .map(([uid, v]) => ({ uid, ...v }));
  },

  /** Xóa toàn bộ presence của user offline */
  async clearOffline() {
    const all = window.appState.presence || {};
    const offlineUids = Object.entries(all)
      .filter(([, v]) => !v || !v.online)
      .map(([uid]) => uid);

    for (const uid of offlineUids) {
      await rtSet(rtRef(_rtdb, `presence/${uid}`), null);
    }
    return { removed: offlineUids.length, removedUids: offlineUids };
  },

  /** Xóa presence offline cũ hơn N giờ */
  async clearStale(hours = 24) {
    const all = window.appState.presence || {};
    const threshold = Date.now() - Math.max(1, Number(hours || 24)) * 3600000;
    const removed = [];

    for (const [uid, v] of Object.entries(all)) {
      if (v && v.online) continue;
      const ts = Number(v?.lastSeen || 0);
      if (ts > 0 && ts < threshold) {
        await rtSet(rtRef(_rtdb, `presence/${uid}`), null);
        removed.push(uid);
      }
    }
    return { removed: removed.length, removedUids: removed, threshold };
  },

  /** Xóa toàn bộ presence (cẩn thận) */
  async clearAll() {
    await rtSet(rtRef(_rtdb, 'presence'), null);
    return { removedAll: true };
  },
};


// ============================================================
// §16  CÔNG CỤ DI TÚ DỮ LIỆU
// ============================================================

/**
 * _cleanRecord(raw)
 * Làm sạch 1 record từ LocalStorage trước khi kiểm tra / push lên Firestore:
 *   • Ép kiểu số cho các field amount/price/qty/total/cost/discount/shipping/vatAmount
 *   • Chuyển undefined → ''
 *   • Loại bỏ null/undefined ở tầng sâu
 */
function _cleanRecord(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const NUM_FIELDS = new Set([
    'price','qty','total','cost','amount','discount',
    'shipping','vatAmount','costPerUnit','minQty',
  ]);
  const out = Array.isArray(raw) ? [] : {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) { out[k] = ''; continue; }
    if (v === null)      { continue; }                  // bỏ null
    if (NUM_FIELDS.has(k)) {
      const n = parseFloat(v);
      out[k] = isNaN(n) ? 0 : n;
    } else if (Array.isArray(v)) {
      out[k] = v.map(_cleanRecord).filter(Boolean);
    } else if (typeof v === 'object') {
      out[k] = _cleanRecord(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Đọc LocalStorage an toàn */
function _lsRead(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

/**
 * migrateLocalToFirestore(isDryRun = true)
 *
 * isDryRun = true  → Chỉ đọc, làm sạch và in console.table(). KHÔNG ghi Cloud.
 * isDryRun = false → Dùng writeBatch push toàn bộ lên Firestore.
 *
 * IDEMPOTENT: Dùng ID cũ (đơn hàng, menu, inventory...) làm Document ID trên Firestore.
 *             Chạy nhiều lần vẫn an toàn – không tạo bản sao.
 *
 * Yêu cầu: Phải đăng nhập Admin trước.
 *
 * Dùng từ DevTools console:
 *   await DB.migrate()           // dry-run xem trước
 *   await DB.migrate(false)      // ghi thật lên Firestore
 */
async function migrateLocalToFirestore(isDryRun = true) {
  const ud = window.appState.userDoc;
  if (!ud || ud.role !== 'admin') {
    throw new Error('[Migrate] Chỉ admin mới có thể chạy migrate.');
  }

  const mode = isDryRun ? '🔍 DRY-RUN (chỉ đọc, không ghi)' : '⚡ WRITE (ghi lên Firestore)';
  console.log(`[Migrate] Bắt đầu migrate – chế độ: ${mode}`);

  // ---- Hạt nhân băng thông -------------------------------------------
  const BATCH_SIZE = 400; // Firestore limit 500/batch; dùng 400 cho an toàn

  /**
   * flush(items, docIdFn, colName)
   * items    : mảng bản ghi đã được làm sạch
   * docIdFn  : (item) => string  – hàm lấy Document ID
   * colName  : tên collection Firestore
   */
  async function flush(items, docIdFn, colName) {
    if (!items || items.length === 0) {
      console.log(`[Migrate] ⏭ ${colName}: không có dữ liệu LocalStorage`);
      return;
    }

    const cleaned = items.map(_cleanRecord).filter(Boolean);

    // --- DRY-RUN: in ra bảng xem trước ---
    if (isDryRun) {
      console.groupCollapsed(`[Migrate 🔍] ${colName} – ${cleaned.length} bản ghi`);
      console.table(
        cleaned.map(r => ({
          id:       docIdFn(r),
          ...Object.fromEntries(
            Object.entries(r).slice(0, 6)   // giới hạn cột cho dễ đọc
          ),
        }))
      );
      console.groupEnd();
      return;
    }

    // --- WRITE: push lên Firestore theo batch ---
    for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
      const b = writeBatch(_db);
      cleaned.slice(i, i + BATCH_SIZE).forEach(item => {
        // setDoc với merge: false – IDEMPOTENT vì dùng ID cũ
        b.set(_doc(colName, docIdFn(item)), sanitize(item));
      });
      await b.commit();
      console.log(`[Migrate] ✓ ${colName}: ghi ${Math.min(i + BATCH_SIZE, cleaned.length)}/${cleaned.length}`);
    }
  }

  // ---- 1. Settings ---------------------------------------------------
  const settings = _lsRead('gkhl_settings');
  if (settings) {
    const merged = { ...SETTINGS_DEFAULTS, ..._cleanRecord(settings) };
    if (isDryRun) {
      console.groupCollapsed('[Migrate 🔍] settings');
      console.table([merged]);
      console.groupEnd();
    } else {
      await Settings.save(merged);
      console.log('[Migrate] ✓ settings');
    }
  } else {
    console.log('[Migrate] ⏭ settings: không có trong LocalStorage');
  }

  // ---- 2. Tables -----------------------------------------------------
  const rawTables = _lsRead('gkhl_tables') || [];
  await flush(
    rawTables,
    t => String(t.id),   // ID cũ của bàn là Document ID
    'tables'
  );

  // ---- 3. Menu -------------------------------------------------------
  const rawMenu = _lsRead('gkhl_menu') || [];
  await flush(
    rawMenu,
    m => String(m.id),   // giữ đúng ID cũ (ví dụ: "menu_1234")
    'menu'
  );

  // ---- 4. Inventory --------------------------------------------------
  const rawInv = _lsRead('gkhl_inventory') || [];
  await flush(
    rawInv,
    item => String(
      item.id || item.name.replace(/\s+/g, '_').toLowerCase()
    ),
    'inventory'
  );

  // ---- 5. History (tối đa 500 đơn mới nhất) ---------------------------
  const rawHistory = (_lsRead('gkhl_history') || []).slice(0, 500);
  await flush(
    rawHistory,
    // IDEMPOTENT: dùng historyId hoặc id cũ làm Document ID
    o => o.historyId || o.id || `h_${o.paidAt || Date.now()}`,
    'history'
  );

  // ---- 6. Expenses ---------------------------------------------------
  const rawExpenses = _lsRead('gkhl_expenses') || [];
  await flush(
    rawExpenses,
    e => e.id || `exp_${e.date || Date.now()}`,
    'expenses'
  );

  // ---- 7. Purchases --------------------------------------------------
  const rawPurchases = _lsRead('gkhl_purchases') || [];
  await flush(
    rawPurchases,
    p => p.id || `pur_${p.date || Date.now()}`,
    'purchases'
  );

  // ---- 8. Suppliers --------------------------------------------------
  const rawSuppliers = _lsRead('gkhl_suppliers') || [];
  await flush(
    rawSuppliers,
    s => s.id || `sup_${s.name || Date.now()}`,
    'suppliers'
  );

  // ---- Tổng kết -------------------------------------------------------
  const summary = {
    settings:  settings ? 1 : 0,
    tables:    rawTables.length,
    menu:      rawMenu.length,
    inventory: rawInv.length,
    history:   rawHistory.length,
    expenses:  rawExpenses.length,
    purchases: rawPurchases.length,
    suppliers: rawSuppliers.length,
  };
  console.log(`[Migrate] ${isDryRun ? '🔍 Dry-run' : '✅ Hoàn tất'} – Tổng kết:`);
  console.table(summary);
  if (isDryRun) {
    console.log('[Migrate] Chạy lại với isDryRun=false để ghi thật: await DB.migrate(false)');
  }
  return summary;
}


/**
 * seedTablesIfEmpty(tableCount)
 *
 * Kiểm tra collection 'tables' trên Firestore.
 * Nếu CHƯ A CÓ BẬN NÀO hết → khởi tạo đủ tableCount bàn trống.
 * Nếu ĐÃ CÓ dữ liệu → không làm gì (chống ghi đè).
 *
 * Mục đích: Tránh lỗi "failed-precondition" khi app.js cố
 *   query/update một document bàn chưa tồn tại trên Firestore.
 *
 * Gọi từ DevTools console:
 *   await DB.seedTables(20)
 */
async function seedTablesIfEmpty(tableCount = 20) {
  const ud = window.appState.userDoc;
  if (!ud || ud.role !== 'admin') {
    throw new Error('[seedTables] Chỉ admin mới có thể seed bàn.');
  }

  // Đọc snapshot 1 lần để kiểm tra
  const { getDocs } = await import(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
  );
  const snap = await getDocs(_col('tables'));

  if (!snap.empty) {
    console.log(`[seedTables] Bỏ qua – collection 'tables' đã có ${snap.size} bàn.`);
    return { skipped: true, existing: snap.size };
  }

  // Collection rỗng → tạo bàn
  const count  = Number(tableCount) || 20;
  const batch2 = writeBatch(_db);

  for (let i = 1; i <= count; i++) {
    batch2.set(_doc('tables', i), sanitize({
      id:       i,
      name:     `Bàn ${i}`,
      status:   'empty',
      orderId:  null,
      openTime: null,
      note:     '',
    }));
  }

  await batch2.commit();
  console.log(`[seedTables] ✅ Đã khởi tạo ${count} bàn trống lên Firestore.`);
  return { created: count };
}

/**
 * TỐI CAO: forceMigrateToCloud()
 * Bơm thẳng DEFAULT_MENU, DEFAULT_INVENTORY, 20 BÀN và Cấu hình lên Cloud 
 * Xóa sạch bàn hiện tại để đưa về đúng 20 bàn.
 */
async function forceMigrateToCloud() {
  const ud = window.appState.userDoc;
  if (!ud || ud.role !== 'admin') {
    throw new Error('[Migrate] Chỉ admin mới có quyền thực hiện việc này.');
  }

  console.log('[forceMigrateToCloud] BẮT ĐẦU ÉP DỮ LIỆU LÊN CLOUD...');
  
  let menuData = [];
  if (typeof DEFAULT_MENU !== 'undefined') menuData = DEFAULT_MENU;
  else {
    try { menuData = JSON.parse(localStorage.getItem('gkhl_menu')) || []; } catch(e){}
  }
  
  let invData = [];
  if (typeof DEFAULT_INVENTORY !== 'undefined') invData = DEFAULT_INVENTORY;
  else {
    try { invData = JSON.parse(localStorage.getItem('gkhl_inventory')) || []; } catch(e){}
  }

  const { getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  
  // Xóa bàn cũ & Tạo batch
  const tableSnap = await getDocs(_col('tables'));
  let deletes = 0;
  
  const batch = writeBatch(_db);
  
  tableSnap.forEach(d => {
    batch.delete(d.ref);
    deletes++;
  });
  
  // 1. Ép 20 bàn chuẩn
  for (let i = 1; i <= 20; i++) {
    batch.set(_doc('tables', i), sanitize({
      id: i,
      name: `Bàn ${i}`,
      status: 'empty',
      orderId: null,
      openTime: null,
      note: ''
    }));
  }

  // 2. Settings mặc định khôi phục lại
  batch.set(_settingsDoc(), sanitize({ ...SETTINGS_DEFAULTS }));

  // 3. Ép Menu lên mây
  menuData.forEach(m => {
    batch.set(_doc('menu', String(m.id)), sanitize(_cleanRecord(m)));
  });

  // 4. Ép Inventory
  invData.forEach(item => {
    const docId = String(item.id || item.name.replace(/\s+/g, '_').toLowerCase());
    batch.set(_doc('inventory', docId), sanitize(_cleanRecord(item)));
  });

  // COMMIT Toàn bộ gánh hàng
  await batch.commit();

  console.log(`[forceMigrateToCloud] ✅ HOÀN TẤT BƠM DATA LÊN CLOUD!`);
  console.log(`- Đã xóa ${deletes} bàn cũ bị lỗi/kẹt`);
  console.log(`- Đã tạo lại chuẩn 20 Bàn mới`);
  console.log(`- Đã bơm ${menuData.length} Món ăn`);
  console.log(`- Đã bơm ${invData.length} Kho`);
  console.log(`- Đã đẩy Cấu hình Default Settings`);
  
  alert('ĐÃ BƠM CHẾT DỮ LIỆU LÊN CLOUD THÀNH CÔNG! Trình duyệt sẽ được tải lại ngay.');
  window.location.reload();
}

// ============================================================
// §17b  MIGRATE TỪ FILE JSON BACKUP
//       Dùng khi muốn đẩy file pos_backup_*.json lên Firestore
//       KHÔNG cần LocalStorage — đọc thẳng từ object JSON
// ============================================================

/**
 * migrateFromBackupJson(backupObj, isDryRun = true)
 *
 * backupObj : object parse từ file JSON backup (cấu trúc { version, data: { menu, inventory, ... } })
 * isDryRun  : true  → chỉ in console.table(), KHÔNG ghi Cloud
 *             false → writeBatch push lên Firestore
 *
 * Cách dùng từ DevTools console:
 *
 *   // Bước 1: Tải file JSON lên tab DevTools
 *   const raw  = await fetch('/pos_backup_2026-04-13.json').then(r => r.json());
 *
 *   // Bước 2: Xem trước (dry-run)
 *   await DB.migrateJson(raw);
 *
 *   // Bước 3: Ghi thật
 *   await DB.migrateJson(raw, false);
 */
async function migrateFromBackupJson(backupObj, isDryRun = true) {
  const ud = window.appState.userDoc;
  if (!ud || ud.role !== 'admin') {
    throw new Error('[migrateJson] Chỉ admin mới có thể chạy migrate.');
  }
  if (!backupObj || !backupObj.data) {
    throw new Error('[migrateJson] File backup không hợp lệ. Cần có trường data.');
  }

  const d    = backupObj.data;
  const mode = isDryRun ? '🔍 DRY-RUN' : '⚡ WRITE';
  console.log(`[migrateJson] ${mode} – Backup từ: ${backupObj.exportedAt || 'N/A'} · Store: ${backupObj.storeName || 'N/A'}`);

  const BATCH_SIZE = 400;

  // ---- Hàm flush nội bộ (giống §16 nhưng nhận data trực tiếp) --------
  async function flush(items, docIdFn, colName) {
    if (!Array.isArray(items) || items.length === 0) {
      console.log(`[migrateJson] ⏭ ${colName}: rỗng, bỏ qua`);
      return 0;
    }
    const cleaned = items.map(_cleanRecord).filter(Boolean);

    if (isDryRun) {
      console.groupCollapsed(`[migrateJson 🔍] ${colName} – ${cleaned.length} bản ghi`);
      console.table(
        cleaned.map(r => ({
          docId: docIdFn(r),
          ...Object.fromEntries(Object.entries(r).slice(0, 6)),
        }))
      );
      console.groupEnd();
      return cleaned.length;
    }

    // Ghi thật — batch theo nhóm 400
    for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
      const b = writeBatch(_db);
      cleaned.slice(i, i + BATCH_SIZE).forEach(item => {
        b.set(_doc(colName, String(docIdFn(item))), sanitize(item));
      });
      await b.commit();
      console.log(`[migrateJson] ✓ ${colName}: ${Math.min(i + BATCH_SIZE, cleaned.length)}/${cleaned.length}`);
    }
    return cleaned.length;
  }

  const counts = {};

  // ---- 1. Settings ---------------------------------------------------
  if (d.settings) {
    const merged = { ...SETTINGS_DEFAULTS, ..._cleanRecord(d.settings) };
    // Xóa các key nhạy cảm không cần thiết trên Cloud
    delete merged.geminiApiKey;
    delete merged.googleTTSKey;
    delete merged.cassoToken;
    delete merged.gemmaApiKey;
    if (isDryRun) {
      console.groupCollapsed('[migrateJson 🔍] settings');
      console.table([merged]);
      console.groupEnd();
    } else {
      await Settings.save(merged);
      console.log('[migrateJson] ✓ settings');
    }
    counts.settings = 1;
  }

  // ---- 2. Tables -----------------------------------------------------
  counts.tables = await flush(
    d.tables,
    t => String(t.id),
    'tables'
  );

  // ---- 3. Menu -------------------------------------------------------
  counts.menu = await flush(
    d.menu,
    m => String(m.id),
    'menu'
  );

  // ---- 4. Inventory --------------------------------------------------
  counts.inventory = await flush(
    d.inventory,
    item => String(item.id || item.name.replace(/\s+/g, '_').toLowerCase()),
    'inventory'
  );

  // ---- 5. History (max 500 đơn mới nhất) ----------------------------
  const historySlice = (d.history || [])
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
    .slice(0, 500);
  counts.history = await flush(
    historySlice,
    // IDEMPOTENT: dùng historyId cũ → không tạo bản sao khi chạy lại
    o => o.historyId || o.id || `h_${o.paidAt}`,
    'history'
  );

  // ---- 6. Expenses ---------------------------------------------------
  counts.expenses = await flush(
    d.expenses,
    e => e.id || `exp_${e.date || Date.now()}`,
    'expenses'
  );

  // ---- 7. Purchases --------------------------------------------------
  counts.purchases = await flush(
    d.purchases,
    p => p.id || `pur_${p.date || Date.now()}`,
    'purchases'
  );

  // ---- 8. Suppliers --------------------------------------------------
  counts.suppliers = await flush(
    d.suppliers,
    s => s.id || `sup_${s.name || Date.now()}`,
    'suppliers'
  );

  // ---- 9. Users (chỉ tạo Firestore user doc, không tạo Firebase Auth) -
  //   Mỗi user LocalStorage { username, password, role }
  //   sẽ được ghi vào /users/{username} với password bị loại bỏ (không lưu pw plain text)
  if (Array.isArray(d.users) && d.users.length > 0) {
    const usersClean = d.users.map(u => {
      const c = _cleanRecord(u);
      delete c.password; // ❌ TUYỆT ĐỐI không lưu password plain text lên Cloud
      return {
        username:    c.username || 'unknown',
        role:        c.role     || 'staff',
        displayName: c.username || 'unknown',
        // uid sẽ được gán sau khi tạo Firebase Auth account
        migratedFromLocal: true,
      };
    });

    if (isDryRun) {
      console.groupCollapsed('[migrateJson 🔍] users (password ĐÃ bị loại bỏ)');
      console.table(usersClean);
      console.groupEnd();
    } else {
      // Ghi vào subcollection riêng để admin nhận biết chưa set auth
      const b = writeBatch(_db);
      usersClean.forEach(u => {
        b.set(_doc('pending_users', u.username), sanitize(u));
      });
      await b.commit();
      console.log(`[migrateJson] ✓ ${usersClean.length} users → /pending_users (cần set Firebase Auth)`);
    }
    counts.users = usersClean.length;
  }

  // ---- Tổng kết -------------------------------------------------------
  console.log(`[migrateJson] ${isDryRun ? '🔍 Dry-run hoàn tất' : '✅ WRITE hoàn tất'} – Tổng kết:`);
  console.table(counts);

  if (isDryRun) {
    console.log('%c Chạy lại với isDryRun=false để ghi thật: await DB.migrateJson(raw, false)',
      'color: orange; font-weight: bold');
  } else {
    console.log('%c ✅ Dữ liệu đã lên Firestore. Chạy await DB.seedTables() nếu tables trống.',
      'color: green; font-weight: bold');
  }

  return counts;
}


// ============================================================
// §18  EXPORT  –  window.DB
// ============================================================
window.DB = {
  // Core Auth & DB Instances (Dành cho Console)
  auth: _auth,      // Trỏ thẳng vào Firebase Auth instance native
  db: _db,          // Trỏ thẳng vào Firestore instance
  rtdb: _rtdb,      // Trỏ thẳng vào Realtime Database instance
  
  // Hàm đăng nhập/xuất/tạo NV 
  login: async (email, pass) => {
    try {
      await Auth.signIn(email, pass);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Đăng nhập Firebase thất bại.' };
    }
  },
  logout: Auth.signOut,
  createUser: Auth.createUser,

  // Reset Data Cloud
  resetCloudData: async (keepMenu, keepInventory) => {
    const collectionsToClear = ['history', 'orders', 'expenses', 'purchases', 'aiHistory', 'shiftLogs'];
    if (!keepMenu) collectionsToClear.push('menu');
    if (!keepInventory) collectionsToClear.push('inventory', 'unitConversions', 'suppliers');

    for (const colName of collectionsToClear) {
      const colRef = collection(_db, colName);
      const snapshot = await getDocs(colRef);
      if (snapshot.empty) continue;
      
      const batch = writeBatch(_db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`[Cloud] Đã xóa trắng bảng ${colName}`);
    }
  },

  // Các hàm nghiệp vụ (aliases tiện lợi)
  seedTablesIfEmpty: seedTablesIfEmpty,
  completeOrder: Orders.close,
  addItem:       Orders.addItem,
  changeQty:     Orders.changeQty,
  removeItem:    Orders.removeItem,
  updateExtras:  Orders.updateMeta,

  // Các instance/namespace gốc
  Auth,
  Tables,
  Orders,
  Menu,
  RecipesBOM,
  Inventory,
  Settings,
  Users,
  History,
  Expenses,
  Purchases,
  Suppliers,
  Presence,
  ShiftLogs,    // FIX 3: Chốt ca Cloud

  // Công cụ di trú dữ liệu
  migrate:     migrateLocalToFirestore,
  migrateJson: migrateFromBackupJson,
  seedTables:  seedTablesIfEmpty,
  forceMigrateToCloud: forceMigrateToCloud,
  repairVietnameseNow: repairVietnameseNow,

  // Tiện ích đọc nhanh
  get ready()   { return window.appState.ready; },
  get userDoc() { return window.appState.userDoc; },
  get state()   { return window.appState; },
};

console.log('✅ [DB] window.DB đã được bơm đầy đủ hàm! Sẵn sàng cho test Console.');

window.__viDiag = {
  hasBroken: _hasBrokenVietnamese,
  check() {
    const st = window.appState || {};
    const menu = Array.isArray(st.menu) ? st.menu : [];
    const inv = Array.isArray(st.inventory) ? st.inventory : [];
    const settings = st.settings || {};

    const menuDirty = menu.filter(m =>
      _hasBrokenVietnamese(m?.name) ||
      _hasBrokenVietnamese(m?.category) ||
      (Array.isArray(m?.ingredients) && m.ingredients.some(ig => _hasBrokenVietnamese(ig?.name)))
    );

    const invDirty = inv.filter(i => _hasBrokenVietnamese(i?.name));

    const settingsDirty = {
      storeName: _hasBrokenVietnamese(settings.storeName),
      bankOwner: _hasBrokenVietnamese(settings.bankOwner),
      storeSlogan: _hasBrokenVietnamese(settings.storeSlogan),
    };

    return {
      ready: !!st.ready,
      counts: {
        menuTotal: menu.length,
        menuDirty: menuDirty.length,
        inventoryTotal: inv.length,
        inventoryDirty: invDirty.length,
      },
      settingsDirty,
      sample: {
        menu: menuDirty.slice(0, 10).map(x => ({ id: x.id, name: x.name, category: x.category })),
        inventory: invDirty.slice(0, 10).map(x => ({ id: x.id, name: x.name })),
      }
    };
  },
  onlineUsers() {
    const p = (window.appState && window.appState.presence) || {};
    return Object.entries(p).map(([uid, v]) => ({
      uid,
      displayName: v?.displayName,
      online: !!v?.online,
      lastSeen: v?.lastSeen,
    }));
  }
};

// ✅ Debug checkpoint – nếu bạn thấy dòng này trong F12 là db.js đã load đúng
console.log('%c✅ Firebase Bridge Ready – window.DB đã sẵn sàng', 'color:#00D68F;font-weight:bold;font-size:13px');
console.log('[DB] db.js loaded – đang chờ Firebase Auth...');

// Thông báo khi Auth và appState.ready xong
window.addEventListener('db:ready', () => {
  console.log('%c🔥 Firebase appState.ready = true – Toàn bộ dữ liệu đã đồng bộ từ Cloud', 'color:#4FC3F7;font-weight:bold');
});
window.addEventListener('db:signedIn', (e) => {
  const ud = e.detail && e.detail.userDoc;
  console.log('%c👤 Firebase Auth OK:', 'color:#FFD740;font-weight:bold', ud && ud.email, '|', ud && ud.role);
});
window.addEventListener('db:signedOut', () => {
  console.log('%c🔒 Firebase signedOut', 'color:#FF5252;font-weight:bold');
});
