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
};

const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // MENU
  getMenu() { return this.get(KEYS.menu) || DEFAULT_MENU; },
  setMenu(m) { this.set(KEYS.menu, m); },

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

  // INVENTORY
  getInventory() { return this.get(KEYS.inventory) || DEFAULT_INVENTORY; },
  setInventory(inv) { this.set(KEYS.inventory, inv); },

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
  addExpense(e) {
    const exp = this.getExpenses();
    exp.unshift(e);
    this.set(KEYS.expenses, exp);
  },

  // PURCHASES
  getPurchases() { return this.get(KEYS.purchases) || []; },
  addPurchase(p) {
    const pur = this.getPurchases();
    pur.unshift(p);
    this.set(KEYS.purchases, pur);
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
      storeName: 'Gánh Khô Chữa Lành',
      storeAddress: '',
      storePhone: '0937707900',
      storeSlogan: 'Ăn là nhớ, nhớ là ghiền!',
      bankName: 'Vietinbank',
      bankAccount: '0937707900',
      bankOwner: 'Gánh Khô Chữa Lành',
      autoBackup: true,
      storageQuotaMb: 500,
      ocrMode: 'auto',
      photoRetentionDays: 0,
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
      const raw = localStorage.getItem(storageKey);
      if(!raw) return;
      try {
        const parsed = JSON.parse(raw);
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
        // Skip keys that aren't valid JSON (e.g. raw ISO strings)
        console.warn('[Backup] Skipped key:', k, e.message);
      }
    });
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
  deductInventory(items) {
    const menu = this.getMenu();
    const inv = this.getInventory();
    items.forEach(item => {
      const dish = menu.find(m => m.id === item.id);
      if(!dish) return;
      dish.ingredients.forEach(ing => {
        const stock = inv.find(i => i.name === ing.name);
        if(stock) {
          stock.qty = Math.max(0, stock.qty - ing.qty * item.qty);
        }
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

// Filter history by period
// period: 'today'|'day'|'week'|'month'|'all'|'range'
// opts: { date: 'YYYY-MM-DD', fromDate: 'YYYY-MM-DD', toDate: 'YYYY-MM-DD' }
function filterHistory(period, opts) {
  const h = Store.getHistory();
  const now = new Date();
  return h.filter(o => {
    const d = new Date(o.paidAt);
    if(period === 'today') return d.toDateString() === now.toDateString();
    if(period === 'day' && opts && opts.date) {
      const target = new Date(opts.date);
      return d.toDateString() === target.toDateString();
    }
    if(period === 'range' && opts && opts.fromDate && opts.toDate) {
      const from = new Date(opts.fromDate); from.setHours(0,0,0,0);
      const to = new Date(opts.toDate); to.setHours(23,59,59,999);
      return d >= from && d <= to;
    }
    if(period === 'week') { const diff = (now - d) / 86400000; return diff <= 7; }
    if(period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

// Filter expenses by period (same logic)
function filterExpenses(period, opts) {
  const expenses = Store.getExpenses();
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    if(period === 'today') return d.toDateString() === now.toDateString();
    if(period === 'day' && opts && opts.date) {
      const target = new Date(opts.date);
      return d.toDateString() === target.toDateString();
    }
    if(period === 'range' && opts && opts.fromDate && opts.toDate) {
      const from = new Date(opts.fromDate); from.setHours(0,0,0,0);
      const to = new Date(opts.toDate); to.setHours(23,59,59,999);
      return d >= from && d <= to;
    }
    if(period === 'week') return (now - d) / 86400000 <= 7;
    if(period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

// Revenue summary
function getRevenueSummary(period, opts) {
  const orders = filterHistory(period, opts);
  const revenue = orders.reduce((s,o) => s + o.total, 0);
  const revenueBank = orders.filter(o => o.payMethod === 'bank').reduce((s,o) => s + o.total, 0);
  const revenueCash = orders.filter(o => o.payMethod !== 'bank').reduce((s,o) => s + o.total, 0);
  const cost = orders.reduce((s,o) => s + (o.cost || 0), 0);
  const gross = revenue - cost;
  const discountTotal = orders.reduce((s,o) => s + (o.discount || 0), 0);
  const shippingTotal = orders.reduce((s,o) => s + (o.shipping || 0), 0);
  const vatTotal = orders.reduce((s,o) => s + (o.vatAmount || 0), 0);
  const expenses = filterExpenses(period, opts);
  const expenseTotal = expenses.reduce((s,e) => s + e.amount, 0);
  const profit = gross - expenseTotal;
  return { revenue, cost, gross, expenseTotal, profit, orders: orders.length, revenueBank, revenueCash, discountTotal, shippingTotal, vatTotal };
}

// Top selling items
function getTopItems(period, limit) {
  const orders = filterHistory(period);
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

// Revenue by day (last N days)
function getRevenueByDay(days) {
  const h = Store.getHistory();
  const result = [];
  for(let i = days-1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const dayOrders = h.filter(o => new Date(o.paidAt).toDateString() === ds);
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
  const inv = Store.getInventory();
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
  inv.forEach(stock => {
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
