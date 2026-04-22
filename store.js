// ============================================================
// STORE.JS - State Management & localStorage
// ============================================================

const KEYS = {
  menu: 'gkhl_menu',
  inventory: 'gkhl_inventory',
  tables: 'gkhl_tables',
  orders: 'gkhl_orders',
  orderPhotos: 'gkhl_order_photos',
  history: 'gkhl_history',
  expenses: 'gkhl_expenses',
  purchases: 'gkhl_purchases',
  purchasePhotos: 'gkhl_purchase_photos',
  settings: 'gkhl_settings',
  backups: 'gkhl_backups',
  lastBackup: 'gkhl_last_backup',
  aiHistory: 'gkhl_ai_history',
  suppliers: 'gkhl_suppliers',
  lastReportExportWeekly: 'gkhl_last_report_export_weekly',
  lastReportExportMonthly: 'gkhl_last_report_export_monthly',
  users: 'gkhl_users',
  unitConversions: 'gkhl_unit_conversions',
  currentShift: 'gkhl_current_shift',
  itemMergeRequests: 'gkhl_item_merge_requests',
};

const ITEM_TYPES = {
  RETAIL: 'retail_item',
  RAW: 'raw_material',
  FINISHED: 'finished_good',
};

function _slugVi(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function _inferInventoryItemType(item = {}) {
  if (item.itemType === ITEM_TYPES.RETAIL || item.itemType === ITEM_TYPES.RAW) return item.itemType;
  if (item.saleMode === 'retail' || item.directSale === true) return ITEM_TYPES.RETAIL;
  return ITEM_TYPES.RAW;
}

function _normalizeInventoryItem(item = {}) {
  return {
    ...item,
    itemType: _inferInventoryItemType(item),
    qty: Number(item.qty || 0),
    minQty: Number(item.minQty || 0),
    costPerUnit: Number(item.costPerUnit || 0),
    hidden: !!item.hidden,
    mergedInto: item.mergedInto || null,
  };
}

function _inferMenuItemType(item = {}) {
  if (item.itemType === ITEM_TYPES.RETAIL || item.itemType === ITEM_TYPES.FINISHED) return item.itemType;
  return Array.isArray(item.ingredients) && item.ingredients.length > 0 ? ITEM_TYPES.FINISHED : ITEM_TYPES.RETAIL;
}

function _resolveLinkedInventoryId(item = {}, inventory = []) {
  if (item.linkedInventoryId && inventory.some(inv => inv.id === item.linkedInventoryId)) return item.linkedInventoryId;
  const exact = inventory.find(inv => _slugVi(inv.name) === _slugVi(item.name));
  return exact ? exact.id : null;
}

function _normalizeUnitText(unit) {
  const raw = String(unit || '').trim();
  if (!raw) return 'phần';
  if (/ph/i.test(raw) && /(áº|Ã|ở|§n|ần|an)/i.test(raw)) return 'phần';
  if (/mi/i.test(raw) && /(áº|Ã|ếng|eng)/i.test(raw)) return 'Miếng';
  const key = _slugVi(raw);
  const map = {
    phan: 'phần',
    portion: 'phần',
    lon: 'Lon',
    chai: 'Chai',
    ly: 'ly',
    kg: 'Kg',
    kilogram: 'Kg',
    gram: 'Gram',
    gam: 'Gram',
    mieng: 'Miếng',
    piece: 'Miếng',
    con: 'Con',
  };
  return map[key] || raw;
}

function _normalizeMenuItem(item = {}, inventory = []) {
  const itemType = _inferMenuItemType(item);
  return {
    ...item,
    unit: _normalizeUnitText(item.unit),
    itemType,
    linkedInventoryId: itemType === ITEM_TYPES.RETAIL ? _resolveLinkedInventoryId(item, inventory) : null,
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
  };
}

const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // MENU – Không fallback về data giả, ứng dụng chờ Firestore qua window.appState
  getMenu() {
    const inventory = this.getInventory();
    return (this.get(KEYS.menu) || []).map(item => _normalizeMenuItem(item, inventory));
  },
  setMenu(m) {
    const inventory = this.getInventory();
    this.set(KEYS.menu, (m || []).map(item => _normalizeMenuItem(item, inventory)));
  },

  // USERS
  getUsers() { 
    let u = this.get(KEYS.users);
    if (!u || u.length === 0) {
      // Default admin if none exists
      u = [{ username: 'admin', password: '123', role: 'admin' }];
      this.setUsers(u);
    }
    return u;
  },
  setUsers(users) { this.set(KEYS.users, users); },

  // INVENTORY – Không fallback về data giả, ứng dụng chờ Firestore qua window.appState
  getInventory() { return (this.get(KEYS.inventory) || []).map(_normalizeInventoryItem); },
  setInventory(inv) { this.set(KEYS.inventory, (inv || []).map(_normalizeInventoryItem)); },

  // TABLES
  getTables() {
    const saved = this.get(KEYS.tables);
    const settings = this.getSettings();
    const count = (settings && settings.tableCount) ? settings.tableCount : 20;

    if(saved) {
      // Adjust saved list to match tableCount
      if(saved.length === count) return saved;
      if(saved.length > count) return saved.slice(0, count);
      // Add missing tables
      const extra = Array.from({length: count - saved.length}, (_, i) => ({
        id: saved.length + i + 1,
        name: `Bàn ${saved.length + i + 1}`,
        status: 'empty', orderId: null, openTime: null, note: ''
      }));
      return [...saved, ...extra];
    }
    // No saved data – generate fresh list
    return Array.from({length: count}, (_, i) => ({
      id: i + 1, name: `Bàn ${i + 1}`,
      status: 'empty', orderId: null, openTime: null, note: ''
    }));
  },
  setTables(t) { this.set(KEYS.tables, t); },

  // Rebuild tables list when tableCount setting changes
  rebuildTables(newCount) {
    const current = this.get(KEYS.tables) || [];
    if(current.length === newCount) return;
    if(newCount < current.length) {
      this.setTables(current.slice(0, newCount));
    } else {
      const extra = Array.from({length: newCount - current.length}, (_, i) => ({
        id: current.length + i + 1,
        name: `Bàn ${current.length + i + 1}`,
        status: 'empty', orderId: null, openTime: null, note: ''
      }));
      this.setTables([...current, ...extra]);
    }
  },

  // ORDERS (active orders per table)
  getOrders() { return this.get(KEYS.orders) || {}; },
  setOrders(o) { this.set(KEYS.orders, o); },

  // ORDER PHOTOS (max ~5 per table – enforced at UI)
  getOrderPhotos() { return this.get(KEYS.orderPhotos) || {}; },
  setOrderPhotos(map) { this.set(KEYS.orderPhotos, map); },

  // HISTORY (completed orders)
  getHistory() { return this.get(KEYS.history) || []; },
  addHistory(order) {
    const h = this.getHistory();
    h.unshift(order);
    if(h.length > 500) h.splice(500);
    this.set(KEYS.history, h);
  },

  // EXPENSES
  getExpenses() { return this.get(KEYS.expenses) || []; },
  setExpenses(arr) { this.set(KEYS.expenses, arr || []); },
  addExpense(e) {
    const exp = this.getExpenses();
    exp.unshift(e);
    this.set(KEYS.expenses, exp);
    if (window.DB && window.DB.Expenses && window.DB.Expenses.add) {
      window.DB.Expenses.add(e).catch(console.error);
    }
  },

  // PURCHASES
  getPurchases() { return this.get(KEYS.purchases) || []; },
  addPurchase(p, opts = {}) {
    const pur = this.getPurchases();
    const entry = p && typeof p === 'object' ? { ...p } : p;
    if (entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, '__skipCloudSync')) {
      delete entry.__skipCloudSync;
    }
    pur.unshift(entry);
    this.set(KEYS.purchases, pur);
    if (!opts.skipCloudSync && window.DB && window.DB.Purchases && window.DB.Purchases.add) {
      window.DB.Purchases.add(entry).catch(console.error);
    }
  },
  setPurchases(arr) { this.set(KEYS.purchases, arr); },

  // PURCHASE PHOTOS (many per purchase)
  getPurchasePhotos() { return this.get(KEYS.purchasePhotos) || {}; },
  setPurchasePhotos(map) { this.set(KEYS.purchasePhotos, map); },

  // ASYNC PHOTO GETTERS/SETTERS (Sử dụng IndexedDB)
  async getPurchasePhotosAsync() { return (await PhotoDB.get(KEYS.purchasePhotos)) || {}; },
  async setPurchasePhotosAsync(map) { await PhotoDB.set(KEYS.purchasePhotos, map); },
  async getOrderPhotosAsync() { return (await PhotoDB.get(KEYS.orderPhotos)) || {}; },
  async setOrderPhotosAsync(map) { await PhotoDB.set(KEYS.orderPhotos, map); },

  // SETTINGS
  getSettings() {
    const defaults = {
      tableCount: 20,
      currency: 'đ',
      taxRate: 0,
      storeName: 'XE KHÔ CHỮA LÀNH',
      storeAddress: '',
      storePhone: '0937707900',
      storeSlogan: 'Ăn là nhớ, nhớ là ghiền!',
      bankName: 'Vietinbank',
      bankAccount: '0937707900',
      bankOwner: 'XE KHÔ CHỮA LÀNH',
      autoBackup: true,
      storageQuotaMb: 500,
      ocrMode: 'auto',
      photoRetentionDays: 0,
      activeAIEngine: 'deepseek',
      forceOffline: false,
      geminiApiKey: '',
      deepseekApiKey: '',
      deepseekEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      deepseekModel: 'deepseek-chat',
      googleTTSKey: '',
      gemmaEndpoint: '',
      gemmaModel: '',
      gemmaApiKey: '',
      autoExportWeekly: false,
      autoExportMonthly: false,
      autoPushWeeklyReportToGoogleDrive: false,
      reportExportType: 'revenue',
      reportExportPeriod: 'today',
      reportExportDate: '',
      autoUploadToGoogleDrive: false,
      googleDriveUploadUrl: '',
      googleDriveFolderId: '',
    };
    const saved = this.get(KEYS.settings);
    if(!saved) return defaults;
    // Merge: đảm bảo các field mới (như taxRate) luôn tồn tại
    return { ...defaults, ...saved };
  },
  setSettings(s) { this.set(KEYS.settings, s); },

  getLastReportExportWeeklyKey() { return localStorage.getItem(KEYS.lastReportExportWeekly); },
  setLastReportExportWeeklyKey(k) { localStorage.setItem(KEYS.lastReportExportWeekly, k); },
  getLastReportExportMonthlyKey() { return localStorage.getItem(KEYS.lastReportExportMonthly); },
  setLastReportExportMonthlyKey(k) { localStorage.setItem(KEYS.lastReportExportMonthly, k); },

  // AI HISTORY
  getAIHistory() { return this.get(KEYS.aiHistory) || []; },
  setAIHistory(h) { this.set(KEYS.aiHistory, h); },

  // SHIFT MANAGEMENT
  getCurrentShift() { return this.get(KEYS.currentShift) || null; },
  setCurrentShift(shift) { this.set(KEYS.currentShift, shift); },

  // RESET ALL DATA (giữ lại menu và cài đặt)
  resetAll(keepMenu = true, keepInventory = true) {
    const menu = keepMenu ? this.getMenu() : null;
    const inv = keepInventory ? this.getInventory() : null;
    const settings = this.getSettings();
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    this.setSettings(settings);
    if(menu) this.setMenu(menu);
    if(inv) this.setInventory(inv);
  },

  // BACKUP
  getFullBackup(opts = {}) {
    // Chỉ backup dữ liệu kinh doanh, bỏ qua các key meta
    // Ảnh (orderPhotos/purchasePhotos) thường rất nặng (base64) nên mặc định KHÔNG include để tránh quota localStorage.
    const includePhotos = !!opts.includePhotos;
    const SKIP_KEYS = new Set(['backups', 'lastBackup']);
    if(!includePhotos) {
      SKIP_KEYS.add('orderPhotos');
      SKIP_KEYS.add('purchasePhotos');
    }
    const data = {};
    Object.entries(KEYS).forEach(([k, storageKey]) => {
      if(SKIP_KEYS.has(k)) return;
      
      let parsed = null;
      // Ưu tiên lấy từ window.appState (Firestore) nếu có, nếu không thì lấy từ localStorage
      if (window.appState && window.appState[k]) {
        parsed = window.appState[k];
      } else {
        const raw = localStorage.getItem(storageKey);
        if(!raw) return;
        try {
          parsed = JSON.parse(raw);
        } catch(e) {
          console.warn('[Backup] Skipped key:', k, e.message);
          return;
        }
      }

      if(!parsed) return;

      try {
        // Với backup local mặc định, bỏ ảnh trong lịch sử đơn để tránh quota exceeded.
        if(!includePhotos && k === 'history' && Array.isArray(parsed)) {
          data[k] = parsed.slice(0, 300).map(item => {
            if(!item || typeof item !== 'object') return item;
            const next = { ...item };
            if(Array.isArray(next.photos) && next.photos.length) next.photos = [];
            return next;
          });
          return;
        }
        // AI history có thể khá dài, giới hạn nhẹ để giảm dung lượng backup local.
        if(!includePhotos && k === 'aiHistory' && Array.isArray(parsed)) {
          data[k] = parsed.slice(-120);
          return;
        }
        data[k] = parsed;
      } catch(e) {
        console.warn('[Backup] Error processing key:', k, e.message);
      }
    });
    
    // Đảm bảo settings luôn có
    if (!data.settings) data.settings = this.getSettings();

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storeName: this.getSettings().storeName,
      data,
    };
  },

  restoreFromBackup(backup) {
    if(!backup || !backup.data) throw new Error('File backup không hợp lệ');
    Object.entries(backup.data).forEach(([k, v]) => {
      if(KEYS[k]) localStorage.setItem(KEYS[k], JSON.stringify(v));
    });
  },

  // Lưu backup vào localStorage (lưu tối đa 2 bản, tránh đầy bộ nhớ)
  saveLocalBackup() {
    let snapshot = this.getFullBackup({ includePhotos: false });
    const backups = this.get(KEYS.backups) || [];
    const label = new Date(snapshot.exportedAt).toLocaleString('vi-VN', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });

    const trySaveSnapshot = (snap) => {
      localStorage.setItem('gkhl_backup_latest', JSON.stringify(snap));
      return true;
    };

    const buildCompactSnapshot = (maxHistory, maxAi) => {
      const full = this.getFullBackup({ includePhotos: false });
      if(Array.isArray(full?.data?.history)) {
        full.data.history = full.data.history.slice(0, Math.max(0, maxHistory));
      }
      if(Array.isArray(full?.data?.aiHistory)) {
        full.data.aiHistory = full.data.aiHistory.slice(-Math.max(0, maxAi));
      }
      return full;
    };

    try {
      trySaveSnapshot(snapshot);
    } catch(e) {
      // Nếu đầy dung lượng, dọn metadata backup cũ và thử lại.
      try {
        localStorage.removeItem(KEYS.backups);
        localStorage.removeItem(KEYS.lastBackup);
        trySaveSnapshot(snapshot);
      } catch(e2) {
        // Tiếp tục giảm dung lượng snapshot để cố lưu local backup.
        const compactLevels = [
          { history: 120, ai: 80 },
          { history: 60, ai: 40 },
          { history: 20, ai: 20 },
          { history: 0, ai: 0 },
        ];
        let saved = false;
        for(const lv of compactLevels) {
          try {
            snapshot = buildCompactSnapshot(lv.history, lv.ai);
            trySaveSnapshot(snapshot);
            saved = true;
            break;
          } catch(_) {}
        }
        if(!saved) {
          console.warn('Backup failed due to quota exceeded', e2);
          return null;
        }
      }
    }

    const size = JSON.stringify(snapshot).length;
    backups.unshift({ date: snapshot.exportedAt, label, size });
    // Trim trước khi lưu
    while(backups.length > 2) backups.pop();
    try { this.set(KEYS.backups, backups); } catch(_) {}
    try { localStorage.setItem(KEYS.lastBackup, new Date().toISOString()); } catch(_) {}
    return snapshot;
  },

  getLocalBackups() { return this.get(KEYS.backups) || []; },
  getLastBackupTime() { return localStorage.getItem(KEYS.lastBackup); },

  // Xóa backup theo index trong danh sách backups
  deleteLocalBackup(index) {
    const backups = this.get(KEYS.backups) || [];
    if (index < 0 || index >= backups.length) return false;
    backups.splice(index, 1);
    this.set(KEYS.backups, backups);
    // Nếu xóa backup đầu tiên (latest), cũng xóa key snapshot
    if (index === 0 && backups.length === 0) {
      localStorage.removeItem('gkhl_backup_latest');
    }
    return true;
  },

  // Auto backup - chạy 1 lần mỗi ngày
  autoBackupIfNeeded() {
    const settings = this.getSettings();
    if(!settings.autoBackup) return false;
    const last = this.getLastBackupTime();
    if(!last) { this.saveLocalBackup(); return true; }
    const diff = (Date.now() - new Date(last)) / 3600000; // hours
    if(diff >= 24) { this.saveLocalBackup(); return true; }
    return false;
  },

  // DEDUCT inventory when order is paid
  // Logic:
  //  - Nếu đơn vị công thức (ing.unit) = đơn vị tồn (stock.unit) → trừ thẳng
  //  - Nếu khác đơn vị + có quy đổi (unitConversions) → trừ theo tỉ lệ quy đổi
  //  - Nếu khác đơn vị + không có quy đổi → KHÔNG trừ (tránh sai lệch)
  deductInventory(items) {
    const menu = this.getMenu();
    const inv = this.getInventory();
    const conversions = this.getUnitConversions();

    items.forEach(item => {
      const dish = menu.find(m => m.id === item.id);
      if (!dish) return;

      if (dish.itemType === ITEM_TYPES.RETAIL) {
        const stock = inv.find(i => i.id === dish.linkedInventoryId) || inv.find(i => _slugVi(i.name) === _slugVi(dish.name));
        if (stock) stock.qty = Math.max(0, stock.qty - item.qty);
        return;
      }

      if (!Array.isArray(dish.ingredients)) return;

      dish.ingredients.forEach(ing => {
        const stock = inv.find(i => i.name === ing.name);
        if (!stock) return;

        // Đơn vị công thức (ing.unit) — fallback về đơn vị tồn kho
        const ingUnit = ing.unit || stock.unit;

        // Cùng đơn vị → trừ thẳng
        if (!ingUnit || ingUnit === stock.unit) {
          stock.qty = Math.max(0, stock.qty - ing.qty * item.qty);
          return;
        }

        // Khác đơn vị → tìm quy đổi
        const conv = conversions.find(c =>
          c.ingredientName === ing.name &&
          c.recipeUnit === ingUnit &&
          c.purchaseUnit === stock.unit
        );

        if (conv && Number(conv.recipeQty) > 0) {
          // recipeQty phần = purchaseQty đơn vị mua
          // Cần (ing.qty * item.qty) phần → tốn bao nhiêu đơn vị mua?
          const stockQtyUsed = (ing.qty * item.qty) * (Number(conv.purchaseQty) / Number(conv.recipeQty));
          stock.qty = Math.max(0, stock.qty - stockQtyUsed);
        }
        // Không có quy đổi → bỏ qua, KHÔNG trừ
      });
    });
    this.setInventory(inv);
  },

  // SUPPLIERS (NCC - Nhà cung cấp)
  getSuppliers() { return this.get(KEYS.suppliers) || []; },
  setSuppliers(arr) { this.set(KEYS.suppliers, arr); },
  addSupplier(s) {
    const list = this.getSuppliers();
    list.unshift(s);
    this.set(KEYS.suppliers, list);
  },
  updateSupplier(id, data) {
    const list = this.getSuppliers();
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...data }; this.set(KEYS.suppliers, list); }
  },
  deleteSupplier(id) {
    const list = this.getSuppliers().filter(s => s.id !== id);
    this.set(KEYS.suppliers, list);
  },

  getItemMergeRequests() { return this.get(KEYS.itemMergeRequests) || []; },
  setItemMergeRequests(arr) { this.set(KEYS.itemMergeRequests, arr || []); },

  // UNIT CONVERSIONS (Quy đổi đơn vị: đơn vị mua → đơn vị công thức)
  // Structure: { id, ingredientName, purchaseUnit, purchaseQty, recipeUnit, recipeQty, note }
  // Example: 1 trái bắp = 4 phần bắp (recipeUnit)
  getUnitConversions() { return this.get(KEYS.unitConversions) || []; },
  setUnitConversions(arr) { this.set(KEYS.unitConversions, arr); },
  addUnitConversion(conv) {
    const list = this.getUnitConversions();
    // Remove duplicate if same ingredientName + recipeUnit
    const filtered = list.filter(c => !(c.ingredientName === conv.ingredientName && c.recipeUnit === conv.recipeUnit));
    filtered.unshift(conv);
    this.set(KEYS.unitConversions, filtered);
  },
  deleteUnitConversion(id) {
    const list = this.getUnitConversions().filter(c => c.id !== id);
    this.set(KEYS.unitConversions, list);
  },
};

// Utility functions
const fmt = n => {
  if(n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if(n >= 1000) return (n/1000).toFixed(0) + 'K';
  return n.toLocaleString('vi-VN');
};
const fmtFull = n => n.toLocaleString('vi-VN') + 'đ';
const fmtDate = d => {
  const dt = new Date(d);
  return dt.toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'});
};
const fmtTime = d => new Date(d).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
const fmtDateTime = d => `${fmtDate(d)} ${fmtTime(d)}`;
const today = () => new Date().toISOString().split('T')[0];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

function getPeriodDateRange(period, opts) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if(period === 'today') {
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return { start, end };
  }

  if(period === 'day' && opts && opts.date) {
    const target = new Date(opts.date);
    if(Number.isNaN(target.getTime())) return null;
    target.setHours(0,0,0,0);
    const targetEnd = new Date(target);
    targetEnd.setHours(23,59,59,999);
    return { start: target, end: targetEnd };
  }

  if(period === 'range' && opts && opts.fromDate && opts.toDate) {
    const from = new Date(opts.fromDate);
    const to = new Date(opts.toDate);
    if(Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    from.setHours(0,0,0,0);
    to.setHours(23,59,59,999);
    return { start: from, end: to };
  }

  if(period === 'week') {
    start.setDate(start.getDate() - 6);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return { start, end };
  }

  if(period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthStart.setHours(0,0,0,0);
    monthEnd.setHours(23,59,59,999);
    return { start: monthStart, end: monthEnd };
  }

  return null;
}

function isDateInPeriod(value, period, opts) {
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return false;
  const range = getPeriodDateRange(period, opts);
  if(!range) return true;
  return date >= range.start && date <= range.end;
}

function isCompletedHistoryOrder(order) {
  const status = String(order?.status || '').trim().toLowerCase();
  if (!status) return !order?.cancelledAt && !order?.cancelReason;
  return status === 'completed' || status === 'closed';
}

// Filter history by period
// period: 'today'|'day'|'week'|'month'|'all'|'range'
// opts: { date: 'YYYY-MM-DD', fromDate: 'YYYY-MM-DD', toDate: 'YYYY-MM-DD' }
function filterHistory(period, opts) {
  // Ưu tiên lịch sử từ Cloud (appState), fallback về LocalStorage
  const h = (window.appState && window.appState.history && window.appState.history.length > 0)
    ? window.appState.history
    : Store.getHistory();

  return h.filter(o => isCompletedHistoryOrder(o) && isDateInPeriod(o.paidAt, period, opts));
}


// Filter expenses by period (same logic)
function filterExpenses(period, opts) {
  // Ưu tiên chi phí từ Cloud (appState), fallback về LocalStorage
  const expenses = (window.appState && window.appState.expenses && window.appState.expenses.length > 0)
    ? window.appState.expenses
    : Store.getExpenses();
  return expenses.filter(e => isDateInPeriod(e.date, period, opts));
}

function filterPurchases(period, opts) {
  const purchases = (window.appState && window.appState.purchases && window.appState.purchases.length > 0)
    ? window.appState.purchases
    : Store.getPurchases();
  return purchases.filter(p => isDateInPeriod(p.date, period, opts));
}

function _computeOrderCost(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const lineCost = items.reduce((sum, item) => sum + (Number(item.cost || 0) * Number(item.qty || 0)), 0);
  if (lineCost > 0) return lineCost;
  return Number(order?.cost || 0);
}

function normalizePositiveAmount(value) {
  const amount = Number(value) || 0;
  return amount > 0 ? amount : 0;
}

// Revenue summary
function getRevenueSummary(period, opts) {
  const orders = filterHistory(period, opts);
  
  // Tổng tiền khách thực trả (bao gồm VAT)
  const totalPaid = orders.reduce((s,o) => s + o.total, 0);
  
  const revenueBank = orders.filter(o => o.payMethod === 'bank').reduce((s,o) => s + o.total, 0);
  const revenueCash = orders.filter(o => o.payMethod !== 'bank').reduce((s,o) => s + o.total, 0);
  
  // Doanh thu gộp (chưa trừ chiết khấu, không gồm VAT/Ship)
  const grossSales = orders.reduce((s,o) => s + (o.items || []).reduce((sum, i) => sum + i.price * i.qty, 0), 0);
  
  const discountTotal = orders.reduce((s,o) => s + (o.discount || 0), 0);
  const shippingTotal = orders.reduce((s,o) => s + (o.shipping || 0), 0);
  const vatTotal = orders.reduce((s,o) => s + (o.vatAmount || 0), 0);
  
  // Doanh thu thuần (Net Sales) = Doanh thu gộp - Chiết khấu
  const netSales = grossSales - discountTotal;
  
  // Giá vốn hàng bán (COGS)
  const cost = orders.reduce((s,o) => s + _computeOrderCost(o), 0);
  
  // Lợi nhuận gộp (Gross Profit) = Doanh thu thuần - COGS
  const gross = netSales - cost;
  
  const expenses = filterExpenses(period, opts).filter(e =>
    !(
      String(e.category || '').toLowerCase() === 'nhập hàng' ||
      /^nhập hàng:/i.test(String(e.name || ''))
    )
  );
  const expenseTotal = expenses.reduce((s,e) => s + normalizePositiveAmount(e.amount), 0);
  
  // Tính tổng purchase cho biểu đồ "Chi phí" (bao gồm expense + purchase)
  const purchases = filterPurchases(period, opts);
  const purchaseTotal = purchases.reduce((s,p) => s + normalizePositiveAmount(p.price), 0);
  const totalExpenseAndPurchase = expenseTotal + purchaseTotal;

  // Lợi nhuận ròng (Net Profit) = Lợi nhuận gộp - OPEX
  const profit = gross - expenseTotal;
  
  return { 
    revenue: totalPaid, // Vẫn giữ `revenue` là tổng tiền cho tương thích UI cũ (nếu cần)
    netSales,
    grossSales,
    cost, 
    gross, 
    expenseTotal: totalExpenseAndPurchase, // Trả ra tổng chi phí + nhập hàng cho fin-expense
    operatingExpenseTotal: expenseTotal,
    purchaseTotal,
    cashOutTotal: totalExpenseAndPurchase,
    profit, 
    orders: orders.length, 
    revenueBank, 
    revenueCash, 
    discountTotal, 
    shippingTotal, 
    vatTotal 
  };
}

function _normalizeTopMetricArgs(optsOrLimit, maybeLimit) {
  if(typeof optsOrLimit === 'number' || typeof optsOrLimit === 'undefined') {
    return { opts: undefined, limit: optsOrLimit || 10 };
  }
  return { opts: optsOrLimit, limit: maybeLimit || 10 };
}

// Top selling items
function getTopItems(period, optsOrLimit, maybeLimit) {
  const { opts, limit } = _normalizeTopMetricArgs(optsOrLimit, maybeLimit);
  const orders = filterHistory(period, opts);
  const map = {};
  orders.forEach(o => {
    (o.items||[]).forEach(item => {
      if(!map[item.name]) map[item.name] = { name:item.name, qty:0, revenue:0 };
      map[item.name].qty += item.qty;
      map[item.name].revenue += item.price * item.qty;
    });
  });
  return Object.values(map).sort((a,b) => b.qty - a.qty).slice(0, limit || 10);
}

function _resolveHistoryItemUnitCost(item, menu, inventory) {
  const direct = Number(item?.cost || 0);
  if (direct > 0) return direct;
  const dish = (menu || []).find(m => m.id === item?.id)
    || (menu || []).find(m => _slugVi(m.name) === _slugVi(item?.name));
  if (!dish) return 0;
  if (dish.itemType === ITEM_TYPES.RETAIL) {
    const linked = (inventory || []).find(i => i.id === dish.linkedInventoryId)
      || (inventory || []).find(i => _slugVi(i.name) === _slugVi(dish.name));
    return Number(linked?.costPerUnit || dish?.cost || 0);
  }
  if (Array.isArray(dish.ingredients) && dish.ingredients.length > 0) {
    return dish.ingredients.reduce((sum, ing) => {
      const stock = (inventory || []).find(i => _slugVi(i.name) === _slugVi(ing.name));
      return sum + Number(stock?.costPerUnit || 0) * Number(ing.qty || 0);
    }, 0);
  }
  return Number(dish.cost || 0);
}

// Most profitable items
function getTopProfitableItems(period, optsOrLimit, maybeLimit) {
  const { opts, limit } = _normalizeTopMetricArgs(optsOrLimit, maybeLimit);
  const orders = filterHistory(period, opts);
  const menu = Store.getMenu().filter(item => !item.hidden);
  const inventory = Store.getInventory();
  const map = {};
  orders.forEach(o => {
    (o.items||[]).forEach(item => {
      if(!map[item.name]) map[item.name] = { name:item.name, qty:0, revenue:0, cost:0 };
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const unitCost = _resolveHistoryItemUnitCost(item, menu, inventory);
      map[item.name].qty += qty;
      map[item.name].revenue += price * qty;
      map[item.name].cost += unitCost * qty;
    });
  });
  return Object.values(map)
    .map(i => ({ ...i, profit: i.revenue - i.cost }))
    .sort((a,b) => b.profit - a.profit)
    .slice(0, limit || 10);
}

// Revenue by day (last N days)
function getRevenueByDay(days) {
  // Cloud-first with LocalStorage fallback
  const h = (window.appState && window.appState.history && window.appState.history.length > 0)
    ? window.appState.history
    : Store.getHistory();
  const result = [];
  for(let i = days-1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const dayOrders = h.filter(o => isCompletedHistoryOrder(o) && new Date(o.paidAt).toDateString() === ds);
    result.push({
      date: d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}),
      revenue: dayOrders.reduce((s,o) => s + o.total, 0),
      orders: dayOrders.length,
    });
  }
  return result;
}

// Inventory alerts
function getInventoryAlerts() {
  const inv = Store.getInventory().filter(i => !i.hidden);
  const critical = inv.filter(i => i.qty <= i.minQty * 0.5);
  const low = inv.filter(i => i.qty > i.minQty * 0.5 && i.qty <= i.minQty);
  return { critical, low };
}

// Forecast purchase needs (based on 7-day avg consumption)
function getForecastNeeds(days) {
  const h = Store.getHistory();
  const menu = Store.getMenu();
  const inv = Store.getInventory();
  const now = new Date();

  // Compute total consumed per ingredient in last 7 days
  const consumed = {};
  h.filter(o => (now - new Date(o.paidAt)) / 86400000 <= 7).forEach(o => {
    (o.items||[]).forEach(item => {
      const dish = menu.find(m => m.id === item.id);
      if(!dish) return;
      dish.ingredients.forEach(ing => {
        consumed[ing.name] = (consumed[ing.name]||0) + ing.qty * item.qty;
      });
    });
  });

  const avgDays = 7;
  const forecastDays = days || 3;
  const needs = [];
  inv.filter(i => !i.hidden).forEach(stock => {
    const cons = consumed[stock.name] || 0;
    const dailyAvg = cons / avgDays;
    const projected = dailyAvg * forecastDays;
    const need = projected - stock.qty;
    if(need > 0 || stock.qty <= stock.minQty) {
      needs.push({
        name: stock.name,
        currentQty: stock.qty,
        unit: stock.unit,
        dailyAvg: dailyAvg.toFixed(2),
        projected,
        need: Math.max(0, need),
        urgent: stock.qty <= stock.minQty,
      });
    }
  });
  return needs.sort((a,b) => b.urgent - a.urgent || b.need - a.need);
}

// AI Marketing suggestions
function getMarketingInsights() {
  const summary = getRevenueSummary('week');
  const top = getTopItems('week', 3);
  const alerts = getInventoryAlerts();
  const insights = [];

  // Revenue alert
  const todaySummary = getRevenueSummary('today');
  if(todaySummary.revenue < 500000) {
    insights.push({
      type:'warning',
      icon:'📉',
      title:'Doanh thu hôm nay thấp',
      body:`Doanh thu hôm nay chỉ ${fmtFull(todaySummary.revenue)}. Hãy đẩy mạnh quảng cáo hoặc tổ chức chương trình khuyến mãi buổi tối.`,
      actions:['Tạo combo mới','Gửi ưu đãi'],
    });
  }

  // Top items promotion
  if(top.length > 0) {
    insights.push({
      type:'success',
      icon:'🔥',
      title:`Món bán chạy: ${top[0]?.name || ''}`,
      body:`Tuần này bán được ${top[0]?.qty || 0} phần. Hãy nổi bật món này trên mạng xã hội để tăng thêm doanh số.`,
      actions:['Đăng Facebook','Tạo story'],
    });
  }

  // Inventory alert
  if(alerts.critical.length > 0) {
    insights.push({
      type:'danger',
      icon:'⚠️',
      title:`${alerts.critical.length} nguyên liệu sắp hết`,
      body:`${alerts.critical.map(i=>i.name).slice(0,3).join(', ')} cần nhập gấp trước khi ảnh hưởng đến phục vụ.`,
      actions:['Xem tồn kho','Nhập hàng ngay'],
    });
  }

  // Weekend suggestion
  const dow = new Date().getDay();
  if(dow === 5 || dow === 6) {
    insights.push({
      type:'info',
      icon:'🎉',
      title:'Cuối tuần – Thời điểm vàng!',
      body:'Doanh thu cuối tuần thường cao hơn 40%. Đảm bảo đủ nguyên liệu và nhân sự. Cân nhắc mở thêm combo đặc biệt cuối tuần.',
      actions:['Tạo combo CK','Check tồn kho'],
    });
  }

  // Gross margin alert
  if(summary.revenue > 0 && summary.gross / summary.revenue < 0.3) {
    insights.push({
      type:'warning',
      icon:'💰',
      title:'Lãi gộp thấp tuần này',
      body:`Lãi gộp chỉ đạt ${((summary.gross/summary.revenue)*100).toFixed(0)}%. Kiểm tra lại giá nhập hoặc điều chỉnh giá bán để cải thiện biên lợi nhuận.`,
      actions:['Xem chi phí','Điều chỉnh giá'],
    });
  }

  if(insights.length === 0) {
    insights.push({
      type:'success', icon:'✅',
      title:'Kinh doanh ổn định!',
      body:'Mọi chỉ số đều trong mức tốt. Tiếp tục duy trì và hãy đặt mục tiêu tăng trưởng 10% tháng tới.',
      actions:['Xem báo cáo'],
    });
  }
  return insights;
}

// ============================================================
// PHOTODB - LƯU TRỮ HÌNH ẢNH BẰNG INDEXEDDB
// Giúp giảm tải localStorage (giới hạn 5MB)
// ============================================================
const PhotoDB = {
  db: null,
  init() {
    return new Promise((resolve) => {
      const req = indexedDB.open('gkhl_photos_db', 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore('photos');
      };
      req.onsuccess = e => { this.db = e.target.result; resolve(true); };
      req.onerror = () => resolve(false);
    });
  },
  async get(key) {
    if(!this.db) await this.init();
    if(!this.db) return null;
    return new Promise(resolve => {
      try {
        const req = this.db.transaction('photos', 'readonly').objectStore('photos').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  },
  async set(key, val) {
    if(!this.db) await this.init();
    if(!this.db) return false;
    return new Promise(resolve => {
      try {
        const req = this.db.transaction('photos', 'readwrite').objectStore('photos').put(val, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch { resolve(false); }
    });
  },
  async remove(key) {
    if(!this.db) await this.init();
    if(!this.db) return false;
    return new Promise(resolve => {
      try {
        const req = this.db.transaction('photos', 'readwrite').objectStore('photos').delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch { resolve(false); }
    });
  }
};

// ============================================================
// HÀM MIGRATION: Chuyển ảnh từ localStorage sang IndexedDB
// Chạy 1 lần lúc bật app để khắc phục lỗi "Quota Exceeded"
// ============================================================
async function migratePhotosToIndexedDB() {
  await PhotoDB.init();

  // 1. Move Purchase Photos
  const purPhotosRaw = localStorage.getItem(KEYS.purchasePhotos);
  if (purPhotosRaw) {
    try {
      const purMap = JSON.parse(purPhotosRaw);
      await PhotoDB.set(KEYS.purchasePhotos, purMap);
      localStorage.removeItem(KEYS.purchasePhotos);
      console.log('[Migration] Chuyển đổi thành công Purchase Photos sang IndexedDB');
    } catch(e) { console.warn('[Migration] Lỗi chuyển Purchase Photos', e); }
  }

  // 2. Move Order Photos (Active)
  const ordPhotosRaw = localStorage.getItem(KEYS.orderPhotos);
  if (ordPhotosRaw) {
    try {
      const ordMap = JSON.parse(ordPhotosRaw);
      await PhotoDB.set(KEYS.orderPhotos, ordMap);
      localStorage.removeItem(KEYS.orderPhotos);
      console.log('[Migration] Chuyển đổi thành công Order Photos sang IndexedDB');
    } catch(e) { console.warn('[Migration] Lỗi chuyển Order Photos', e); }
  }

  // 3. Move History Photos (Tách base64 ra khỏi Object history để nhẹ localStorage)
  const historyRaw = localStorage.getItem(KEYS.history);
  if (historyRaw) {
    try {
      let history = JSON.parse(historyRaw);
      let historyChanged = false;

      // Quét từng đơn trong thẻ history
      for (let i = 0; i < history.length; i++) {
        const o = history[i];
        if (o.photos && o.photos.length > 0) {
          // Lưu vào PhotoDB
          await PhotoDB.set('history_' + o.historyId, o.photos);
          // Xóa photos dataUrl khỏi đối tượng gốc, chừa lại format trống hoặc null
          o.photos = []; 
          historyChanged = true;
        }
      }

      if (historyChanged) {
        localStorage.setItem(KEYS.history, JSON.stringify(history));
        console.log('[Migration] Chuyển đổi thành công History Photos sang IndexedDB và dọn dẹp localStorage');
      }
    } catch(e) { console.warn('[Migration] Lỗi chuyển History Photos', e); }
  }
}
