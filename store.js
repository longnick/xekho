// ============================================================
// STORE.JS - State Management & localStorage
// ============================================================

const KEYS = {
  menu: 'gkhl_menu',
  inventory: 'gkhl_inventory',
  tables: 'gkhl_tables',
  orders: 'gkhl_orders',
  history: 'gkhl_history',
  expenses: 'gkhl_expenses',
  purchases: 'gkhl_purchases',
  settings: 'gkhl_settings',
  backups: 'gkhl_backups',
  lastBackup: 'gkhl_last_backup',
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

  // SETTINGS
  getSettings() {
    return this.get(KEYS.settings) || {
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
    };
  },
  setSettings(s) { this.set(KEYS.settings, s); },

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
  getFullBackup() {
    // Chỉ backup dữ liệu kinh doanh, bỏ qua các key meta
    const SKIP_KEYS = new Set(['backups', 'lastBackup']);
    const data = {};
    Object.entries(KEYS).forEach(([k, storageKey]) => {
      if(SKIP_KEYS.has(k)) return;
      const raw = localStorage.getItem(storageKey);
      if(!raw) return;
      try {
        data[k] = JSON.parse(raw);
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

  // Lưu backup vào localStorage (lưu tối đa 7 bản)
  saveLocalBackup() {
    const snapshot = this.getFullBackup();
    const backups = this.get(KEYS.backups) || [];
    const label = new Date(snapshot.exportedAt).toLocaleString('vi-VN', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
    backups.unshift({ date: snapshot.exportedAt, label, size: JSON.stringify(snapshot).length });
    // Trim trước khi lưu
    while(backups.length > 7) backups.pop();
    this.set(KEYS.backups, backups);
    localStorage.setItem('gkhl_backup_latest', JSON.stringify(snapshot));
    localStorage.setItem(KEYS.lastBackup, new Date().toISOString());
    return snapshot;
  },

  getLocalBackups() { return this.get(KEYS.backups) || []; },
  getLastBackupTime() { return localStorage.getItem(KEYS.lastBackup); },

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
function filterHistory(period) {
  const h = Store.getHistory();
  const now = new Date();
  return h.filter(o => {
    const d = new Date(o.paidAt);
    if(period === 'today') return d.toDateString() === now.toDateString();
    if(period === 'week') { const diff = (now - d) / 86400000; return diff <= 7; }
    if(period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

// Revenue summary
function getRevenueSummary(period) {
  const orders = filterHistory(period);
  const revenue = orders.reduce((s,o) => s + o.total, 0);
  const cost = orders.reduce((s,o) => s + (o.cost || 0), 0);
  const gross = revenue - cost;
  const expenses = Store.getExpenses().filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    if(period === 'today') return d.toDateString() === now.toDateString();
    if(period === 'week') return (now - d) / 86400000 <= 7;
    if(period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
  const expenseTotal = expenses.reduce((s,e) => s + e.amount, 0);
  const profit = gross - expenseTotal;
  return { revenue, cost, gross, expenseTotal, profit, orders: orders.length };
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
