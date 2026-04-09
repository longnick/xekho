// ============================================================
// APP.JS - Main Application Controller
// ============================================================

// ---- Global State ----
let currentPage = 'tables';
let currentTable = null;
let orderItems = {};  // tableId -> [{id,name,price,qty,cost}]
let orderExtras = {}; // tableId -> {discount, shipping}
let chartInstances = {};

// Photos & OCR state
let orderPhotoCache = null;           // lazy: Store.getOrderPhotos()
let currentPurchasePhotos = [];       // ảnh chứng từ cho lần nhập hàng đang mở
let currentPurchasePhotosBatchId = null; // id "lần nhập/chứng từ" để gom ảnh
let currentPurchaseOcrMode = null;    // 'auto' | 'offline' | 'online' (override settings)
let tesseractWorker = null;           // Tesseract.js worker (offline OCR)
const ORDER_HISTORY_PHOTO_RETENTION_DAYS = 3; // giữ ảnh order trong lịch sử 3 ngày

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  applyStoreSettings();
  runMigrations(); // Patch data spelling differences
  cleanupOldPurchasePhotos(); // dọn ảnh nhập hàng cũ theo cấu hình
  cleanupOldOrderHistoryPhotos(); // dọn ảnh order trong lịch sử sau 3 ngày
  navigate('tables');
  updateAlertBadge();
  // Auto backup mỗi ngày
  setTimeout(() => {
    if(Store.autoBackupIfNeeded()) {
      console.log('[POS] Auto backup done');
    }
  }, 3000);
  // Cập nhật label chế độ OCR nhập hàng
  try { updatePurOcrModeLabel(); } catch(_) {}
  // Auto export report theo tuần/tháng (và upload Google Drive nếu bật)
  setTimeout(() => {
    try {
      autoExportReportsIfNeeded();
    } catch(_) {}
  }, 4500);
});

function toggleReportExportDate() {
  const sel = document.getElementById('set-reportExportPeriod');
  const wrap = document.getElementById('report-export-date-wrap');
  if(!sel || !wrap) return;
  wrap.style.display = sel.value === 'day' ? '' : 'none';
}

function toggleWeeklyDriveCheckbox() {
  const weeklyEl = document.getElementById('set-autoExportWeekly');
  const driveEl = document.getElementById('set-autoPushWeeklyReportToGoogleDrive');
  if(!weeklyEl || !driveEl) return;
  if(!weeklyEl.checked) {
    driveEl.checked = false;
    driveEl.disabled = true;
  } else {
    driveEl.disabled = false;
  }
}

function getGoogleDriveConfigFromUi() {
  const urlEl = document.getElementById('set-googleDriveUploadUrl');
  const folderEl = document.getElementById('set-googleDriveFolderId');
  const s = Store.getSettings();
  const uploadUrl = (urlEl && urlEl.value.trim()) || s.googleDriveUploadUrl || '';
  const folderId = (folderEl && folderEl.value.trim()) || s.googleDriveFolderId || '';
  return { uploadUrl, folderId };
}

function openGoogleDriveReportGuide() {
  document.getElementById('gdrive-report-guide-modal')?.classList.add('active');
}

/** Đẩy lên Drive đúng file .xlsx như lúc xuất (theo loại/kỳ trên form), không tải xuống máy. */
async function pushReportExcelToGoogleDriveManual() {
  const { uploadUrl, folderId } = getGoogleDriveConfigFromUi();
  if(!uploadUrl || !folderId) {
    showToast('Vui lòng nhập URL Web App và ID thư mục Google Drive (mục Cài đặt).', 'warning');
    return;
  }
  await exportReportExcel({
    skipLocalDownload: true,
    uploadToDrive: true,
  });
}

// Chạy một lần lúc load để tự động sửa lỗi chính tả dữ liệu cũ mà không làm mất trạng thái của người dùng
function runMigrations() {
  const s = Store.getSettings();
  if (s.migratedV2) return; // Prevent multiple runs just in case, or run once

  const patchKeys = {
    'Khô cá thiều tâm': 'Khô cá thiều',
    'Khô cá đuôi': 'Khô cá đuối',
    'Lạp xít': 'Lạp vịt',
    'Cá sun sin': 'Cá sụn xịn',
    'Lá dói': 'Lá dổi'
  };

  const patchMap = (name) => patchKeys[name] || name;

  // Patch inventory
  let mappedInv = false;
  const inv = Store.getInventory();
  inv.forEach(i => {
    if (patchKeys[i.name]) { mappedInv = true; i.name = patchKeys[i.name]; }
  });
  
  // Thêm nguyên liệu mới (Tôm 1 nắng)
  if (!inv.find(i => i.name === 'Tôm 1 nắng')) {
    mappedInv = true;
    inv.push({ id:'i42', name:'Tôm 1 nắng', qty:10, unit:'phần', minQty:2, costPerUnit:100000 });
  }
  if (mappedInv) Store.setInventory(inv);

  // Patch menu & ingredients
  let mappedMenu = false;
  const menu = Store.getMenu();
  menu.forEach(m => {
    if (m.name === 'Khô cá chỉ vàng') { mappedMenu = true; m.name = 'Cá chỉ vàng nướng'; }
    else if (m.name === 'Khô cá thiều tâm') { mappedMenu = true; m.name = 'Khô cá thiều nướng'; }
    else if (m.name === 'Khô cá đuôi') { mappedMenu = true; m.name = 'Khô cá đuối nướng'; }
    else if (m.name === 'Lạp xít') { mappedMenu = true; m.name = 'Lạp vịt nướng'; }
    else if (m.name === 'Khô cá bống') { mappedMenu = true; m.name = 'Khô cá bống nướng'; }
    else if (m.name === 'Khô cá đao') { mappedMenu = true; m.name = 'Khô cá đao nướng'; }
    else if (m.name === 'Khô cá bò') { mappedMenu = true; m.name = 'Khô cá bò Nướng'; }
    else if (m.name === 'Mực khô') { mappedMenu = true; m.name = 'Mực khô nướng'; }
    else if (m.name === 'Cá sun sin chiên giòn') { mappedMenu = true; m.name = 'Cá sụn xịn chiên giòn'; }
    else if (m.name === 'Ba chỉ nướng lá dói') { mappedMenu = true; m.name = 'Ba chỉ nướng lá dổi'; }
    else if (m.name === 'Trứng bắc thảo củ kiệu tôm khô') { mappedMenu = true; m.name = 'Trứng bắc thảo tôm khô'; }
    else if (m.name === 'Khoai tây lắc phô mai') { mappedMenu = true; m.name = 'Khoai tây chiên lắc phô mai'; }

    m.ingredients.forEach(ig => {
      if (patchKeys[ig.name]) {
        mappedMenu = true;
        ig.name = patchKeys[ig.name];
      }
    });
  });
  
  if (!menu.find(m => m.name === 'Tôm 1 nắng nướng muối ớt')) {
    mappedMenu = true;
    menu.push({ id: 'm38', name: 'Tôm 1 nắng nướng muối ớt', category: 'Đặc Biệt', price: 180000, unit: 'phần', cost: 110000, ingredients: [{name:'Tôm 1 nắng',qty:1,unit:'phần'},{name:'Muối ớt',qty:1,unit:'gói'}] });
  }
  
  if (mappedMenu) Store.setMenu(menu);

  s.migratedV2 = true;
  Store.setSettings(s);
}

function applyStoreSettings() {
  const s = Store.getSettings();
  // Update PAYMENT_INFO từ settings
  if(s.bankAccount) PAYMENT_INFO.account = s.bankAccount;
  if(s.bankName)    PAYMENT_INFO.bank    = s.bankName;
  if(s.bankOwner)   PAYMENT_INFO.name    = s.bankOwner;
  // Cập nhật tiêu đề header
  const logoText = document.querySelector('.logo-text');
  if(logoText) logoText.textContent = s.storeName || 'Gánh Khô Chữa Lành';
  
  const logoIcon = document.querySelector('.logo-icon');
  if(logoIcon) {
    if(s.storeLogo) {
      logoIcon.innerHTML = `<img src="${s.storeLogo}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
      logoIcon.style.background = 'transparent';
    } else {
      logoIcon.innerHTML = '🍢';
      logoIcon.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
    }
  }
}

// Dọn ảnh nhập hàng cũ theo photoRetentionDays
function cleanupOldPurchasePhotos() {
  try {
    const s = Store.getSettings();
    const days = Number(s.photoRetentionDays || 0);
    if(!days || isNaN(days) || days <= 0) return;
    const map = Store.getPurchasePhotos();
    if(!map || typeof map !== 'object') return;
    const now = Date.now();
    const maxAgeMs = days * 86400000;
    let changed = false;
    Object.keys(map).forEach(pid => {
      const entry = map[pid];
      const list = Array.isArray(entry) ? entry : (entry && Array.isArray(entry.photos) ? entry.photos : []);
      if(!Array.isArray(list)) return;
      const filtered = list.filter(ph => {
        if(!ph || !ph.takenAt) return false;
        const t = new Date(ph.takenAt).getTime();
        if(!t || isNaN(t)) return false;
        return (now - t) <= maxAgeMs;
      });
      if(filtered.length !== list.length) {
        changed = true;
        if(filtered.length) {
          if(Array.isArray(entry)) map[pid] = filtered;
          else map[pid] = { ...(entry || {}), photos: filtered };
        } else {
          delete map[pid];
        }
      }
    });
    if(changed) Store.setPurchasePhotos(map);
  } catch(e) {
    console.warn('cleanupOldPurchasePhotos error', e);
  }
}

function cleanupOldOrderHistoryPhotos() {
  try {
    const history = Store.getHistory();
    if(!Array.isArray(history) || !history.length) return;
    const now = Date.now();
    const maxAgeMs = ORDER_HISTORY_PHOTO_RETENTION_DAYS * 86400000;
    let changed = false;

    const nextHistory = history.map(order => {
      const list = Array.isArray(order?.photos) ? order.photos : [];
      if(!list.length) return order;

      const filtered = list.filter(ph => {
        if(!ph || !ph.takenAt) return false;
        const t = new Date(ph.takenAt).getTime();
        if(!t || Number.isNaN(t)) return false;
        return (now - t) <= maxAgeMs;
      });

      if(filtered.length === list.length) return order;
      changed = true;
      return { ...order, photos: filtered };
    });

    if(changed) Store.set('gkhl_history', nextHistory);
  } catch(e) {
    console.warn('cleanupOldOrderHistoryPhotos error', e);
  }
}

// ---- Navigation ----
function initNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  renderPage(page);
}

function renderPage(page) {
  switch(page) {
    case 'tables':   renderTables(); break;
    case 'orders':   renderOrderPage(); break;
    case 'inventory':renderInventory(); break;
    case 'finance':  renderFinance(); break;
    case 'reports':  renderReports(); break;
    case 'insights': renderInsights(); break;
    case 'menu':     renderMenuAdmin(); break;
    case 'settings': renderSettings(); break;
  }
}

function updateAlertBadge() {
  const alerts = getInventoryAlerts();
  const total = alerts.critical.length + alerts.low.length;
  const badge = document.getElementById('alert-badge');
  if(badge) { badge.textContent = total; badge.style.display = total ? '' : 'none'; }
  const headerBtn = document.getElementById('header-alert-btn');
  if(headerBtn) headerBtn.classList.toggle('alert-dot', total > 0);
}

function openStockAlertPopup() {
  const { critical, low } = getInventoryAlerts();
  const total = critical.length + low.length;
  if(total === 0) { showToast('✅ Tồn kho ổn định, không có cảnh báo!', 'success'); return; }
  
  let html = '';
  
  if (critical.length > 0) {
    html += `
      <div class="alert-card danger" style="margin-bottom:8px; cursor:pointer;" onclick="document.getElementById('stock-alert-critical-list').style.display = document.getElementById('stock-alert-critical-list').style.display === 'none' ? 'flex' : 'none'">
        <div class="alert-icon">🚨</div>
        <div class="alert-content">
          <div class="alert-title">Hàng cần nhập gấp (${critical.length})</div>
          <div class="alert-desc">Nhấn để xem/ẩn chi tiết</div>
        </div>
      </div>
      <div id="stock-alert-critical-list" style="display:none; flex-direction:column; gap:8px; margin-bottom:16px; padding-left:12px; border-left:2px solid var(--danger)">
        ${critical.map(i => `<div class="stock-alert-item danger">
          <div class="stock-alert-info">
            <div class="stock-alert-name">${i.name}</div>
            <div class="stock-alert-detail">Còn lại: <b>${i.qty}</b> ${i.unit} | Tối thiểu: ${i.minQty} ${i.unit}</div>
          </div>
          <button class="btn btn-xs btn-danger" onclick="quickAddStockFromAlert('${i.id}')">Nhập</button>
        </div>`).join('')}
      </div>
    `;
  }

  if (low.length > 0) {
    html += `
      <div class="alert-card warning" style="margin-bottom:8px; cursor:pointer;" onclick="document.getElementById('stock-alert-low-list').style.display = document.getElementById('stock-alert-low-list').style.display === 'none' ? 'flex' : 'none'">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <div class="alert-title">Hàng sắp hết (${low.length})</div>
          <div class="alert-desc">Nhấn để xem/ẩn chi tiết</div>
        </div>
      </div>
      <div id="stock-alert-low-list" style="display:none; flex-direction:column; gap:8px; margin-bottom:16px; padding-left:12px; border-left:2px solid var(--warning)">
        ${low.map(i => `<div class="stock-alert-item warning">
          <div class="stock-alert-info">
            <div class="stock-alert-name">${i.name}</div>
            <div class="stock-alert-detail">Còn lại: <b>${i.qty}</b> ${i.unit} | Tối thiểu: ${i.minQty} ${i.unit}</div>
          </div>
          <button class="btn btn-xs btn-warning" onclick="quickAddStockFromAlert('${i.id}')">Nhập</button>
        </div>`).join('')}
      </div>
    `;
  }
  
  html += `
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-primary" style="flex:1" onclick="document.getElementById('stock-alert-modal').classList.remove('active');navigate('inventory');switchInvTab('purchase',document.querySelector('.tab-btn:nth-child(2)'))">
          🚚 Nhập hàng đầy đủ
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('stock-alert-modal').classList.remove('active')">❌ Đóng</button>
      </div>
  `;

  document.getElementById('stock-alert-count').textContent = `${critical.length} cần nhập gấp, ${low.length} sắp hết`;
  document.getElementById('stock-alert-body').innerHTML = html;
  
  // By default, expand the critical one if it exists
  if (critical.length > 0) {
    document.getElementById('stock-alert-critical-list').style.display = 'flex';
  } else if (low.length > 0) {
    document.getElementById('stock-alert-low-list').style.display = 'flex';
  }
  
  document.getElementById('stock-alert-modal').classList.add('active');
}

function quickAddStockFromAlert(invId) {
  const inv = Store.getInventory();
  const item = inv.find(i => i.id === invId);
  if(!item) return;
  const amt = parseFloat(prompt(`Nhập thêm bao nhiêu ${item.unit} cho "${item.name}"?`, '10'));
  if(isNaN(amt) || amt <= 0) return;
  item.qty += amt;
  Store.setInventory(inv);
  Store.addPurchase({ id:uid(), name:item.name, qty:amt, unit:item.unit, price:item.costPerUnit*amt, costPerUnit:item.costPerUnit, date:new Date().toISOString(), supplier:'Nhập thủ công' });
  updateAlertBadge();
  openStockAlertPopup(); // Refresh popup
  showToast(`✅ Đã nhập thêm ${amt} ${item.unit} ${item.name}`);
}

// ============================================================
// PAGE: TABLES
// ============================================================
function renderTables() {
  const tables = Store.getTables();
  const orders = Store.getOrders();
  const grid = document.getElementById('table-grid');
  const now = Date.now();

  // Count stats
  const occupied = tables.filter(t => t.status === 'occupied').length;
  const empty = tables.filter(t => t.status === 'empty').length;
  document.getElementById('tables-occupied').textContent = occupied;
  document.getElementById('tables-empty').textContent = empty;

  // Today revenue quick
  const todayRev = getRevenueSummary('today');
  document.getElementById('today-revenue').textContent = fmt(todayRev.revenue) + 'đ';
  document.getElementById('today-orders').textContent = todayRev.orders;

  // Takeaway order
  const takeawayOrder = orders['takeaway'];
  const takeawayTotal = takeawayOrder ? takeawayOrder.reduce((s,i) => s+i.price*i.qty, 0) : 0;
  const takeawayHtml = `<div class="table-card takeaway ${takeawayOrder && takeawayOrder.length > 0 ? 'occupied' : 'empty'}" onclick="openTakeaway()" id="table-card-takeaway" style="grid-column:1/-1;aspect-ratio:auto;padding:12px;flex-direction:row;justify-content:flex-start;gap:12px">
    <div style="font-size:28px">🛍️</div>
    <div style="flex:1;text-align:left">
      <div style="font-size:13px;font-weight:800">Khách mang về</div>
      <div style="font-size:11px;color:var(--text2)">Takeaway</div>
    </div>
    ${takeawayTotal > 0 ? `<div style="font-size:14px;font-weight:800;color:var(--primary)">${fmt(takeawayTotal)}đ</div>` : '<div style="font-size:11px;color:var(--text3)">Trống</div>'}
  </div>`;

  grid.innerHTML = takeawayHtml + tables.map(t => {
    const order = orders[t.id];
    const total = order ? order.reduce((s,i) => s+i.price*i.qty, 0) : 0;
    const elapsed = t.openTime ? Math.floor((now - t.openTime)/60000) : 0;
    const statusClass = t.status;
    const statusEmoji = t.status === 'empty' ? '🟢' : t.status === 'occupied' ? '🔴' : '🟡';

    return `<div class="table-card ${statusClass}" onclick="openTable(${t.id})" id="table-card-${t.id}">
      ${elapsed > 0 ? `<div class="table-time">${elapsed}p</div>` : ''}
      <div class="table-num">${t.id}</div>
      <div class="table-icon">${statusEmoji}</div>
      ${total > 0 ? `<div class="table-amount">${fmt(total)}đ</div>` : `<div class="table-status">${t.status === 'empty' ? 'Trống' : 'Đang phục vụ'}</div>`}
    </div>`;
  }).join('');
}

function openTakeaway() {
  currentTable = 'takeaway';
  const orders = Store.getOrders();
  if(!orderItems['takeaway']) {
    orderItems['takeaway'] = orders['takeaway'] ? [...orders['takeaway']] : [];
  }
  document.getElementById('order-table-title').textContent = '🛍️ Mang về';
  navigate('orders');
}

function openTable(tableId) {
  // Coerce to number so table lookup/status updates work
  const tid = (tableId === 'takeaway') ? 'takeaway' : Number(tableId);
  currentTable = (tid === 'takeaway') ? 'takeaway' : (isNaN(tid) ? tableId : tid);
  const tables = Store.getTables();
  const table = tables.find(t => t.id === currentTable);

  // Load existing order
  const orders = Store.getOrders();
  if(!orderItems[currentTable]) {
    orderItems[currentTable] = orders[currentTable] ? [...orders[currentTable]] : [];
  }

  document.getElementById('order-table-title').textContent = `Bàn ${currentTable}`;
  navigate('orders');
}

// Lưu order cho một bàn cụ thể (dùng cho AI actions)
function saveOrderForTable(tableId) {
  const tid = (tableId === 'takeaway') ? 'takeaway' : Number(tableId);
  const key = (tid === 'takeaway') ? 'takeaway' : (isNaN(tid) ? String(tableId) : tid);
  const orders = Store.getOrders();
  orders[key] = orderItems[key] || [];
  Store.setOrders(orders);

  if(key === 'takeaway') return;

  const tables = Store.getTables();
  const table = tables.find(t => t.id === key);
  if(table) {
    const hasItems = (orderItems[key] || []).length > 0;
    if(hasItems && table.status === 'empty') {
      table.status = 'occupied';
      table.openTime = Date.now();
    } else if(!hasItems) {
      table.status = 'empty';
      table.openTime = null;
    }
    Store.setTables(tables);
  }
}

// ============================================================
// PAGE: ORDERS
// ============================================================
let currentCat = CATEGORIES[0];
let menuSearch = '';

function renderOrderPage() {
  if(!currentTable) { navigate('tables'); return; }
  renderCatTabs();
  renderMenuItems();
  renderCart();
  // Khi mở trang order, đồng bộ UI ảnh bàn
  try { updateOrderPhotoUI(); } catch(_) {}
}

function renderCatTabs() {
  const wrap = document.getElementById('cat-tabs');
  wrap.innerHTML = ['Tất cả', ...CATEGORIES].map(c =>
    `<button class="cat-tab ${currentCat === c ? 'active' : ''}" onclick="selectCat('${c}')">${c}</button>`
  ).join('');
}

function selectCat(cat) {
  currentCat = cat;
  renderCatTabs();
  renderMenuItems();
}

function renderMenuItems() {
  const menu = Store.getMenu();
  const items = orderItems[currentTable] || [];
  let filtered = currentCat === 'Tất cả' ? menu : menu.filter(m => m.category === currentCat);
  if(menuSearch) filtered = filtered.filter(m => m.name.toLowerCase().includes(menuSearch.toLowerCase()));

  document.getElementById('menu-grid').innerHTML = filtered.map(m => {
    const inOrder = items.find(i => i.id === m.id);
    return `<div class="menu-item ${inOrder ? 'in-order' : ''}" onclick="addToOrder('${m.id}')">
      ${inOrder ? `<div class="menu-item-qty">${inOrder.qty}</div>` : ''}
      <div class="menu-item-name">${m.name}</div>
      <div class="menu-item-price">${fmt(m.price)}đ</div>
    </div>`;
  }).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🍽️</div><div class="empty-text">Không có món</div></div>`;
}

function addToOrder(itemId) {
  const menu = Store.getMenu();
  const dish = menu.find(m => m.id === itemId);
  if(!dish) return;
  if(!orderItems[currentTable]) orderItems[currentTable] = [];
  const existing = orderItems[currentTable].find(i => i.id === itemId);
  if(existing) { existing.qty++; }
  else { orderItems[currentTable].push({ id: dish.id, name: dish.name, price: dish.price, cost: dish.cost||0, qty:1 }); }
  saveOrder();
  renderMenuItems();
  renderCart();
  // haptic
  if(navigator.vibrate) navigator.vibrate(30);
}

function removeCartItem(itemId) {
  const items = orderItems[currentTable];
  if(!items) return;
  const idx = items.findIndex(i => i.id === itemId);
  if(idx < 0) return;
  items.splice(idx, 1);
  saveOrder();
  renderMenuItems();
  renderCart();
}

function changeQty(itemId, delta) {
  const items = orderItems[currentTable];
  if(!items) return;
  const idx = items.findIndex(i => i.id === itemId);
  if(idx < 0) return;
  items[idx].qty += delta;
  if(items[idx].qty <= 0) items.splice(idx, 1);
  saveOrder();
  renderMenuItems();
  renderCart();
}

function setCartQty(itemId, val) {
  const qty = parseInt(val);
  if(isNaN(qty) || qty <= 0) { renderCart(); return; }
  const items = orderItems[currentTable];
  if(!items) return;
  const idx = items.findIndex(i => i.id === itemId);
  if(idx < 0) return;
  items[idx].qty = qty;
  saveOrder();
  renderMenuItems();
  renderCart();
}

function saveOrder() {
  const orders = Store.getOrders();
  orders[currentTable] = orderItems[currentTable] || [];
  Store.setOrders(orders);

  // Update table status
  const tables = Store.getTables();
  const table = tables.find(t => t.id === currentTable);
  if(table) {
    const hasItems = (orderItems[currentTable]||[]).length > 0;
    if(hasItems && table.status === 'empty') {
      table.status = 'occupied';
      table.openTime = Date.now();
    } else if(!hasItems) {
      table.status = 'empty';
      table.openTime = null;
    }
    Store.setTables(tables);
  }
}

function renderCart() {
  const items = orderItems[currentTable] || [];
  const extras = orderExtras[currentTable] || {discount: 0, shipping: 0};
  
  const dInp = document.getElementById('cart-discount');
  const dNoteInp = document.getElementById('cart-discount-note');
  const sInp = document.getElementById('cart-shipping');
  const noteInp = document.getElementById('cart-note');
  
  if (dInp && document.activeElement === dInp) extras.discount = parseFloat(dInp.value) || 0;
  else if (dInp) dInp.value = extras.discount || '';

  if (dNoteInp && document.activeElement === dNoteInp) extras.discountNote = dNoteInp.value || '';
  else if (dNoteInp) dNoteInp.value = extras.discountNote || '';

  if (sInp && document.activeElement === sInp) extras.shipping = parseFloat(sInp.value) || 0;
  else if (sInp) sInp.value = extras.shipping || '';

  if (noteInp && document.activeElement === noteInp) extras.note = noteInp.value || '';
  else if (noteInp) noteInp.value = extras.note || '';

  orderExtras[currentTable] = extras;

  // Tính tổng có VAT
  const taxRate = (() => { try { const s = Store.getSettings(); return s.taxRate != null ? Number(s.taxRate) : 0; } catch(_) { return 0; } })();
  const itemsTotal = items.reduce((s,i) => s + i.price*i.qty, 0);
  const subtotal = Math.max(0, itemsTotal - extras.discount + extras.shipping);
  const vatAmount = taxRate > 0 ? Math.round(subtotal * taxRate / 100) : 0;
  const total = subtotal + vatAmount;

  if(items.length === 0) {
    document.getElementById('cart-items').innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:32px">🛒</div><div class="empty-text">Chưa có món</div></div>`;
  } else {
    document.getElementById('cart-items').innerHTML = items.map(item =>
      `<div class="cart-item">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <input type="number" class="cart-qty-input" min="1" max="99" value="${item.qty}"
            onchange="setCartQty('${item.id}', this.value)"
            onclick="this.select()" style="width:38px;text-align:center;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text);font-size:14px;font-weight:700;padding:2px 4px">
          <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
        </div>
        <div style="display:flex; align-items:center; gap:6px">
          <div class="cart-price">${fmt(item.price*item.qty)}đ</div>
          <button class="qty-btn" style="color:var(--danger); background:rgba(255,61,113,0.1); width:28px;" onclick="removeCartItem('${item.id}')">✕</button>
        </div>
      </div>`
    ).join('');
  }

  // Hiển thị VAT trong tổng nếu có
  const totalEl = document.getElementById('cart-total');
  if(totalEl) {
    if(vatAmount > 0) {
      totalEl.innerHTML = `${fmtFull(total)} <span style="font-size:10px;color:var(--text3);font-weight:400">(gồm VAT ${taxRate}%: ${fmtFull(vatAmount)})</span>`;
    } else {
      totalEl.textContent = fmtFull(total);
    }
  }
  document.getElementById('pay-btn').disabled = items.length === 0;

  // Cập nhật UI ảnh bàn (nếu đang ở đúng trang)
  try {
    updateOrderPhotoUI();
  } catch(_) {}
}

function openBillModal() {
  const items = orderItems[currentTable] || [];
  if(items.length === 0) return;
  const extras = orderExtras[currentTable] || {discount: 0, shipping: 0};
  const s = Store.getSettings();
  const taxRate = s.taxRate != null ? Number(s.taxRate) : 0;
  const itemsTotal = items.reduce((s,i) => s + i.price*i.qty, 0);
  const subtotal = Math.max(0, itemsTotal - extras.discount + extras.shipping);
  const vatAmount = taxRate > 0 ? Math.round(subtotal * taxRate / 100) : 0;
  const total = subtotal + vatAmount;
  // Dynamically calculate cost based on current inventory
  const inv = Store.getInventory();
  const menu = Store.getMenu();
  let cost = 0;
  items.forEach(item => {
    const dish = menu.find(m => m.id === item.id);
    let dishCost = dish?.cost || 0;
    if (dish && dish.ingredients && dish.ingredients.length > 0) {
      let calcCost = 0;
      dish.ingredients.forEach(ing => {
        const stock = inv.find(i => i.name === ing.name);
        if (stock) calcCost += stock.costPerUnit * ing.qty;
      });
      dishCost = calcCost;
    }
    cost += dishCost * item.qty;
  });
  const now = new Date();
  const billNo = `B${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${uid().slice(0,4).toUpperCase()}`;

  const tableLabel = currentTable === 'takeaway' ? '🛍️ Mang về' : `Bàn ${currentTable}`;
  const desc = `Thanh toan ${currentTable === 'takeaway' ? 'Mang ve' : 'Ban ' + currentTable} - ${billNo}`;
  const bank = s.bankAccount || PAYMENT_INFO.account;
  const bankBin = s.bankName === 'Vietinbank' ? '970415' : '970415';
  const qrUrl = `https://img.vietqr.io/image/${bankBin}-${bank}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent(s.bankOwner||PAYMENT_INFO.name)}`;

  // Store bill data for payment confirmation (include VAT)
  window._pendingBill = { billNo, total, cost, extras, tableLabel, vatAmount, taxRate };

  // Lấy ảnh của bàn (tối đa 5 ảnh) để in kèm bill
  let orderPhotosHtml = '';
  try {
    if(!orderPhotoCache) orderPhotoCache = Store.getOrderPhotos();
    const list = (orderPhotoCache && currentTable && orderPhotoCache[currentTable]) ? orderPhotoCache[currentTable] : [];
    const limited = Array.isArray(list) ? list.slice(0, 5) : [];
    if(limited.length) {
      orderPhotosHtml = `
      <div class="bill-photo-page">
        <h3 style="font-size:14px;margin:12px 0 6px;">📷 Ảnh ghi nhận bàn</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${limited.map(ph => `
            <div style="flex:1 1 calc(50% - 8px);max-width:calc(50% - 8px);">
              <div style="font-size:9px;color:#666;margin-bottom:2px;">${ph.takenAt ? fmtDateTime(ph.takenAt) : ''}</div>
              <img src="${ph.dataUrl}" alt="Ảnh bàn" style="width:100%;max-height:220px;object-fit:cover;border-radius:6px;border:1px solid #ddd;">
            </div>
          `).join('')}
        </div>
      </div>`;
    }
  } catch(_) {}

  document.getElementById('bill-content').innerHTML = `
    <div class="bill-container" id="bill-print-area">
      <div class="bill-header">
        <div class="bill-logo">🍢 ${s.storeName||'Gánh Khô Chữa Lành'}</div>
        ${s.storeSlogan ? `<div class="bill-sub">${s.storeSlogan}</div>` : ''}
        ${s.storePhone ? `<div class="bill-sub" style="margin-top:4px">ĐT: ${s.storePhone}</div>` : ''}
        ${s.storeAddress ? `<div class="bill-sub">${s.storeAddress}</div>` : ''}
      </div>
      <hr class="bill-divider">
      <div class="bill-info">
        <div>Bill: <span>${billNo}</span></div>
        <div>${currentTable === 'takeaway' ? '🛍️' : '🪑'} <span>${tableLabel}</span></div>
        <div>Thời gian: <span>${fmtDateTime(now)}</span></div>
      </div>
      <hr class="bill-divider">
      <table class="bill-items">
        <thead><tr><th>Món</th><th style="text-align:center">SL</th><th style="text-align:right">Đ.Giá</th><th style="text-align:right">T.Tiền</th></tr></thead>
        <tbody>${items.map(i=>`<tr>
          <td>${i.name}</td><td style="text-align:center">${i.qty}</td>
          <td style="text-align:right">${fmt(i.price)}</td>
          <td class="amount">${fmt(i.price*i.qty)}</td></tr>`).join('')}
        </tbody>
      </table>
      <hr class="bill-divider">
      ${extras.note ? `<div style="font-size:12px;margin-bottom:8px"><em>Ghi chú: ${extras.note}</em></div>` : ''}
      <div style="font-size:12px;margin-bottom:4px;color:var(--text3);display:flex;justify-content:space-between"><span>Tiền hàng</span><span>${fmtFull(itemsTotal)}</span></div>
      ${extras.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>📉 Giảm giá ${extras.discountNote ? `(${extras.discountNote})` : ''}</span><span>-${fmtFull(extras.discount)}</span></div>` : ''}
      ${extras.shipping > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>🛵 Phí giao hàng</span><span>+${fmtFull(extras.shipping)}</span></div>` : ''}
      ${vatAmount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:var(--primary)"><span>💹 Thuế VAT (${taxRate}%)</span><span>+${fmtFull(vatAmount)}</span></div>` : ''}
      <div class="bill-total"><span>TỔNG CỘNG</span><span>${fmtFull(total)}</span></div>
      ${vatAmount > 0 ? `<div style="font-size:10px;color:var(--text3);text-align:right;margin-top:-4px">Đã bao gồm VAT ${taxRate}%: ${fmtFull(vatAmount)}</div>` : ''}
      <div class="bill-qr">
        <div class="bill-qr-label">Quét QR để thanh toán chuyển khoản</div>
        <img src="${qrUrl}" alt="QR Thanh toán" onerror="this.style.display='none'" style="width:200px;height:200px;object-fit:contain;margin:8px auto;display:block">
        <div class="bill-qr-bank">${s.bankName||'Vietinbank'} – ${bank}</div>
        <div class="bill-qr-amount">${fmtFull(total)}</div>
      </div>
      <hr class="bill-divider">
      <div class="bill-thanks">Cảm ơn quý khách! Hẹn gặp lại 🙏</div>
    </div>
    ${orderPhotosHtml}
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-secondary" style="flex:1" onclick="printBill()">🖨️ In bill</button>
      <button class="btn btn-success" style="flex:1" onclick="openPaymentMethodModal()">✅ Thanh toán</button>
    </div>`;

  document.getElementById('bill-modal').classList.add('active');
}

function openPaymentMethodModal() {
  if(!window._pendingBill) return;
  document.getElementById('pay-method-modal').classList.add('active');
}

function confirmPaymentMethod(method) {
  document.getElementById('pay-method-modal').classList.remove('active');
  const { billNo, total, cost, extras, vatAmount, taxRate } = window._pendingBill;
  confirmPayment(billNo, total, cost, extras, method, vatAmount, taxRate);
}

function closeBillModal() {
  document.getElementById('bill-modal').classList.remove('active');
}

function printBill() {
  // Đợi QR image load xong rồi mới in
  const qrImg = document.querySelector('#bill-print-area img');
  if(qrImg && !qrImg.complete) {
    qrImg.onload  = () => window.print();
    qrImg.onerror = () => window.print(); // In dù không có QR
    // Timeout fallback 3 giây
    setTimeout(() => window.print(), 3000);
  } else {
    window.print();
  }
}

function confirmPayment(billNo, total, cost, extras, payMethod, vatAmount, taxRate) {
  const items = orderItems[currentTable] || [];
  const tableLabel = currentTable === 'takeaway' ? '🛍️ Mang về' : `Bàn ${currentTable}`;

  // Attach order photos for this bill (then clear them from bàn)
  let orderPhotosForBill = [];
  try {
    if(orderPhotoCache == null) orderPhotoCache = Store.getOrderPhotos();
    const list = orderPhotoCache && orderPhotoCache[currentTable] ? orderPhotoCache[currentTable] : [];
    if(Array.isArray(list) && list.length) {
      orderPhotosForBill = list.map(p => ({ id:p.id, dataUrl:p.dataUrl, takenAt:p.takenAt || null }));
      delete orderPhotoCache[currentTable];
      Store.setOrderPhotos(orderPhotoCache);
    }
  } catch(_) {}

  // Save to history
  const historyId = uid();
  Store.addHistory({
    historyId,
    id: billNo,
    tableId: currentTable,
    tableName: tableLabel,
    note: extras?.note || '',
    items: items.map(i => ({...i})),
    total,
    cost,
    discount: extras?.discount || 0,
    discountNote: extras?.discountNote || '',
    shipping: extras?.shipping || 0,
    vatAmount: vatAmount || 0,
    taxRate: taxRate || 0,
    payMethod: payMethod || 'cash',
    paidAt: new Date().toISOString(),
    photos: orderPhotosForBill,
  });

  // Deduct inventory
  Store.deductInventory(items);

  // Clear table
  delete orderItems[currentTable];
  delete orderExtras[currentTable];
  const orders = Store.getOrders();
  delete orders[currentTable];
  Store.setOrders(orders);

  // Only reset table status for real tables
  if(currentTable !== 'takeaway') {
    const tables = Store.getTables();
    const table = tables.find(t => t.id === currentTable);
    if(table) { table.status = 'empty'; table.openTime = null; }
    Store.setTables(tables);
  }

  closeBillModal();
  updateAlertBadge();
  const methodLabel = payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
  showToast(`✅ Thanh toán ${methodLabel} thành công!`, 'success');
  currentTable = null;
  navigate('tables');
}

// ============================================================
// PAGE: INVENTORY
// ============================================================
let invTab = 'stock'; // stock | purchase | forecast

function renderInventory() {
  if(invTab === 'stock') renderStockList();
  else if(invTab === 'purchase') renderPurchaseList();
  else if(invTab === 'ledger') renderLedger();
  else if(invTab === 'ncc') renderNCC();
  else renderForecast();
}

// ============================================================
// ORDER PHOTOS (per table)
// ============================================================

function ensureOrderPhotoCache() {
  if(!orderPhotoCache) {
    orderPhotoCache = Store.getOrderPhotos() || {};
  }
}

function triggerOrderPhotoCapture() {
  const input = document.getElementById('order-photo-input-cam');
  if(input) input.click();
}

function triggerOrderPhotoFromDevice() {
  const input = document.getElementById('order-photo-input-file');
  if(input) input.click();
}

async function handleOrderPhotoCapture(event) {
  const files = event.target.files;
  if(!files || !files.length || !currentTable) {
    if(event.target) event.target.value = '';
    return;
  }
  try {
    ensureOrderPhotoCache();
    let list = orderPhotoCache[currentTable] || [];
    if(list.length >= 5) {
      showToast('⚠️ Mỗi bàn chỉ lưu tối đa 5 ảnh.', 'danger');
      event.target.value = '';
      return;
    }
    let added = 0;
    for(let i = 0; i < files.length; i++) {
      if(list.length >= 5) break;
      const file = files[i];
      if(!file || !String(file.type || '').startsWith('image/')) continue;
      const dataUrl = await resizeImageToDataUrl(file, 1080, 0.6);
      const photo = {
        id: uid(),
        tableId: currentTable,
        dataUrl,
        takenAt: new Date().toISOString(),
      };
      list.push(photo);
      added++;
    }
    orderPhotoCache[currentTable] = list;
    Store.setOrderPhotos(orderPhotoCache);
    updateOrderPhotoUI();
    if(added > 0) {
      showToast(added > 1 ? `📷 Đã thêm ${added} ảnh cho bàn ${currentTable}` : `📷 Đã lưu ảnh cho bàn ${currentTable}`);
    } else {
      showToast('⚠️ Không có file ảnh hợp lệ.', 'warning');
    }
    if(files.length > added && list.length >= 5) {
      showToast('⚠️ Đã đủ 5 ảnh/bàn — bỏ qua phần còn lại.', 'warning');
    }
  } catch(e) {
    console.warn('handleOrderPhotoCapture error', e);
    showToast('❌ Không xử lý được ảnh. Thử lại.', 'danger');
  } finally {
    if(event.target) event.target.value = '';
  }
}

function updateOrderPhotoUI() {
  try {
    if(!currentTable) return;
    const wrap = document.getElementById('order-photo-thumbs');
    const countEl = document.getElementById('order-photo-count');
    const btnCam = document.getElementById('order-photo-btn');
    const btnFile = document.getElementById('order-photo-btn-file');
    if(!wrap || !countEl) return;
    ensureOrderPhotoCache();
    const list = orderPhotoCache[currentTable] || [];
    const limited = list.slice(0, 5);
    countEl.textContent = `(${limited.length}/5)`;
    const full = limited.length >= 5;
    if(btnCam) btnCam.disabled = full;
    if(btnFile) btnFile.disabled = full;
    if(!limited.length) {
      wrap.innerHTML = '<div style="font-size:11px;color:var(--text3);">Chưa có ảnh nào.</div>';
      return;
    }
    wrap.innerHTML = limited.map(ph => `
      <div style="position:relative;flex:0 0 auto;width:60px;height:60px;border-radius:6px;overflow:hidden;border:1px solid var(--border);">
        <img src="${ph.dataUrl}" alt="Ảnh bàn" style="width:100%;height:100%;object-fit:cover;">
      </div>
    `).join('');
  } catch(e) {
    console.warn('updateOrderPhotoUI error', e);
  }
}

// ============================================================
// PURCHASE PHOTOS + HYBRID OCR
// ============================================================

function triggerPurchasePhotoCapture() {
  const input = document.getElementById('pur-photo-input-cam');
  if(input) input.click();
}

function triggerPurchasePhotoFromDevice() {
  const input = document.getElementById('pur-photo-input-file');
  if(input) input.click();
}

async function handlePurchasePhotoCapture(event) {
  const files = event.target.files;
  if(!files || !files.length) {
    if(event.target) event.target.value = '';
    return;
  }
  try {
    if(!currentPurchasePhotosBatchId) {
      currentPurchasePhotosBatchId = uid(); // Gom tất cả ảnh theo "lần nhập/chứng từ" trong phiên modal
    }
    let added = 0;
    for(let i = 0; i < files.length; i++) {
      const file = files[i];
      if(!file || !String(file.type || '').startsWith('image/')) continue;
      const dataUrl = await resizeImageToDataUrl(file, 1280, 0.7);
      const photo = {
        id: uid(),
        dataUrl,
        takenAt: new Date().toISOString(),
      };
      currentPurchasePhotos.push(photo);
      added++;
    }
    if(added === 0) {
      showToast('⚠️ Không có file ảnh hợp lệ.', 'warning');
      return;
    }
    renderPurchasePhotoThumbs();
    const last = currentPurchasePhotos[currentPurchasePhotos.length - 1];
    setPurchasePhotoViewer(last);
    setPurOcrStatus(added > 1
      ? `📷 Đã thêm ${added} ảnh chứng từ. Có thể bấm "🧾 Quét" để đọc dữ liệu.`
      : '📷 Đã thêm ảnh chứng từ. Có thể bấm "🧾 Quét" để đọc dữ liệu.');
  } catch(e) {
    console.warn('handlePurchasePhotoCapture error', e);
    showToast('❌ Không xử lý được ảnh chứng từ.', 'danger');
  } finally {
    if(event.target) event.target.value = '';
  }
}

function renderPurchasePhotoThumbs() {
  const wrap = document.getElementById('pur-photo-thumbs');
  if(!wrap) return;
  if(!currentPurchasePhotos.length) {
    wrap.innerHTML = '<div style="font-size:11px;color:var(--text3);">Chưa có ảnh chứng từ.</div>';
    const viewer = document.getElementById('pur-photo-viewer');
    if(viewer) viewer.style.display = 'none';
    return;
  }
  wrap.innerHTML = currentPurchasePhotos.map(ph => `
    <div style="position:relative;flex:0 0 auto;width:72px;height:72px;border-radius:6px;overflow:hidden;border:1px solid var(--border);cursor:pointer;"
         onclick="setPurchasePhotoViewerById('${ph.id}')">
      <img src="${ph.dataUrl}" alt="Chứng từ" style="width:100%;height:100%;object-fit:cover;">
    </div>
  `).join('');
}

function setPurchasePhotoViewerById(id) {
  const ph = currentPurchasePhotos.find(p => p.id === id);
  if(ph) setPurchasePhotoViewer(ph);
}

function setPurchasePhotoViewer(photo) {
  const box = document.getElementById('pur-photo-viewer');
  const img = document.getElementById('pur-photo-viewer-img');
  if(!box || !img || !photo) return;
  img.src = photo.dataUrl;
  box.style.display = 'block';
}

function persistCurrentPurchasePhotosBatch() {
  if(!currentPurchasePhotosBatchId) return;
  if(!currentPurchasePhotos || !currentPurchasePhotos.length) return;
  try {
    const map = Store.getPurchasePhotos() || {};
    const batchId = currentPurchasePhotosBatchId;
    const existing = map[batchId];

    const entry = (existing && existing.photos && Array.isArray(existing.photos))
      ? existing
      : { batchId, createdAt: (existing && existing.createdAt) || new Date().toISOString(), photos: [] };

    const photoById = new Map((entry.photos || []).map(p => [p.id, p]));
    currentPurchasePhotos.forEach(p => {
      if(!photoById.has(p.id)) entry.photos.push(p);
    });
    entry.photos = entry.photos || [];
    map[batchId] = entry;
    Store.setPurchasePhotos(map);
  } catch(e) {
    console.warn('persistCurrentPurchasePhotosBatch error', e);
    showToast('⚠️ Lưu ảnh bị lỗi (có thể đầy dung lượng).', 'danger');
  }
}

function getEffectiveOcrMode() {
  if(currentPurchaseOcrMode) return currentPurchaseOcrMode;
  const s = Store.getSettings();
  return s.ocrMode || 'auto';
}

function updatePurOcrModeLabel() {
  const el = document.getElementById('pur-ocr-mode-label');
  if(!el) return;
  const mode = getEffectiveOcrMode();
  let text = 'OCR: Tự động';
  if(mode === 'offline') text = 'OCR: Offline (on-device)';
  else if(mode === 'online') text = 'OCR: Online (Gemini)';
  el.textContent = text;
}

function togglePurchaseOcrMode() {
  const current = getEffectiveOcrMode();
  const next = current === 'auto' ? 'offline' : current === 'offline' ? 'online' : 'auto';
  currentPurchaseOcrMode = next;
  updatePurOcrModeLabel();
}

function setPurOcrStatus(msg) {
  const el = document.getElementById('pur-ocr-status');
  if(el) el.innerHTML = msg || '';
}

async function runPurchaseOcrFromLatestPhoto() {
  if(!currentPurchasePhotos.length) {
    showToast('⚠️ Chưa có ảnh chứng từ để quét.', 'warning');
    return;
  }
  const photo = currentPurchasePhotos[currentPurchasePhotos.length - 1];
  const mode = getEffectiveOcrMode();
  updatePurOcrModeLabel();
  setPurOcrStatus('⏳ Đang quét ảnh...');
  try {
    let result = null;
    if(mode === 'offline') {
      result = await runOfflineOcr(photo.dataUrl);
    } else if(mode === 'online') {
      result = await runOnlinePurchaseOcr(photo.dataUrl);
    } else { // auto
      try {
        result = await runOfflineOcr(photo.dataUrl);
      } catch(e) {
        console.warn('Offline OCR failed, considering online fallback', e);
        const s = Store.getSettings();
        const canOnline = navigator.onLine && !!s.geminiApiKey;
        if(canOnline) {
          if(confirm('OCR Offline không đọc rõ. Dùng OCR Online (Gemini) để quét ảnh này?')) {
            result = await runOnlinePurchaseOcr(photo.dataUrl);
          } else {
            throw new Error('Người dùng không muốn dùng OCR Online');
          }
        } else {
          throw e;
        }
      }
    }
    if(result) {
      applyPurchaseOcrResult(result);
    } else {
      setPurOcrStatus('⚠️ Không đọc được nhiều thông tin từ ảnh. Vui lòng nhập tay.');
    }
  } catch(e) {
    console.warn('runPurchaseOcrFromLatestPhoto error', e);
    setPurOcrStatus('❌ Lỗi OCR: ' + (e.message || e));
  }
}

async function loadTesseractWorker() {
  if(tesseractWorker) return tesseractWorker;
  if(typeof Tesseract === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Không tải được thư viện OCR offline'));
      document.head.appendChild(s);
    });
  }
  tesseractWorker = await Tesseract.createWorker('vie', 1);
  return tesseractWorker;
}

async function runOfflineOcr(dataUrl) {
  const worker = await loadTesseractWorker();
  const res = await worker.recognize(dataUrl);
  const text = (res && res.data && res.data.text) ? res.data.text : '';
  if(!text.trim()) throw new Error('OCR Offline không đọc được nội dung.');
  return parsePurchaseText(text, 'offline');
}

async function runOnlinePurchaseOcr(dataUrl) {
  const s = Store.getSettings();
  if(!s.geminiApiKey) throw new Error('Chưa cấu hình Gemini API Key cho OCR Online.');
  const base64 = dataUrl.split(',')[1];
  const prompt = `Bạn là trợ lý nhập hàng cho quán ăn "Gánh Khô Chữa Lành".
Đây là ảnh hóa đơn / phiếu nhập nguyên liệu. Hãy cố gắng trích xuất:
- Tên nguyên liệu chính (name)
- Số lượng (qty)
- Tổng tiền (price, đơn vị VND)

Trả về JSON dạng:
{ "name": "<tên hoặc rỗng nếu không chắc>", "qty": <số hoặc null>, "price": <số hoặc null>, "rawText": "<toàn bộ nội dung đọc được>" }

Nếu không rõ một trường nào đó, để null hoặc chuỗi rỗng. Không dùng markdown.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${s.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256, response_mime_type: 'application/json' }
      })
    }
  );
  const data = await res.json();
  if(data.error) throw new Error(data.error.message || 'Gemini API error');
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch(e) { throw new Error('Không parse được JSON từ Gemini'); }
  return parsePurchaseJson(parsed, 'online');
}

function parsePurchaseText(text, source) {
  // Heuristic đơn giản: tìm số lớn nhất làm price, số còn lại làm qty
  const numbers = (text.match(/\d[\d\.]*/g) || []).map(x => parseFloat(x.replace(/\./g,''))).filter(x => !isNaN(x));
  let price = null;
  let qty = null;
  if(numbers.length) {
    price = Math.max(...numbers);
    const others = numbers.filter(n => n !== price);
    if(others.length) qty = others[0];
  }
  // Tên: lấy dòng có chữ cái nhiều nhất
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let bestLine = '';
  lines.forEach(l => {
    if(/[A-Za-zÀ-ỹ]/.test(l) && l.length > bestLine.length) bestLine = l;
  });
  return {
    name: bestLine || '',
    qty,
    price,
    rawText: text,
    source,
  };
}

function parsePurchaseJson(obj, source) {
  return {
    name: obj.name || '',
    qty: typeof obj.qty === 'number' ? obj.qty : null,
    price: typeof obj.price === 'number' ? obj.price : null,
    rawText: obj.rawText || '',
    source,
  };
}

function applyPurchaseOcrResult(result) {
  const nameInp = document.getElementById('pur-name');
  const qtyInp = document.getElementById('pur-qty');
  const priceInp = document.getElementById('pur-price');
  if(!nameInp || !qtyInp || !priceInp) return;

  let filled = [];
  if(result.name && !nameInp.value.trim()) {
    nameInp.value = result.name;
    filled.push('tên nguyên liệu');
  }
  if(typeof result.qty === 'number' && !qtyInp.value) {
    qtyInp.value = result.qty;
    filled.push('số lượng');
  }
  if(typeof result.price === 'number' && !priceInp.value) {
    priceInp.value = result.price;
    filled.push('tổng tiền');
  }

  if(filled.length) {
    setPurOcrStatus(`✅ OCR ${result.source === 'online' ? 'Online' : 'Offline'} đã điền: ${filled.join(', ')}. Phần còn lại vui lòng nhập tay nếu cần.`);
  } else {
    setPurOcrStatus('⚠️ OCR không điền thêm được trường nào. Vui lòng nhập thủ công dựa trên ảnh.');
  }
}

// ============================================================
// IMAGE RESIZE HELPER
// ============================================================

function resizeImageToDataUrl(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const max = maxSize || 1080;
        if(width > height && width > max) {
          height = Math.round(height * max / width);
          width = max;
        } else if(height > width && height > max) {
          width = Math.round(width * max / height);
          height = max;
        } else if(width > max) {
          const ratio = max / width;
          width = max;
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const q = typeof quality === 'number' ? quality : 0.7;
        const dataUrl = canvas.toDataURL('image/jpeg', q);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Không đọc được ảnh.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Không tải được file ảnh.'));
    reader.readAsDataURL(file);
  });
}

function renderStockList() {
  const inv = Store.getInventory();
  const search = (document.getElementById('inv-search')||{}).value || '';
  const filtered = inv.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  const {critical, low} = getInventoryAlerts();
  const critSet = new Set(critical.map(i=>i.id));
  const lowSet = new Set(low.map(i=>i.id));

  const html = filtered.map(i => {
    const pct = Math.min(100, (i.qty / (i.minQty * 3)) * 100);
    const level = critSet.has(i.id) ? 'low' : lowSet.has(i.id) ? 'mid' : 'ok';
    const barClass = level === 'low' ? 'red' : level === 'mid' ? 'yellow' : 'green';
    return `<div class="inv-item">
      <div style="flex:1">
        <div class="inv-name">${i.name} <span class="inv-unit">(${i.unit})</span></div>
        <div class="progress"><div class="progress-bar ${barClass}" style="width:${pct}%"></div></div>
        <div style="font-size:10px;color:var(--text3)">Tối thiểu: ${i.minQty} ${i.unit}</div>
      </div>
      <div style="text-align:right">
        <div class="inv-qty ${level}">${i.qty}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">Giá vốn: ${fmt(i.costPerUnit||0)}đ</div>
        ${i.supplierName ? `<div style="font-size:10px;color:var(--text3);margin-top:2px">NCC: ${i.supplierName}</div>` : ''}
        <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
          <button class="btn btn-xs btn-outline" onclick="quickAddStock('${i.id}')">+</button>
          <button class="btn btn-xs btn-secondary" onclick="editInvItem('${i.id}')">✏️</button>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-text">Không có dữ liệu</div></div>';

  document.getElementById('stock-list').innerHTML = html;

  // Alert summary
  const alertDiv = document.getElementById('inv-alerts');
  let alertHtml = '';
  if(critical.length > 0) alertHtml += `<div class="alert-card danger" style="cursor:pointer" onclick="openStockAlertPopup()"><div class="alert-icon">🚨</div><div class="alert-content"><div class="alert-title">Cần nhập gấp (${critical.length})</div><div class="alert-desc">${critical.map(i=>i.name).join(', ')}</div></div></div>`;
  if(low.length > 0) alertHtml += `<div class="alert-card warning" style="cursor:pointer" onclick="openStockAlertPopup()"><div class="alert-icon">⚠️</div><div class="alert-content"><div class="alert-title">Sắp hết (${low.length})</div><div class="alert-desc">${low.map(i=>i.name).join(', ')}</div></div></div>`;
  alertDiv.innerHTML = alertHtml;
}

function quickAddStock(invId) {
  const inv = Store.getInventory();
  const item = inv.find(i => i.id === invId);
  if(!item) return;
  const amt = parseFloat(prompt(`Nhập thêm bao nhiêu ${item.unit}?`, '10'));
  if(isNaN(amt) || amt <= 0) return;
  item.qty += amt;
  Store.setInventory(inv);
  // Log purchase
  Store.addPurchase({ id:uid(), name:item.name, qty:amt, unit:item.unit, price:item.costPerUnit*amt, costPerUnit:item.costPerUnit, date:new Date().toISOString(), supplier:'Nhập thủ công' });
  renderInventory();
  updateAlertBadge();
  showToast(`✅ Đã nhập thêm ${amt} ${item.unit} ${item.name}`);
}

function editInvItem(invId) {
  const inv = Store.getInventory();
  const item = inv.find(i => i.id === invId);
  if(!item) return;
  document.getElementById('inv-edit-id').value = item.id;
  document.getElementById('inv-edit-name').value = item.name;
  document.getElementById('inv-edit-unit').value = item.unit;
  document.getElementById('inv-edit-qty').value = item.qty;
  document.getElementById('inv-edit-min').value = item.minQty;
  document.getElementById('inv-edit-cost').value = item.costPerUnit || 0;
  document.getElementById('inv-edit-supplier').value = item.supplierName || '';
  document.getElementById('inv-edit-supplier-phone').value = item.supplierPhone || '';
  document.getElementById('inv-edit-supplier-addr').value = item.supplierAddress || '';
  document.getElementById('inv-edit-modal').classList.add('active');
}

function submitInvEdit(e) {
  e.preventDefault();
  const id = document.getElementById('inv-edit-id').value;
  const name = document.getElementById('inv-edit-name').value.trim();
  const unit = document.getElementById('inv-edit-unit').value.trim();
  const qty = parseFloat(document.getElementById('inv-edit-qty').value);
  const minQty = parseFloat(document.getElementById('inv-edit-min').value);
  const cost = parseFloat(document.getElementById('inv-edit-cost').value);
  const supplierName = document.getElementById('inv-edit-supplier').value.trim();
  const supplierPhone = document.getElementById('inv-edit-supplier-phone').value.trim();
  const supplierAddress = document.getElementById('inv-edit-supplier-addr').value.trim();

  if(!name || !unit || isNaN(qty) || isNaN(minQty) || isNaN(cost)) return;

  const inv = Store.getInventory();
  const idx = inv.findIndex(i => i.id === id);
  if(idx >= 0) {
    inv[idx] = { ...inv[idx], name, unit, qty, minQty, costPerUnit: cost, supplierName, supplierPhone, supplierAddress };
    Store.setInventory(inv);
    renderInventory();
    document.getElementById('inv-edit-modal').classList.remove('active');
    showToast('✅ Đã cập nhật kho');
  }
}

function getPurchasePhotoBatchEntries() {
  const map = Store.getPurchasePhotos() || {};
  const purchases = Store.getPurchases();
  const entries = [];

  Object.keys(map).forEach(batchId => {
    const entry = map[batchId];
    const createdAt = entry && entry.createdAt ? entry.createdAt : null;
    const photos = Array.isArray(entry) ? entry : (entry && Array.isArray(entry.photos) ? entry.photos : []);
    if(!photos || !photos.length) return;
    const usedCount = purchases.filter(p => String(p.photoBatchId || '') === String(batchId)).length;

    entries.push({
      batchId,
      createdAt: createdAt || (photos[0] && photos[0].takenAt) || null,
      photos,
      count: photos.length,
      usedCount,
    });
  });

  entries.sort((a,b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return entries;
}

function renderPurchasePhotoManager() {
  const entries = getPurchasePhotoBatchEntries();
  if(!entries.length) {
    return '<div class="card" style="padding:12px;margin-bottom:12px;"><div class="card-title" style="margin-bottom:6px">📷 Quản lý hình ảnh đã chụp</div><div class="card-sub" style="font-size:12px;color:var(--text3)">Chưa có ảnh chứng từ đã lưu</div></div>';
  }

  const html = entries.slice(0, 10).map(e => `
    <div class="list-item" style="flex-direction:row;align-items:flex-start;gap:10px;">
      <div class="list-item-icon" style="width:56px;height:56px;background:rgba(0,149,255,0.1);border-radius:14px;overflow:hidden;padding:0;">
        <img src="${e.photos[0].dataUrl}" alt="Ảnh" style="width:100%;height:100%;object-fit:cover;cursor:pointer;"
             onclick="openPurchasePhotoFullFromBatch('${e.batchId}', 0)">
      </div>
      <div class="list-item-content">
        <div class="list-item-title">📷 Batch chứng từ</div>
        <div class="list-item-sub" style="margin-top:4px">
          <div>Thời gian: ${e.createdAt ? fmtDateTime(e.createdAt) : ''}</div>
          <div>Số ảnh: ${e.count}</div>
          <div>Sử dụng cho: ${e.usedCount} lần nhập</div>
        </div>
      </div>
      <div class="list-item-right" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs btn-outline" onclick="viewPurchasePhotoBatch('${e.batchId}')">👁️ Xem</button>
          <button class="btn btn-xs btn-danger" onclick="deletePurchasePhotoBatch('${e.batchId}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="card" style="padding:12px;margin-bottom:12px;">
      <div class="card-header" style="margin-bottom:8px">
        <div class="card-title">📷 Quản lý hình ảnh đã chụp</div>
        <div class="card-sub" style="margin-left:auto;font-size:11px;color:var(--text3)">Xem lại & xóa thủ công</div>
      </div>
      ${html}
    </div>
  `;
}

function viewPurchasePhotoBatch(batchId) {
  const map = Store.getPurchasePhotos() || {};
  const entry = map[batchId];
  const photos = Array.isArray(entry) ? entry : (entry && Array.isArray(entry.photos) ? entry.photos : []);
  if(!photos.length) {
    showToast('Không tìm thấy batch ảnh.', 'warning');
    return;
  }

  window._activePurchasePhotoBatchId = batchId;
  window._activePurchasePhotoBatchPhotos = photos;
  const purchases = Store.getPurchases();
  const used = purchases.filter(p => String(p.photoBatchId || '') === String(batchId));
  const meta = document.getElementById('purchase-photo-batch-meta');
  const gallery = document.getElementById('purchase-photo-batch-gallery');
  if(meta) {
    const names = used.slice(0, 3).map(p => p.name).join(', ');
    const more = used.length > 3 ? ` +${used.length - 3} món` : '';
    meta.textContent = `Batch: ${batchId} · Ảnh: ${photos.length} · Thời gian: ${fmtDateTime(entry.createdAt || photos[0].takenAt)} · Dùng cho: ${used.length} lần nhập${used.length ? ` (${names}${more})` : ''}`;
  }
  if(gallery) {
    gallery.innerHTML = photos.map((ph, idx) => `
      <div style="flex:0 0 auto;width:96px;height:96px;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:var(--bg3);cursor:pointer;"
           onclick="openPurchasePhotoBatchFull(${idx})">
        <img src="${ph.dataUrl}" alt="Chứng từ" style="width:100%;height:100%;object-fit:cover;">
      </div>
    `).join('');
  }

  document.getElementById('purchase-photo-batch-modal')?.classList.add('active');
}

function openPurchasePhotoFullFromBatch(batchId, photoIdx) {
  const map = Store.getPurchasePhotos() || {};
  const entry = map[batchId];
  const photos = Array.isArray(entry) ? entry : (entry && Array.isArray(entry.photos) ? entry.photos : []);
  const p = photos && photos.length ? photos[photoIdx] : null;
  if(!p) return;

  const modal = document.getElementById('purchase-photo-full-modal');
  const img = document.getElementById('purchase-photo-full-img');
  const meta = document.getElementById('purchase-photo-full-meta');
  if(!modal || !img) return;

  img.src = p.dataUrl;
  if(meta) meta.textContent = p.takenAt ? `Thời gian chụp: ${fmtDateTime(p.takenAt)}` : `Batch: ${batchId}`;
  modal.classList.add('active');
}

function openPurchasePhotoBatchFull(photoIdx) {
  const photos = window._activePurchasePhotoBatchPhotos || [];
  const p = photos[photoIdx];
  if(!p) return;
  const modal = document.getElementById('purchase-photo-full-modal');
  const img = document.getElementById('purchase-photo-full-img');
  const meta = document.getElementById('purchase-photo-full-meta');
  if(!modal || !img) return;

  img.src = p.dataUrl;
  if(meta) meta.textContent = p.takenAt ? `Thời gian chụp: ${fmtDateTime(p.takenAt)}` : '';
  modal.classList.add('active');
}

function deletePurchasePhotoBatch(batchId) {
  const map = Store.getPurchasePhotos() || {};
  if(!map[batchId]) {
    showToast('Không tìm thấy batch ảnh.', 'warning');
    return;
  }
  if(!confirm('Xóa toàn bộ ảnh chứng từ của batch này? Hành động này không thể hoàn tác.')) return;

  delete map[batchId];
  Store.setPurchasePhotos(map);

  // Gỡ liên kết khỏi các lần nhập
  const purchases = Store.getPurchases();
  let changed = false;
  purchases.forEach(p => {
    if(String(p.photoBatchId || '') === String(batchId)) {
      p.photoBatchId = null;
      changed = true;
    }
  });
  if(changed) Store.setPurchases(purchases);

  // Nếu modal đang mở batch đó thì reset
  if(String(currentPurchasePhotosBatchId || '') === String(batchId)) {
    currentPurchasePhotosBatchId = null;
    currentPurchasePhotos = [];
    resetPurchasePhotoFileInputs();
    if(document.getElementById('pur-photo-thumbs')) {
      document.getElementById('pur-photo-thumbs').innerHTML = '<div style="font-size:11px;color:var(--text3);">Chưa có ảnh chứng từ.</div>';
    }
    if(document.getElementById('pur-photo-viewer')) document.getElementById('pur-photo-viewer').style.display = 'none';
    setPurOcrStatus('');
  }

  document.getElementById('purchase-photo-batch-modal')?.classList.remove('active');
  renderInventory();
  showToast('🗑️ Đã xóa batch ảnh.', 'success');
}

function renderPurchaseList() {
  const purchases = Store.getPurchases().slice(0, 50);

  const purchasesHtml = purchases.length ? purchases.map(p => {
    let subInfo = `${p.qty} ${p.unit} · ${p.supplier || 'Không rõ'} · ${fmtDate(p.date)}`;
    if (p.note) {
      const safeNote = String(p.note).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      subInfo += `<br><small style="color:var(--text2)">${safeNote}</small>`;
    }
    if (p.photoBatchId) subInfo += `<br><small style="color:var(--text3)">📷 Batch: ${String(p.photoBatchId).slice(0,8)}...</small>`;
    if (p.supplierPhone) subInfo += `<br><small style="color:var(--text3)">ĐT: ${p.supplierPhone} ${p.supplierAddress ? '- ' + p.supplierAddress : ''}</small>`;
    return `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(0,149,255,0.1)">📦</div>
      <div class="list-item-content">
        <div class="list-item-title">${p.name}</div>
        <div class="list-item-sub">${subInfo}</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount">-${fmt(p.price)}đ</div>
        <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
          <button class="btn btn-xs btn-outline" onclick="editPurchase('${p.id}')">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="deletePurchase('${p.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Chưa có lịch sử nhập hàng</div></div>';

  const wrap = document.getElementById('purchase-list');
  if(!wrap) return;
  wrap.innerHTML = renderPurchasePhotoManager() + purchasesHtml;
}

function editPurchase(purchaseId) {
  const purchases = Store.getPurchases();
  const p = purchases.find(x => x.id === purchaseId);
  if(!p) return;
  renderPurchaseSupplierDropdown();
  resetPurchasePhotoFileInputs();
  // Fill form and open modal
  document.getElementById('pur-name').value = p.name;
  document.getElementById('pur-qty').value = p.qty;
  document.getElementById('pur-price').value = p.price;
  document.getElementById('pur-supplier').value = p.supplier || '';
  document.getElementById('pur-supplier-phone').value = p.supplierPhone || '';
  document.getElementById('pur-supplier-addr').value = p.supplierAddress || '';
  const noteEl = document.getElementById('pur-note');
  if(noteEl) noteEl.value = p.note || '';
  syncPurchaseSupplierSelectFromPurchase(p);
  // Store editing id
  const form = document.getElementById('purchase-form');
  form.dataset.editId = purchaseId;
  document.getElementById('purchase-modal-title').textContent = '✏️ Sửa nhập hàng';
  document.getElementById('purchase-modal').classList.add('active');
}

function deletePurchase(purchaseId) {
  if(!confirm('Xoá bản ghi nhập hàng này?')) return;
  const purchases = Store.getPurchases().filter(p => p.id !== purchaseId);
  Store.setPurchases(purchases);
  renderInventory();
  showToast('🗑️ Đã xoá bản ghi nhập hàng');
}

function renderForecast() {
  const needs = getForecastNeeds(3);
  document.getElementById('forecast-list').innerHTML = needs.length ? needs.map(n =>
    `<div class="alert-card ${n.urgent?'danger':'warning'}">
      <div class="alert-icon">${n.urgent?'🚨':'📊'}</div>
      <div class="alert-content">
        <div class="alert-title">${n.name} <span class="badge ${n.urgent?'badge-danger':'badge-warning'}">${n.urgent?'KHẨN':'Dự báo'}</span></div>
        <div class="alert-desc">Tồn: ${n.currentQty} ${n.unit} | Trung bình/ngày: ${n.dailyAvg} ${n.unit}<br>Cần nhập thêm ~${n.need.toFixed(1)} ${n.unit} cho 3 ngày tới</div>
      </div>
    </div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Tồn kho đủ dùng!</div></div>';
}

function renderLedger() {
  const monthStr = document.getElementById('ledger-month').value; // YYYY-MM
  const itemName = document.getElementById('ledger-item-select').value;
  if (!monthStr || !itemName) {
    document.getElementById('ledger-list').innerHTML = '<div class="empty-state"><div class="empty-icon">📓</div><div class="empty-text">Vui lòng chọn tháng và nguyên liệu</div></div>';
    return;
  }

  const [year, month] = monthStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 1).getTime();

  const inv = Store.getInventory().find(i => i.name === itemName);
  if (!inv) return;

  const allPurchases = Store.getPurchases().filter(p => p.name === itemName);
  const allHistory = Store.getHistory();
  const menu = Store.getMenu();

  let events = [];
  
  allPurchases.forEach(p => {
    const t = new Date(p.date).getTime();
    events.push({ time: t, type: 'purchase', qty: p.qty, desc: 'Nhập hàng', label: p.supplier || '' });
  });

  allHistory.forEach(h => {
    const t = new Date(h.paidAt).getTime();
    let usedQty = 0;
    (h.items||[]).forEach(i => {
       const dish = menu.find(m => m.id === i.id);
       if (dish && dish.ingredients) {
         const ing = dish.ingredients.find(ing => ing.name === itemName);
         if (ing) {
            usedQty += ing.qty * i.qty;
         }
       }
    });
    if (usedQty > 0) {
      events.push({ time: t, type: 'sale', qty: usedQty, desc: 'Bán ra', label: h.id });
    }
  });

  events.sort((a,b) => a.time - b.time);

  let totalPurchasesAfterStart = 0;
  let totalSalesAfterStart = 0;
  let totalPurchasesAfterEnd = 0;
  let totalSalesAfterEnd = 0;

  events.forEach(e => {
    if (e.time >= startDate) {
      if (e.type === 'purchase') totalPurchasesAfterStart += e.qty;
      else if (e.type === 'sale') totalSalesAfterStart += e.qty;
    }
    if (e.time >= endDate) {
      if (e.type === 'purchase') totalPurchasesAfterEnd += e.qty;
      else if (e.type === 'sale') totalSalesAfterEnd += e.qty;
    }
  });

  // Calculate back from present
  let openingStock = inv.qty - totalPurchasesAfterStart + totalSalesAfterStart;
  
  let monthEvents = events.filter(e => e.time >= startDate && e.time < endDate);

  let periodPurchases = 0;
  let periodSales = 0;
  let currentRunningStock = openingStock;

  let html = `<div class="card" style="margin-bottom:12px;background:var(--bg3)">
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
      <span>Tồn đầu kỳ:</span><span style="font-weight:700">${fmt(openingStock)} ${inv.unit}</span>
    </div>
  `;

  let detailsHtml = '';
  monthEvents.forEach(e => {
    if (e.type === 'purchase') {
      currentRunningStock += e.qty;
      periodPurchases += e.qty;
      detailsHtml += `<div class="list-item">
        <div class="list-item-icon" style="background:rgba(0,149,255,0.1)">📥</div>
        <div class="list-item-content">
          <div class="list-item-title">${e.desc} <span style="font-weight:normal;color:var(--text2);font-size:11px">(${e.label})</span></div>
          <div class="list-item-sub">${fmtTime(new Date(e.time))} · ${fmtDate(new Date(e.time))}</div>
        </div>
        <div class="list-item-right" style="text-align:right">
          <div class="list-item-amount" style="color:var(--info)">+${fmt(e.qty)} ${inv.unit}</div>
          <div style="font-size:11px;color:var(--text3)">Tồn: ${fmt(currentRunningStock)}</div>
        </div>
      </div>`;
    } else {
      currentRunningStock -= e.qty;
      periodSales += e.qty;
      detailsHtml += `<div class="list-item">
        <div class="list-item-icon" style="background:rgba(255,61,113,0.1)">📤</div>
        <div class="list-item-content">
          <div class="list-item-title">${e.desc} <span style="font-weight:normal;color:var(--text2);font-size:11px">(${e.label})</span></div>
          <div class="list-item-sub">${fmtTime(new Date(e.time))} · ${fmtDate(new Date(e.time))}</div>
        </div>
        <div class="list-item-right" style="text-align:right">
          <div class="list-item-amount" style="color:var(--danger)">-${fmt(e.qty)} ${inv.unit}</div>
          <div style="font-size:11px;color:var(--text3)">Tồn: ${fmt(currentRunningStock)}</div>
        </div>
      </div>`;
    }
  });

  html += `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
      <span>Nhập trong kỳ:</span><span style="font-weight:700;color:var(--info)">+${fmt(periodPurchases)} ${inv.unit}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
      <span>Xuất trong kỳ:</span><span style="font-weight:700;color:var(--danger)">-${fmt(periodSales)} ${inv.unit}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span>Tồn cuối kỳ:</span><span style="font-weight:800;color:var(--primary)">${fmt(currentRunningStock)} ${inv.unit}</span>
    </div>
  </div>`;

  html += detailsHtml || '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">Không có giao dịch trong tháng</div></div>';

  document.getElementById('ledger-list').innerHTML = html;
}

function resetPurchasePhotoFileInputs() {
  ['pur-photo-input-cam', 'pur-photo-input-file'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
}

function openPurchaseModal() {
  const form = document.getElementById('purchase-form');
  delete form.dataset.editId;
  form.reset();
  resetPurchasePhotoFileInputs();
  // Reset session ảnh chứng từ cho lần nhập hiện tại
  currentPurchasePhotos = [];
  currentPurchasePhotosBatchId = null;
  const thumbs = document.getElementById('pur-photo-thumbs');
  if(thumbs) thumbs.innerHTML = '<div style="font-size:11px;color:var(--text3);">Chưa có ảnh chứng từ.</div>';
  const viewer = document.getElementById('pur-photo-viewer');
  if(viewer) viewer.style.display = 'none';
  setPurOcrStatus('');
  document.getElementById('purchase-modal-title').textContent = '🚚 Nhập hàng mới';
  renderPurchaseSupplierDropdown(); // Load danh sách NCC
  document.getElementById('purchase-modal').classList.add('active');
}

function submitPurchase(e) {
  e.preventDefault();
  const inv = Store.getInventory();
  const name = document.getElementById('pur-name').value.trim();
  const qty = parseFloat(document.getElementById('pur-qty').value);
  const price = parseFloat(document.getElementById('pur-price').value);
  const supplierSel = document.getElementById('pur-supplier-select');
  const supplierId = supplierSel && supplierSel.value ? supplierSel.value : '';
  const supplierName = document.getElementById('pur-supplier').value.trim() || 'Không rõ';
  const supplierPhone = document.getElementById('pur-supplier-phone').value.trim() || '';
  const supplierAddr = document.getElementById('pur-supplier-addr').value.trim() || '';
  const noteEl = document.getElementById('pur-note');
  const note = noteEl ? noteEl.value.trim() : '';

  if(!name || isNaN(qty) || isNaN(price)) return;

  const form = document.getElementById('purchase-form');
  const editId = form.dataset.editId;

  // Find or create inventory item
  let item = inv.find(i => i.name.toLowerCase() === name.toLowerCase());

  if(editId) {
    // EDIT MODE: update purchase record
    const purchases = Store.getPurchases();
    const pIdx = purchases.findIndex(p => p.id === editId);
    if(pIdx >= 0) {
      const oldQty = purchases[pIdx].qty;
      const oldName = purchases[pIdx].name;
      // Reverse old inventory change, apply new one
      let oldItem = inv.find(i => i.name.toLowerCase() === oldName.toLowerCase());
      if(oldItem) oldItem.qty = Math.max(0, oldItem.qty - oldQty);

      if(item && item.name.toLowerCase() === name.toLowerCase()) {
        item.qty += qty;
        item.costPerUnit = price/qty;
      } else if(!item) {
        item = { id:uid(), name, qty, unit:'phần', minQty:5, costPerUnit:price/qty };
        inv.push(item);
      }

      // Gắn batch ảnh chứng từ (nếu có) cho lần chỉnh sửa này
      if(currentPurchasePhotosBatchId && currentPurchasePhotos && currentPurchasePhotos.length) {
        persistCurrentPurchasePhotosBatch();
      }
      purchases[pIdx] = { ...purchases[pIdx], name, qty, price, unit:item.unit, costPerUnit:price/qty, supplier:supplierName, supplierId: supplierId || null, supplierPhone, supplierAddress:supplierAddr, note, photoBatchId: currentPurchasePhotosBatchId || purchases[pIdx].photoBatchId || null };
      Store.setPurchases(purchases);
      Store.setInventory(inv);
      delete form.dataset.editId;
      document.getElementById('purchase-modal-title').textContent = '🚚 Nhập hàng mới';
    }
    showToast('✅ Đã cập nhật nhập hàng!');
  } else {
    // ADD MODE
    // Lưu batch ảnh chứng từ (nếu có) - chỉ lưu theo batch id để tránh trùng lặp
    persistCurrentPurchasePhotosBatch();
    const purchaseId = uid();
    if(item) {
      item.qty += qty;
      item.costPerUnit = price/qty;
    } else {
      item = { id:uid(), name, qty, unit:'phần', minQty:5, costPerUnit:price/qty };
      inv.push(item);
    }
    Store.setInventory(inv);
    Store.addPurchase({ id:purchaseId, name, qty, unit:item.unit, price, costPerUnit:price/qty, date:new Date().toISOString(), supplier: supplierName, supplierId: supplierId || null, supplierPhone, supplierAddress: supplierAddr, note, photoBatchId: currentPurchasePhotosBatchId || null });
    Store.addExpense({ id:uid(), name:`Nhập hàng: ${name}`, amount:price, category:'Nhập hàng', date:new Date().toISOString() });
    showToast('✅ Đã nhập hàng! Tiếp tục chọn nguyên liệu khác.', 'success');
  }

  // Sau khi bấm "Nhập hàng": giữ modal mở để tiếp tục nhập nguyên liệu mới
  // - Reset các field nhập nguyên liệu, giữ lại NCC + ảnh chứng từ
  if(editId) {
    document.getElementById('purchase-modal').classList.remove('active');
    document.getElementById('purchase-form').reset();
    renderInventory();
    updateAlertBadge();
    return;
  }

  // Clear only item fields
  document.getElementById('pur-name').value = '';
  document.getElementById('pur-qty').value = '';
  document.getElementById('pur-price').value = '';
  if(noteEl) noteEl.value = '';
  const nameInp = document.getElementById('pur-name');
  if(nameInp) nameInp.focus();
  renderInventory();
  updateAlertBadge();
}

// ============================================================
// PAGE: FINANCE
// ============================================================
let financePeriod = 'today';
let financeDateOpts = {};

function renderFinance() {
  setFinancePeriod(financePeriod);
}

function setFinancePeriod(p) {
  financePeriod = p;
  document.querySelectorAll('.finance-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === p));
  
  // Show/hide date picker
  const picker = document.getElementById('finance-date-picker');
  if(picker) picker.style.display = p === 'day' ? '' : 'none';
  
  if(p === 'day') {
    // If no date selected yet, default to today
    const singleInput = document.getElementById('finance-single-date');
    if(singleInput && !singleInput.value) singleInput.value = new Date().toISOString().split('T')[0];
    applyDateFilter('finance');
    return;
  }
  financeDateOpts = {};
  const s = getRevenueSummary(p, financeDateOpts);
  updateFinanceUI(s);
}

function updateFinanceUI(s) {
  document.getElementById('fin-revenue').textContent = fmtFull(s.revenue);
  document.getElementById('fin-cost').textContent = fmtFull(s.cost);
  document.getElementById('fin-gross').textContent = fmtFull(s.gross);
  document.getElementById('fin-expense').textContent = fmtFull(s.expenseTotal);
  document.getElementById('fin-profit').textContent = fmtFull(s.profit);
  document.getElementById('fin-orders').textContent = s.orders;
  document.getElementById('fin-bank').textContent = fmtFull(s.revenueBank || 0);
  document.getElementById('fin-cash').textContent = fmtFull(s.revenueCash || 0);
  const finDiscount = document.getElementById('fin-discount');
  if(finDiscount) finDiscount.textContent = fmtFull(s.discountTotal || 0);
  const finShipping = document.getElementById('fin-shipping');
  if(finShipping) finShipping.textContent = fmtFull(s.shippingTotal || 0);
  const margin = s.revenue > 0 ? (s.gross/s.revenue*100).toFixed(1) : 0;
  document.getElementById('fin-margin').textContent = margin + '%';
  // VAT section
  const settings = Store.getSettings();
  const taxRate = settings.taxRate != null ? Number(settings.taxRate) : 0;
  const vatRow = document.getElementById('fin-vat-row');
  if(vatRow) {
    // Ưu tiên dùng vatTotal thực tế từ các đơn; fallback về tính từ taxRate
    const vatTotal = (s.vatTotal > 0) ? s.vatTotal
      : (taxRate > 0 ? Math.round(s.revenue * taxRate / (100 + taxRate)) : 0);
    if(taxRate > 0 || vatTotal > 0) {
      vatRow.style.display = 'grid';
      const displayRate = taxRate > 0 ? taxRate : '?';
      const revenueAfterVat = s.revenue - vatTotal;
      const vatRateLabel = document.getElementById('fin-vat-rate-label');
      if(vatRateLabel) vatRateLabel.textContent = displayRate;
      const finVat = document.getElementById('fin-vat');
      if(finVat) finVat.textContent = fmtFull(vatTotal);
      const finRevAfterVat = document.getElementById('fin-revenue-after-vat');
      if(finRevAfterVat) finRevAfterVat.textContent = fmtFull(revenueAfterVat);
    } else {
      vatRow.style.display = 'none';
    }
  }
  renderExpenseList();
  renderRevenueChart();
}

function renderExpenseList() {
  const expenses = filterExpenses(financePeriod, financeDateOpts);
  
  if(!expenses.length) {
    document.getElementById('expense-list').innerHTML = '<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-text">Chưa có chi phí</div></div>';
    return;
  }

  // Group by date
  const groups = {};
  expenses.forEach(e => {
    const key = fmtDate(e.date);
    if(!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  let html = '';
  for(const [date, items] of Object.entries(groups)) {
    const dayTotal = items.reduce((s,e) => s + e.amount, 0);
    html += `<div class="history-group-header"><span>📅 ${date}</span><span class="history-group-total">-${fmt(dayTotal)}đ</span></div>`;
    html += items.map(e => `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(255,61,113,0.1)">💸</div>
      <div class="list-item-content">
        <div class="list-item-title">${e.name}</div>
        <div class="list-item-sub">${e.category} · ${fmtTime(e.date)}</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount" style="color:var(--danger)">-${fmt(e.amount)}đ</div>
      </div>
    </div>`).join('');
  }
  document.getElementById('expense-list').innerHTML = html;
}

function openExpenseModal() {
  document.getElementById('expense-modal').classList.add('active');
}

function submitExpense(e) {
  e.preventDefault();
  const name = document.getElementById('exp-name').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const category = document.getElementById('exp-category').value;
  if(!name || isNaN(amount)) return;
  Store.addExpense({ id:uid(), name, amount, category, date:new Date().toISOString() });
  document.getElementById('expense-modal').classList.remove('active');
  document.getElementById('expense-form').reset();
  renderFinance();
  showToast('✅ Đã thêm chi phí!');
}

function openDiscountDetails() {
  const orders = filterHistory(financePeriod).filter(o => o.discount && o.discount > 0);
  if (orders.length === 0) {
    showToast('Chưa có đơn nào được giảm giá trong thời gian này', 'warning');
    return;
  }
  
  document.getElementById('discount-detail-content').innerHTML = orders.map(o => `
    <div class="list-item" onclick="document.getElementById('discount-detail-modal').classList.remove('active'); viewOrderDetail('${o.id}')" style="cursor:pointer">
      <div class="list-item-icon" style="background:rgba(255,61,113,0.1)">📉</div>
      <div class="list-item-content">
        <div class="list-item-title">${o.tableName} – ${o.id}</div>
        <div class="list-item-sub">${fmtDateTime(o.paidAt)}</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount" style="color:var(--danger)">-${fmt(o.discount)}đ</div>
      </div>
    </div>
  `).join('');
  
  document.getElementById('discount-detail-modal').classList.add('active');
}

function renderRevenueChart() {
  const data = getRevenueByDay(7);
  const ctx = document.getElementById('revenue-chart');
  if(!ctx) return;
  if(chartInstances.revenue) chartInstances.revenue.destroy();
  chartInstances.revenue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Doanh thu',
        data: data.map(d => d.revenue),
        backgroundColor: data.map((_,i) => i === data.length-1 ? '#FF6B35' : 'rgba(255,107,53,0.4)'),
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend:{display:false} },
      scales: {
        y: { ticks:{ color:'#A0A0B5', callback:v=>`${fmt(v)}đ` }, grid:{color:'rgba(255,255,255,0.05)'} },
        x: { ticks:{ color:'#A0A0B5' }, grid:{display:false} }
      }
    }
  });
}

// ============================================================
// PAGE: REPORTS
// ============================================================
let reportPeriod = 'today';
let reportDateOpts = {};

function renderReports() {
  setReportPeriod(reportPeriod);
}

function setReportPeriod(p) {
  reportPeriod = p;
  document.querySelectorAll('.report-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === p));
  
  // Show/hide date picker
  const picker = document.getElementById('report-date-picker');
  if(picker) picker.style.display = p === 'day' ? '' : 'none';
  
  if(p === 'day') {
    const singleInput = document.getElementById('report-single-date');
    if(singleInput && !singleInput.value) singleInput.value = new Date().toISOString().split('T')[0];
    applyDateFilter('report');
    return;
  }
  reportDateOpts = {};
  renderTopItems();
  renderCategoryChart();
  renderHourlyChart();
  renderOrderHistoryList();
}

function renderTopItems() {
  const top = getTopItems(reportPeriod, 8);
  document.getElementById('top-items').innerHTML = top.length ? top.map((item, i) =>
    `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(255,107,53,0.1);color:var(--primary);font-weight:800;font-size:16px">${i+1}</div>
      <div class="list-item-content">
        <div class="list-item-title">${item.name}</div>
        <div class="list-item-sub">Đã bán: ${item.qty} phần</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount">${fmt(item.revenue)}đ</div>
      </div>
    </div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Chưa có dữ liệu</div></div>';
}

function renderCategoryChart() {
  const orders = filterHistory(reportPeriod);
  const menu = Store.getMenu();
  const catRevenue = {};
  orders.forEach(o => (o.items||[]).forEach(item => {
    const dish = menu.find(m => m.id === item.id);
    const cat = dish?.category || 'Khác';
    catRevenue[cat] = (catRevenue[cat]||0) + item.price * item.qty;
  }));
  const labels = Object.keys(catRevenue);
  const data = labels.map(l => catRevenue[l]);
  const ctx = document.getElementById('category-chart');
  if(!ctx) return;
  if(chartInstances.category) chartInstances.category.destroy();
  const colors = ['#FF6B35','#FFD700','#00D68F','#0095FF','#FF3D71','#A855F7','#F97316'];
  chartInstances.category = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth:0, hoverOffset:8 }] },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position:'bottom', labels:{ color:'#A0A0B5', padding:10, font:{size:11} } } }
    }
  });
}

function renderHourlyChart() {
  const orders = filterHistory(reportPeriod);
  const hours = Array(24).fill(0);
  orders.forEach(o => { const h = new Date(o.paidAt).getHours(); hours[h] += o.total; });
  const activeHours = hours.slice(8, 24);
  const ctx = document.getElementById('hourly-chart');
  if(!ctx) return;
  if(chartInstances.hourly) chartInstances.hourly.destroy();
  chartInstances.hourly = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length:16},(_,i)=>`${i+8}h`),
      datasets: [{ label:'Doanh thu', data:activeHours, borderColor:'#FF6B35', backgroundColor:'rgba(255,107,53,0.1)', fill:true, tension:0.4, pointBackgroundColor:'#FF6B35', pointRadius:3 }]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{legend:{display:false}},
      scales:{
        y:{ticks:{color:'#A0A0B5',callback:v=>`${fmt(v)}`},grid:{color:'rgba(255,255,255,0.05)'}},
        x:{ticks:{color:'#A0A0B5'},grid:{display:false}}
      }
    }
  });
}

function renderOrderHistoryList() {
  cleanupOldOrderHistoryPhotos();
  const orders = filterHistory(reportPeriod, reportDateOpts).slice(0, 50);
  
  if(!orders.length) {
    document.getElementById('order-history-list').innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Chưa có lịch sử</div></div>';
    return;
  }

  // Group orders by date
  const groups = {};
  orders.forEach(o => {
    const key = fmtDate(o.paidAt);
    if(!groups[key]) groups[key] = [];
    groups[key].push(o);
  });

  let html = '';
  for(const [date, items] of Object.entries(groups)) {
    const dayRevenue = items.reduce((s,o) => s + o.total, 0);
    const dayOrders = items.length;
    const dayItems = items.reduce((s,o) => s + (o.items||[]).reduce((ss,i)=>ss+i.qty,0), 0);
    html += `<div class="history-group-header">
      <span>📅 ${date} <span class="history-group-count">${dayOrders} đơn · ${dayItems} món</span></span>
      <span class="history-group-total">${fmt(dayRevenue)}đ</span>
    </div>`;
    html += items.map(o => {
      const payIcon = o.payMethod === 'bank' ? '🏦' : '💵';
      const payLabel = o.payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
      const totalItems = (o.items||[]).reduce((s,i)=>s+i.qty,0);
      const discountLabel = o.discount > 0 ? ` · 📉 -${fmt(o.discount)}đ` : '';
      const shippingLabel = o.shipping > 0 ? ` · 🛵 +${fmt(o.shipping)}đ` : '';
      const vatLabel = o.vatAmount > 0 ? ` · 💹 VAT ${fmt(o.vatAmount)}đ` : '';
      const hasPhotos = Array.isArray(o.photos) && o.photos.length > 0;
      const photoIcon = hasPhotos ? '📷' : '';
      const noteLabel = o.note ? ` · 📝 ${o.note}` : '';
      const detailId = o.historyId || o.id;
      const itemNames = (o.items||[]).slice(0,3).map(i=>`${i.name} x${i.qty}`).join(', ');
      const moreItems = (o.items||[]).length > 3 ? ` +${(o.items||[]).length-3}` : '';
      return `<div class="list-item" onclick="viewOrderDetail('${detailId}')" style="cursor:pointer">
        <div class="list-item-icon" style="background:rgba(0,214,143,0.1)">🧾</div>
        <div class="list-item-content">
          <div class="list-item-title">${o.tableName} · ${o.id}</div>
          <div class="list-item-sub">${fmtTime(o.paidAt)} · ${totalItems} phần · ${payIcon} ${payLabel}${discountLabel}${shippingLabel}${vatLabel}${noteLabel}${photoIcon ? ' · ' + photoIcon : ''}</div>
          <div class="list-item-sub" style="color:var(--text3);font-size:10px;margin-top:2px">${itemNames}${moreItems}</div>
        </div>
        <div class="list-item-right">
          <div class="list-item-amount">${fmt(o.total)}đ</div>
          ${o.cost > 0 ? `<div style="font-size:10px;color:var(--text3)">Vốn: ${fmt(o.cost)}đ</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }
  document.getElementById('order-history-list').innerHTML = html;
}

function viewOrderDetail(orderId) {
  const h = Store.getHistory();
  const o = h.find(x => (x.historyId || x.id) === orderId);
  if(!o) return;
  window._activeOrderDetailPhotos = o.photos || [];
  const payIcon = o.payMethod === 'bank' ? '🏦' : '💵';
  const payLabel = o.payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
  const itemsHtml = (o.items||[]).map(i =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${i.name} <span style="color:var(--text3)">x${i.qty}</span></span>
      <span style="font-size:13px;font-weight:700;color:var(--primary)">${fmt(i.price*i.qty)}đ</span>
    </div>`
  ).join('');
  const subTotal = (o.items||[]).reduce((s, i) => s + i.price * i.qty, 0);
  const photosHtml = (o.photos && o.photos.length)
    ? `<div style="margin-top:12px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">📷 Ảnh ghi nhận đơn</div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
          ${o.photos.map((p, idx) => `
            <div style="flex:0 0 80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);cursor:pointer;background:var(--bg3);"
                 onclick="openOrderDetailPhotoFull(${idx})" title="Xem ảnh full">
              <img src="${p.dataUrl}" alt="Ảnh đơn" style="width:100%;height:100%;object-fit:cover;">
            </div>
          `).join('')}
        </div>
      </div>`
    : '';
  document.getElementById('order-detail-content').innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:16px;font-weight:800;margin-bottom:4px">${o.tableName}</div>
      <div style="font-size:12px;color:var(--text2)">${o.id} · ${fmtDateTime(o.paidAt)}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">${payIcon} Thanh toán: ${payLabel}</div>
      ${o.note ? `<div style="font-size:12px;color:var(--text);margin-top:4px;border-left:2px solid var(--primary);padding-left:6px"><em>Ghi chú: ${o.note}</em></div>` : ''}
    </div>
    <div style="margin-bottom:12px">${itemsHtml}</div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--text3)"><span>Tiền hàng</span><span>${fmtFull(subTotal)}</span></div>
    ${o.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--danger)"><span>📉 Giảm giá ${o.discountNote ? `(${o.discountNote})` : ''}</span><span>-${fmtFull(o.discount)}</span></div>` : ''}
    ${o.shipping > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--info)"><span>🛵 Phí giao hàng</span><span>+${fmtFull(o.shipping)}</span></div>` : ''}
    ${o.vatAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--primary)"><span>💹 Thuế VAT (${o.taxRate || 0}%)</span><span>+${fmtFull(o.vatAmount)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--border)">
      <span style="font-weight:700">TỔNG CỘNG</span>
      <span style="font-size:18px;font-weight:800;color:var(--primary)">${fmtFull(o.total)}</span>
    </div>
    ${o.cost > 0 ? `<div style="font-size:11px;color:var(--text3);text-align:right">Giá vốn: ${fmtFull(o.cost)} · Lãi gộp: ${fmtFull(o.total - o.cost)}</div>` : ''}
    ${photosHtml}
  `;
  document.getElementById('order-detail-modal').classList.add('active');
}

function openOrderDetailPhotoFull(idx) {
  const photos = window._activeOrderDetailPhotos || [];
  if(!photos.length) return;
  const p = photos[idx];
  if(!p) return;
  const modal = document.getElementById('order-detail-photo-full-modal');
  const img = document.getElementById('order-detail-photo-full-img');
  if(!modal || !img) return;
  img.src = p.dataUrl;
  const meta = document.getElementById('order-detail-photo-full-meta');
  if(meta) meta.textContent = p.takenAt ? `Thời gian: ${fmtDateTime(p.takenAt)}` : '';
  modal.classList.add('active');
}

// ============================================================
// PAGE: INSIGHTS (AI)
// ============================================================
function renderInsights() {
  const insights = getMarketingInsights();
  document.getElementById('insights-list').innerHTML = insights.map(ins =>
    `<div class="insight-card">
      <div class="insight-header">
        <span style="font-size:24px">${ins.icon}</span>
        <span class="insight-title">${ins.title}</span>
        <span class="badge badge-${ins.type === 'danger' ? 'danger' : ins.type === 'success' ? 'success' : ins.type === 'warning' ? 'warning' : 'info'}">${ins.type === 'danger' ? 'Khẩn' : ins.type === 'success' ? 'Tốt' : ins.type === 'warning' ? 'Chú ý' : 'Gợi ý'}</span>
      </div>
      <div class="insight-body">${ins.body}</div>
      <div class="insight-actions">${(ins.actions||[]).map(a=>`<button class="btn btn-sm btn-outline">${a}</button>`).join('')}</div>
    </div>`
  ).join('');

  // Revenue warning
  const today = getRevenueSummary('today');
  const week = getRevenueSummary('week');
  const avgWeekly = week.revenue / 7;
  const warnHtml = today.revenue < avgWeekly * 0.6 && avgWeekly > 0
    ? `<div class="alert-card danger"><div class="alert-icon">📉</div><div class="alert-content"><div class="alert-title">Cảnh báo doanh thu</div><div class="alert-desc">Hôm nay thấp hơn ${((1-today.revenue/avgWeekly)*100).toFixed(0)}% so với trung bình tuần (${fmt(avgWeekly)}đ/ngày)</div></div></div>`
    : `<div class="alert-card success"><div class="alert-icon">✅</div><div class="alert-content"><div class="alert-title">Doanh thu ổn định</div><div class="alert-desc">Hôm nay: ${fmtFull(today.revenue)} – trong mức bình thường</div></div></div>`;
  document.getElementById('revenue-warning').innerHTML = warnHtml;
}

// ============================================================
// PAGE: MENU ADMIN
// ============================================================
function renderMenuAdmin() {
  const menu = Store.getMenu();
  const inv = Store.getInventory();
  const search = (document.getElementById('menu-admin-search')||{}).value || '';
  const filtered = menu.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  document.getElementById('menu-admin-list').innerHTML = filtered.map(m => {
    let computedCost = m.cost || 0;
    if (m.ingredients && m.ingredients.length > 0) {
      computedCost = m.ingredients.reduce((s, ing) => {
        const stock = inv.find(i => i.name === ing.name);
        return s + (ing.qty * (stock ? stock.costPerUnit : 0));
      }, 0);
    }
    return `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(255,107,53,0.1)">🍽️</div>
      <div class="list-item-content">
        <div class="list-item-title">${m.name} <span style="font-size:11px;color:var(--text3);font-weight:normal">(${m.unit || 'phần'})</span></div>
        <div class="list-item-sub">${m.category} · Giá vốn NL: ${fmt(computedCost)}đ ${m.ingredients?.length ? `· 🧪 ${m.ingredients.length} NL` : ''}</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount">${fmt(m.price)}đ</div>
        <div style="display:flex;gap:4px;margin-top:4px">
          <button class="btn btn-xs btn-outline" onclick="editMenuItem('${m.id}')">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="deleteMenuItem('${m.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-text">Không có món</div></div>';
}

function openAddMenuModal(id) {
  const menu = Store.getMenu();
  const dish = id ? menu.find(m => m.id === id) : null;
  document.getElementById('menu-modal-title').textContent = dish ? 'Sửa món ăn' : 'Thêm món mới';
  document.getElementById('menu-item-id').value = dish?.id || '';
  document.getElementById('menu-item-name').value = dish?.name || '';
  document.getElementById('menu-item-unit').value = dish?.unit || 'phần';
  document.getElementById('menu-item-price').value = dish?.price || '';
  document.getElementById('menu-item-category').value = dish?.category || CATEGORIES[0];
  
  const list = document.getElementById('menu-ingredients-list');
  list.innerHTML = '';
  if (dish && dish.ingredients && dish.ingredients.length > 0) {
    dish.ingredients.forEach(ing => addIngredientRow(ing.name, ing.qty));
  } else {
    // addIngredientRow(); // Add an empty row by default
  }
  
  document.getElementById('menu-modal').classList.add('active');
}

function editMenuItem(id) { openAddMenuModal(id); }

function deleteMenuItem(id) {
  if(!confirm('Xoá món này?')) return;
  const menu = Store.getMenu().filter(m => m.id !== id);
  Store.setMenu(menu);
  renderMenuAdmin();
  showToast('🗑️ Đã xoá món');
}

function submitMenuItem(e) {
  e.preventDefault();
  const menu = Store.getMenu();
  const id = document.getElementById('menu-item-id').value;
  const name = document.getElementById('menu-item-name').value.trim();
  const price = parseFloat(document.getElementById('menu-item-price').value);
  const category = document.getElementById('menu-item-category').value;
  const unit = document.getElementById('menu-item-unit').value.trim() || 'phần';
  if(!name || isNaN(price)) return;

  const ingredients = [];
  const inv = Store.getInventory();
  document.querySelectorAll('#menu-ingredients-list > div').forEach(row => {
    const ingName = row.querySelector('.ing-name-sel').value;
    const qty = parseFloat(row.querySelector('.ing-qty-val').value);
    if (ingName && qty > 0) {
      const stock = inv.find(i => i.name === ingName);
      ingredients.push({ name: ingName, qty, unit: stock ? stock.unit : '' });
    }
  });

  if(id) {
    const idx = menu.findIndex(m => m.id === id);
    if(idx >= 0) { menu[idx] = {...menu[idx], name, unit, price, cost: menu[idx].cost || 0, category, ingredients}; }
  } else {
    menu.push({ id:uid(), name, unit, price, cost: 0, category, ingredients });
  }
  Store.setMenu(menu);
  document.getElementById('menu-modal').classList.remove('active');
  renderMenuAdmin();
  showToast('✅ Đã lưu món ăn!');
}


function addIngredientRow(name='', qty='') {
  const inv = Store.getInventory();
  // Filter inventory list to generate options
  const options = inv.map(i => `<option value="${i.name}" data-cost="${i.costPerUnit}">${i.name} (${i.unit})</option>`).join('');
  
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.innerHTML = `
    <select class="select ing-name-sel" style="flex:2">
      <option value="">-- Chọn NL --</option>
      ${options}
    </select>
    <input type="number" class="input ing-qty-val" placeholder="SL" value="${qty}" style="flex:1" step="0.01">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove();">✕</button>
  `;
  document.getElementById('menu-ingredients-list').appendChild(div);
  
  if (name) {
    const sel = div.querySelector('.ing-name-sel');
    sel.value = name;
  }
}


// ============================================================
// DATE PICKER HELPERS (Finance & Reports)
// ============================================================
let datePickerModes = { finance: 'single', report: 'single' };

function setDateMode(page, mode, btn) {
  datePickerModes[page] = mode;
  const container = document.getElementById(`${page}-date-picker`);
  if(!container) return;
  container.querySelectorAll('.date-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  
  const inputsDiv = document.getElementById(`${page}-date-inputs`);
  if(mode === 'single') {
    inputsDiv.innerHTML = `<input type="date" class="input input-sm date-input" id="${page}-single-date" onchange="applyDateFilter('${page}')">`;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById(`${page}-single-date`).value = today;
  } else {
    inputsDiv.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center">
        <input type="date" class="input input-sm date-input" id="${page}-from-date" onchange="applyDateFilter('${page}')">
        <span style="color:var(--text2);font-size:12px;white-space:nowrap">→</span>
        <input type="date" class="input input-sm date-input" id="${page}-to-date" onchange="applyDateFilter('${page}')">
      </div>`;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
    document.getElementById(`${page}-from-date`).value = weekAgo;
    document.getElementById(`${page}-to-date`).value = today;
  }
  applyDateFilter(page);
}

function applyDateFilter(page) {
  const mode = datePickerModes[page];
  let opts = {};
  
  if(mode === 'single') {
    const dateEl = document.getElementById(`${page}-single-date`);
    if(dateEl && dateEl.value) {
      opts = { date: dateEl.value };
    }
  } else {
    const fromEl = document.getElementById(`${page}-from-date`);
    const toEl = document.getElementById(`${page}-to-date`);
    if(fromEl && toEl && fromEl.value && toEl.value) {
      opts = { fromDate: fromEl.value, toDate: toEl.value };
    }
  }
  
  const period = mode === 'range' ? 'range' : 'day';
  
  if(page === 'finance') {
    financeDateOpts = opts;
    const s = getRevenueSummary(period, opts);
    updateFinanceUI(s);
  } else {
    reportDateOpts = opts;
    reportPeriod = period;
    renderTopItems();
    renderCategoryChart();
    renderHourlyChart();
    renderOrderHistoryList();
  }
}


// ============================================================
// TOAST

// ============================================================
function showToast(msg, type) {
  let toast = document.getElementById('toast');
  if(!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:calc(var(--nav-height,70px) + env(safe-area-inset-bottom,0px) + 16px);left:50%;transform:translateX(-50%) translateY(20px);background:var(--card);color:var(--text);padding:10px 14px;border-radius:14px;font-size:13px;font-weight:600;z-index:999;opacity:0;transition:all 0.3s;white-space:normal;word-break:break-word;line-height:1.45;max-width:min(92vw,420px);text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid var(--border);';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.borderColor = type === 'success' ? 'var(--success)' : type === 'danger' ? 'var(--danger)' : 'var(--border)';
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

// ============================================================
// RESET DATA
// ============================================================
function resetAllData() {
  document.getElementById('reset-modal').classList.add('active');
}

function confirmResetData(keepMenu, keepInventory) {
  Store.resetAll(keepMenu, keepInventory);
  orderItems = {};
  document.getElementById('reset-modal').classList.remove('active');
  applyStoreSettings();
  navigate('tables');
  updateAlertBadge();
  showToast('🔄 Đã reset dữ liệu! Sẵn sàng hoạt động.', 'success');
}

// ============================================================
// SETTINGS PAGE
// ============================================================
function renderSettings() {
  const s = Store.getSettings();
  const fields = [
    ['set-storeName',    s.storeName   || ''],
    ['set-storeSlogan',  s.storeSlogan || ''],
    ['set-storePhone',   s.storePhone  || ''],
    ['set-storeAddress', s.storeAddress|| ''],
    ['set-bankName',     s.bankName    || 'Vietinbank'],
    ['set-bankAccount',  s.bankAccount || ''],
    ['set-bankOwner',    s.bankOwner   || ''],
    ['set-geminiApiKey', s.geminiApiKey|| ''],
    ['set-googleTTSKey', s.googleTTSKey|| ''],
    ['set-tableCount',   s.tableCount  || 20],
    ['set-taxRate',      s.taxRate != null ? s.taxRate : 0],
  ];
  fields.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if(el) el.value = val;
  });
  // Update VAT display
  const vatDisplay = document.getElementById('vat-current-display');
  if(vatDisplay) vatDisplay.textContent = (s.taxRate || 0) + '%';
  const autoEl = document.getElementById('set-autoBackup');
  if(autoEl) autoEl.checked = s.autoBackup !== false;
  const quotaEl = document.getElementById('set-storageQuotaMb');
  if(quotaEl) quotaEl.value = Math.min(500, Math.max(10, Number(s.storageQuotaMb || 500)));

  const autoWeeklyEl  = document.getElementById('set-autoExportWeekly');
  const autoMonthlyEl = document.getElementById('set-autoExportMonthly');
  const autoPushWeeklyDriveEl = document.getElementById('set-autoPushWeeklyReportToGoogleDrive');
  if(autoWeeklyEl)  autoWeeklyEl.checked  = !!s.autoExportWeekly;
  if(autoMonthlyEl) autoMonthlyEl.checked = !!s.autoExportMonthly;
  if(autoPushWeeklyDriveEl) {
    autoPushWeeklyDriveEl.checked = !!s.autoPushWeeklyReportToGoogleDrive;
    autoPushWeeklyDriveEl.disabled = !s.autoExportWeekly;
  }

  const reportTypeEl = document.getElementById('set-reportExportType');
  if(reportTypeEl && s.reportExportType) reportTypeEl.value = s.reportExportType;
  const reportPeriodEl = document.getElementById('set-reportExportPeriod');
  if(reportPeriodEl && s.reportExportPeriod) reportPeriodEl.value = s.reportExportPeriod;
  const reportDateEl = document.getElementById('set-reportExportDate');
  if(reportDateEl && s.reportExportDate) reportDateEl.value = s.reportExportDate;

  const autoUploadDriveEl = document.getElementById('set-autoUploadToGoogleDrive');
  if(autoUploadDriveEl) autoUploadDriveEl.checked = !!s.autoUploadToGoogleDrive;
  const gdriveUrlEl = document.getElementById('set-googleDriveUploadUrl');
  if(gdriveUrlEl) gdriveUrlEl.value = s.googleDriveUploadUrl || '';
  const gdriveFolderEl = document.getElementById('set-googleDriveFolderId');
  if(gdriveFolderEl) gdriveFolderEl.value = s.googleDriveFolderId || '';

  // Hiển thị/ẩn phần chọn ngày báo cáo theo kỳ
  try { toggleReportExportDate(); } catch(_) {}
  try { toggleWeeklyDriveCheckbox(); } catch(_) {}

  const logoPreview = document.getElementById('set-logo-preview');
  const removeBtn = document.getElementById('set-logo-remove');
  if (logoPreview) {
    if (s.storeLogo) {
      logoPreview.innerHTML = `<img src="${s.storeLogo}" style="width:100%;height:100%;object-fit:cover;">`;
      if(removeBtn) removeBtn.style.display = 'inline-block';
    } else {
      logoPreview.innerHTML = '<span style="font-size:20px;">🍢</span>';
      if(removeBtn) removeBtn.style.display = 'none';
    }
  }

  renderBackupList();

  // Last backup info
  const last = Store.getLastBackupTime();
  const lastEl = document.getElementById('last-backup-time');
  if(lastEl) lastEl.textContent = last ? fmtDateTime(last) : 'Chưa có backup';
  updateStorageQuotaInfo();
}

function submitSettings(e) {
  if(e && e.preventDefault) e.preventDefault();
  const s = Store.getSettings();
  const oldTableCount = s.tableCount || 20;

  const nameEl        = document.getElementById('set-storeName');
  const sloganEl      = document.getElementById('set-storeSlogan');
  const phoneEl       = document.getElementById('set-storePhone');
  const addressEl     = document.getElementById('set-storeAddress');
  const bankNameEl    = document.getElementById('set-bankName');
  const bankAccountEl = document.getElementById('set-bankAccount');
  const bankOwnerEl   = document.getElementById('set-bankOwner');
  const geminiEl      = document.getElementById('set-geminiApiKey');
  const ttsKeyEl      = document.getElementById('set-googleTTSKey');
  const tableCountEl  = document.getElementById('set-tableCount');
  const autoBackupEl  = document.getElementById('set-autoBackup');
  const storageQuotaEl = document.getElementById('set-storageQuotaMb');
  const autoExportWeeklyEl  = document.getElementById('set-autoExportWeekly');
  const autoExportMonthlyEl = document.getElementById('set-autoExportMonthly');
  const autoPushWeeklyDriveEl = document.getElementById('set-autoPushWeeklyReportToGoogleDrive');
  const reportExportTypeEl   = document.getElementById('set-reportExportType');
  const reportExportPeriodEl = document.getElementById('set-reportExportPeriod');
  const reportExportDateEl   = document.getElementById('set-reportExportDate');
  const autoUploadDriveEl    = document.getElementById('set-autoUploadToGoogleDrive');
  const gdriveUrlEl          = document.getElementById('set-googleDriveUploadUrl');
  const gdriveFolderEl       = document.getElementById('set-googleDriveFolderId');
  const taxRateEl            = document.getElementById('set-taxRate');

  const newTableCount = tableCountEl ? (parseInt(tableCountEl.value) || 20) : oldTableCount;
  const quotaMbRaw = storageQuotaEl ? parseInt(storageQuotaEl.value, 10) : Number(s.storageQuotaMb || 500);
  const storageQuotaMb = Math.min(500, Math.max(10, Number.isFinite(quotaMbRaw) ? quotaMbRaw : 500));
  const newTaxRate = taxRateEl ? Math.min(100, Math.max(0, parseFloat(taxRateEl.value) || 0)) : (s.taxRate || 0);

  const updated = {
    ...s,
    storeName:    (nameEl    && nameEl.value.trim())    || s.storeName,
    storeSlogan:  (sloganEl  && sloganEl.value.trim())  || '',
    storePhone:   (phoneEl   && phoneEl.value.trim())   || '',
    storeAddress: (addressEl && addressEl.value.trim()) || '',
    bankName:     (bankNameEl    && bankNameEl.value.trim())    || 'Vietinbank',
    bankAccount:  (bankAccountEl && bankAccountEl.value.trim()) || '',
    bankOwner:    (bankOwnerEl   && bankOwnerEl.value.trim())   || '',
    geminiApiKey: (geminiEl      && geminiEl.value.trim())      || '',
    googleTTSKey: (ttsKeyEl      && ttsKeyEl.value.trim())      || '',
    tableCount:   newTableCount,
    storageQuotaMb,
    taxRate:      newTaxRate,
    autoBackup:   autoBackupEl ? autoBackupEl.checked : s.autoBackup,
    autoExportWeekly:  autoExportWeeklyEl  ? autoExportWeeklyEl.checked  : (s.autoExportWeekly  || false),
    autoExportMonthly: autoExportMonthlyEl ? autoExportMonthlyEl.checked : (s.autoExportMonthly || false),
    autoPushWeeklyReportToGoogleDrive: autoPushWeeklyDriveEl && autoExportWeeklyEl && autoExportWeeklyEl.checked
      ? autoPushWeeklyDriveEl.checked
      : false,
    reportExportType: reportExportTypeEl ? reportExportTypeEl.value : (s.reportExportType || 'revenue'),
    reportExportPeriod: reportExportPeriodEl ? reportExportPeriodEl.value : (s.reportExportPeriod || 'today'),
    reportExportDate: reportExportDateEl ? reportExportDateEl.value : (s.reportExportDate || ''),
    autoUploadToGoogleDrive: autoUploadDriveEl ? autoUploadDriveEl.checked : (s.autoUploadToGoogleDrive || false),
    googleDriveUploadUrl: gdriveUrlEl ? gdriveUrlEl.value.trim() : (s.googleDriveUploadUrl || ''),
    googleDriveFolderId: gdriveFolderEl ? gdriveFolderEl.value.trim() : (s.googleDriveFolderId || ''),
  };
  Store.setSettings(updated);
  // Update VAT display after save
  const vatDisplay = document.getElementById('vat-current-display');
  if(vatDisplay) vatDisplay.textContent = newTaxRate + '%';

  // Nếu số bàn thay đổi → rebuild danh sách bàn và reset active orders
  if(newTableCount !== oldTableCount) {
    Store.rebuildTables(newTableCount);
    // Xoá các order của bàn vượt số lượng mới
    const orders = Store.getOrders();
    Object.keys(orders).forEach(tid => {
      if(parseInt(tid) > newTableCount) delete orders[tid];
    });
    Store.setOrders(orders);
    // Xoá cached order items
    Object.keys(orderItems).forEach(tid => {
      if(parseInt(tid) > newTableCount) delete orderItems[tid];
    });
  }

  applyStoreSettings();
  updateStorageQuotaInfo();
  if(storageQuotaEl) storageQuotaEl.value = storageQuotaMb;
  showToast('✅ Đã lưu cài đặt!' + (newTableCount !== oldTableCount ? ` Sơ đồ bàn cập nhật: ${newTableCount} bàn.` : ''), 'success');
}

function getLocalStorageUsageBytes() {
  try {
    let total = 0;
    for(let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      const val = localStorage.getItem(key) || '';
      total += (key.length + val.length) * 2; // UTF-16 (ước lượng)
    }
    return total;
  } catch(_) {
    return 0;
  }
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  if(mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function updateStorageQuotaInfo() {
  const infoEl = document.getElementById('storage-quota-info');
  if(!infoEl) return;
  const s = Store.getSettings();
  const quotaMb = Math.min(500, Math.max(10, Number(s.storageQuotaMb || 500)));
  const usedBytes = getLocalStorageUsageBytes();
  const quotaBytes = quotaMb * 1024 * 1024;
  const usedPercent = quotaBytes > 0 ? Math.min(999, (usedBytes / quotaBytes) * 100) : 0;
  const status = usedBytes > quotaBytes ? '⚠️ Vượt quota' : (usedPercent >= 85 ? '⚠️ Sắp đầy' : '✅ Bình thường');
  infoEl.innerHTML = `Đang dùng: <b>${formatBytes(usedBytes)}</b> / ${quotaMb} MB (${usedPercent.toFixed(1)}%) · ${status}`;
  infoEl.style.color = usedBytes > quotaBytes ? 'var(--danger)' : (usedPercent >= 85 ? 'var(--warning)' : 'var(--text2)');
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('❌ Ảnh quá lớn. Chọn ảnh < 2MB', 'danger');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    const s = Store.getSettings();
    s.storeLogo = dataUrl;
    Store.setSettings(s);
    applyStoreSettings();
    renderSettings();
    showToast('✅ Đã cập nhật logo!', 'success');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  const s = Store.getSettings();
  s.storeLogo = null;
  Store.setSettings(s);
  applyStoreSettings();
  renderSettings();
  showToast('🗑️ Đã xoá logo!', 'success');
}

// ============================================================
// BACKUP
// ============================================================
function manualBackup() {
  try {
    const s = Store.getSettings();
    const quotaMb = Math.min(500, Math.max(10, Number(s.storageQuotaMb || 500)));
    const usedBytes = getLocalStorageUsageBytes();
    if(usedBytes > quotaMb * 1024 * 1024) {
      showToast('⚠️ Đã vượt quota cài đặt. Nên dọn dữ liệu nặng hoặc xuất file backup.', 'warning');
    }
    const snapshot = Store.saveLocalBackup();
    renderBackupList();
    const last = Store.getLastBackupTime();
    const lastEl = document.getElementById('last-backup-time');
    if(lastEl) lastEl.textContent = last ? fmtDateTime(last) : '';
    if(!snapshot) {
      // Fallback: nếu localStorage quá đầy, vẫn tạo bản backup file để không mất dữ liệu sao lưu.
      exportBackup();
      showToast('⚠️ Bộ nhớ cục bộ đầy. Đã tự động xuất file backup.', 'warning');
      updateStorageQuotaInfo();
      return;
    }
    updateStorageQuotaInfo();
    showToast('💾 Đã backup thành công!', 'success');
  } catch(err) {
    showToast('❌ Backup thất bại: ' + err.message, 'danger');
  }
}

function exportBackup() {
  try {
    const snapshot = Store.getFullBackup();
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.href     = url;
    a.download = `pos_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Đã xuất file backup!', 'success');
  } catch(err) {
    showToast('❌ Xuất thất bại: ' + err.message, 'danger');
  }
}

/** Xuất chỉ mục cài đặt đã lưu trong bộ nhớ (sau khi bấm Lưu cài đặt), không gồm menu/đơn hàng/... */
function exportSettingsBackup() {
  try {
    const settings = Store.getSettings();
    const payload = {
      type: 'gkhl_settings_backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pos_cai_dat_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📋 Đã xuất file cài đặt đã lưu.', 'success');
  } catch(err) {
    showToast('❌ Xuất cài đặt thất bại: ' + (err.message || err), 'danger');
  }
}

function cleanupHeavyData() {
  if(!confirm('Dọn dữ liệu nặng sẽ xóa ảnh order, ảnh chứng từ nhập hàng và giữ lại 120 tin nhắn AI mới nhất. Tiếp tục?')) return;
  try {
    const history = Store.getHistory() || [];
    let removedOrderPhotos = 0;
    const nextHistory = history.map(o => {
      if(!o || typeof o !== 'object') return o;
      const photos = Array.isArray(o.photos) ? o.photos : [];
      removedOrderPhotos += photos.length;
      return photos.length ? { ...o, photos: [] } : o;
    });
    Store.set('gkhl_history', nextHistory);

    const purchaseMap = Store.getPurchasePhotos() || {};
    let removedPurchasePhotos = 0;
    Object.values(purchaseMap).forEach(entry => {
      const photos = Array.isArray(entry) ? entry : (entry && Array.isArray(entry.photos) ? entry.photos : []);
      removedPurchasePhotos += photos.length;
    });
    Store.setPurchasePhotos({});
    Store.setOrderPhotos({});

    const aiHistory = Store.getAIHistory() || [];
    const trimmedAiHistory = aiHistory.slice(-120);
    const removedAiMessages = Math.max(0, aiHistory.length - trimmedAiHistory.length);
    Store.setAIHistory(trimmedAiHistory);

    renderBackupList();
    renderOrderHistoryList();
    updateStorageQuotaInfo();
    showToast(`🧹 Đã dọn dữ liệu nặng: ${removedOrderPhotos + removedPurchasePhotos} ảnh, ${removedAiMessages} tin AI cũ.`, 'success');
  } catch(err) {
    showToast('❌ Dọn dữ liệu thất bại: ' + (err.message || err), 'danger');
  }
}

function excelThinBorder() {
  const color = { argb: 'FFAAAAAA' };
  return {
    top: { style: 'thin', color },
    left: { style: 'thin', color },
    bottom: { style: 'thin', color },
    right: { style: 'thin', color },
  };
}

function excelColLetter(n) {
  let s = '';
  let x = n;
  while(x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function excelFmtVnInt(n) {
  return (Math.round(Number(n) || 0)).toLocaleString('vi-VN');
}

function applyReportTitleBlock(ws, { title, periodLabel, exportDateStr, lastCol }) {
  const end = excelColLetter(lastCol);
  ws.mergeCells(`A1:${end}1`);
  const t = ws.getCell('A1');
  t.value = title;
  t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  t.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.getRow(1).height = 28;

  ws.getCell('A2').value = 'Kỳ báo cáo:';
  ws.getCell('B2').value = periodLabel;
  ws.getCell('A3').value = 'Ngày xuất:';
  ws.getCell('B3').value = exportDateStr;
  ws.getCell('A2').font = { bold: true, size: 11 };
  ws.getCell('A3').font = { bold: true, size: 11 };
  ws.getCell('B2').font = { size: 11 };
  ws.getCell('B3').font = { size: 11 };
  ['A2', 'B2', 'A3', 'B3'].forEach(a => {
    ws.getCell(a).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
  ws.getColumn(1).width = Math.max(ws.getColumn(1).width || 0, 14);
  ws.getColumn(2).width = Math.max(ws.getColumn(2).width || 0, 30);
  ws.getRow(4).height = 6;
}

function paintExcelHeaderRow(ws, rowIndex, colCount) {
  const row = ws.getRow(rowIndex);
  for(let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    cell.border = excelThinBorder();
  }
  row.height = 22;
}

function paintExcelTotalRow(ws, rowIndex, colCount) {
  const row = ws.getRow(rowIndex);
  for(let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };
    cell.border = excelThinBorder();
  }
}

function setRowBorders(ws, rowIndex, colCount) {
  for(let c = 1; c <= colCount; c++) {
    ws.getRow(rowIndex).getCell(c).border = excelThinBorder();
  }
}

async function exportReportExcel(override = {}) {
  const typeEl   = document.getElementById('set-reportExportType');
  const periodEl = document.getElementById('set-reportExportPeriod');
  const dateEl   = document.getElementById('set-reportExportDate');

  const typeRaw = override.type || (typeEl ? typeEl.value : 'revenue');
  const type = String(typeRaw || 'revenue').trim().toLowerCase();
  const period = override.period || (periodEl ? periodEl.value : 'today');
  const date   = override.date   || (dateEl   ? dateEl.value   : '');

  const skipLocalDownload = !!override.skipLocalDownload;
  const forceUploadToDrive = override.uploadToDrive === true;

  const ExcelJSLib = typeof ExcelJS !== 'undefined' ? ExcelJS : (typeof window !== 'undefined' ? window.ExcelJS : undefined);
  if(!ExcelJSLib) {
    showToast('Không tải được thư viện Excel. Vui lòng tải lại trang.', 'danger');
    return false;
  }

  const opts = {};
  if(period === 'day' && date) opts.date = date;

  const fmtDateCell = (iso, onlyDate = false) => {
    if(!iso) return '';
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return '';
    return onlyDate ? d.toISOString().slice(0, 10) : d.toLocaleString('vi-VN');
  };

  const exportDateStr = new Date().toLocaleString('vi-VN');
  const periodLabel = (() => {
    if(period === 'today') return 'Hôm nay';
    if(period === 'day' && date) {
      const d = new Date(`${date}T12:00:00`);
      return Number.isNaN(d.getTime()) ? 'Ngày cụ thể' : `Ngày ${d.toLocaleDateString('vi-VN')}`;
    }
    if(period === 'day') return 'Ngày cụ thể';
    if(period === 'week') return '7 ngày gần nhất';
    if(period === 'month') return 'Tháng hiện tại';
    return 'Tất cả';
  })();

  const getFilteredPurchases = () => {
    const purchases = Store.getPurchases();
    const now = new Date();
    return purchases.filter(p => {
      const d = new Date(p.date);
      if(Number.isNaN(d.getTime())) return false;
      if(period === 'today') return d.toDateString() === now.toDateString();
      if(period === 'day' && date) return d.toDateString() === new Date(date).toDateString();
      if(period === 'week') return (now - d) / 86400000 <= 7;
      if(period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const HEADER_ROW = 5;
  const settings = Store.getSettings();
  const vatRate = settings.taxRate != null ? Number(settings.taxRate) : 0; // % VAT from settings

  const fillRevenueSheet = ws => {
    const lastCol = 9;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO DOANH THU (THEO MON)',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const vatLabel = vatRate > 0 ? `Thuế VAT (${vatRate}%)` : 'Thuế VAT (0%)';
    const headers = [
      'TT', 'Ngày bán', 'Mã sản phẩm', 'Tên sản phẩm', 'Số lượng bán',
      'Đơn giá (VND)', 'Thành tiền (VND)', vatLabel, 'Sau VAT (VND)',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 4; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 5; c <= 9; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    const orders = filterHistory(period === 'day' ? 'day' : period, opts);
    let r = HEADER_ROW + 1;
    let stt = 1;
    const totals = { qty: 0, gross: 0, vat: 0, net: 0 };
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const gross = qty * price;
        const vat = vatRate > 0 ? Math.round(gross * vatRate / 100) : 0;
        const net = gross - vat;
        const row = ws.getRow(r);
        row.getCell(1).value = stt++;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).value = fmtDateCell(o.paidAt, true);
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).value = item.id || '';
        row.getCell(4).value = item.name || '';
        row.getCell(5).value = qty;
        row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(6).value = excelFmtVnInt(price);
        row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(7).value = excelFmtVnInt(gross);
        row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(8).value = excelFmtVnInt(vat);
        row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(9).value = excelFmtVnInt(net);
        row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
        setRowBorders(ws, r, lastCol);
        totals.qty += qty;
        totals.gross += gross;
        totals.vat += vat;
        totals.net += net;
        r++;
      });
    });

    ws.mergeCells(r, 1, r, 4);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(5).value = totals.qty;
    tr.getCell(5).font = { bold: true };
    tr.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(6).value = '';
    tr.getCell(7).value = excelFmtVnInt(totals.gross);
    tr.getCell(7).font = { bold: true };
    tr.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(8).value = excelFmtVnInt(totals.vat);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = excelFmtVnInt(totals.net);
    tr.getCell(9).font = { bold: true };
    tr.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [
      { width: 6 }, { width: 12 }, { width: 12 }, { width: 32 },
      { width: 14 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 20 },
    ];
  };

  // Sheet đầy đủ lịch sử đơn hàng (theo đơn, không theo từng món)
  const fillOrdersSheet = ws => {
    const lastCol = 14;
    applyReportTitleBlock(ws, {
      title: 'LỊCH SỬ ĐƠN HÀNG (ĐẦY ĐỦ)',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const vatLabel = vatRate > 0 ? `VAT (${vatRate}%)` : 'VAT';
    const headers = [
      'TT', 'Mã đơn', 'Thời gian', 'Bàn/Kênh', 'Danh sách món',
      'Tiền hàng (VND)', 'Giảm giá (VND)', 'Phí ship (VND)', vatLabel,
      'Tổng cộng (VND)', 'Giá vốn (VND)', 'Lãi gộp (VND)', 'PT Thanh toán', 'Ghi chú',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hr.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hr.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 6; c <= 12; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(13).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hr.getCell(14).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    const orders = filterHistory(period === 'day' ? 'day' : period, opts);
    let r = HEADER_ROW + 1;
    let stt = 1;
    let totalRevenue = 0, totalDiscount = 0, totalShipping = 0, totalVat = 0, totalCost = 0;
    orders.forEach(o => {
      const itemsTotal = (o.items||[]).reduce((s,i) => s + i.price*i.qty, 0);
      const discount = Number(o.discount || 0);
      const shipping = Number(o.shipping || 0);
      const vatAmt = Number(o.vatAmount || 0);
      const cost = Number(o.cost || 0);
      const total = Number(o.total || 0);
      const gross = total - cost;
      const payLabel = o.payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
      const itemsText = (o.items||[]).map(i => `${i.name} x${i.qty} (${excelFmtVnInt(i.price*i.qty)}đ)`).join('; ');

      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = o.id || (o.historyId || '');
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).value = fmtDateCell(o.paidAt);
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).value = o.tableName || '';
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(5).value = itemsText;
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(6).value = excelFmtVnInt(itemsTotal);
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).value = excelFmtVnInt(discount);
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).value = excelFmtVnInt(shipping);
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).value = excelFmtVnInt(vatAmt);
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).value = excelFmtVnInt(total);
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).font = { bold: true };
      row.getCell(11).value = excelFmtVnInt(cost);
      row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(12).value = excelFmtVnInt(gross);
      row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(13).value = payLabel;
      row.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(14).value = o.note || '';
      row.getCell(14).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      setRowBorders(ws, r, lastCol);
      totalRevenue += total;
      totalDiscount += discount;
      totalShipping += shipping;
      totalVat += vatAmt;
      totalCost += cost;
      r++;
    });

    // Total row
    ws.mergeCells(r, 1, r, 5);
    const tr = ws.getRow(r);
    tr.getCell(1).value = `TỔNG (${orders.length} đơn)`;
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(6).value = '';
    tr.getCell(7).value = excelFmtVnInt(totalDiscount);
    tr.getCell(7).font = { bold: true };
    tr.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(8).value = excelFmtVnInt(totalShipping);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = excelFmtVnInt(totalVat);
    tr.getCell(9).font = { bold: true };
    tr.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(10).value = excelFmtVnInt(totalRevenue);
    tr.getCell(10).font = { bold: true };
    tr.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(11).value = excelFmtVnInt(totalCost);
    tr.getCell(11).font = { bold: true };
    tr.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(12).value = excelFmtVnInt(totalRevenue - totalCost);
    tr.getCell(12).font = { bold: true };
    tr.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(13).value = '';
    tr.getCell(14).value = '';
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [
      { width: 6 }, { width: 18 }, { width: 20 }, { width: 16 }, { width: 50 },
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 },
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 24 },
    ];
  };


  const fillExpenseSheet = ws => {
    const lastCol = 6;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO CHI PHÍ',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = ['TT', 'Ngày chi', 'Mã chi phí', 'Nội dung', 'Danh mục', 'Số tiền (VND)'];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 5; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(6).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    const expenses = filterExpenses(period === 'day' ? 'day' : period, opts);
    let r = HEADER_ROW + 1;
    let stt = 1;
    let total = 0;
    expenses.forEach(e => {
      const amount = Number(e.amount || 0);
      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = fmtDateCell(e.date, true);
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).value = e.id || '';
      row.getCell(4).value = e.name || '';
      row.getCell(5).value = e.category || '';
      row.getCell(6).value = excelFmtVnInt(amount);
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      setRowBorders(ws, r, lastCol);
      total += amount;
      r++;
    });
    ws.mergeCells(r, 1, r, 5);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(6).value = excelFmtVnInt(total);
    tr.getCell(6).font = { bold: true };
    tr.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [{ width: 6 }, { width: 12 }, { width: 12 }, { width: 28 }, { width: 14 }, { width: 18 }];
  };

  const fillPurchaseSheet = ws => {
    const lastCol = 10;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO NHẬP HÀNG',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = [
      'TT', 'Ngày nhập', 'Mã phiếu', 'Nguyên liệu', 'Số lượng', 'Đơn vị',
      'Đơn giá (VND)', 'Thành tiền (VND)', 'Nhà cung cấp', 'Ghi chú',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 4; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(5).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(6).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 7; c <= 8; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(9).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    hr.getCell(10).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    const filtered = getFilteredPurchases();
    let r = HEADER_ROW + 1;
    let stt = 1;
    let totalQty = 0;
    let totalAmount = 0;
    filtered.forEach(p => {
      const qty = Number(p.qty || 0);
      const amount = Number(p.price || 0);
      const cpu = Number(p.costPerUnit || 0);
      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = fmtDateCell(p.date, true);
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).value = p.id || '';
      row.getCell(4).value = p.name || '';
      row.getCell(5).value = qty;
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).value = p.unit || '';
      row.getCell(7).value = excelFmtVnInt(cpu);
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).value = excelFmtVnInt(amount);
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).value = p.supplier || '';
      row.getCell(10).value = p.note || '';
      setRowBorders(ws, r, lastCol);
      totalQty += qty;
      totalAmount += amount;
      r++;
    });
    ws.mergeCells(r, 1, r, 4);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(5).value = totalQty;
    tr.getCell(5).font = { bold: true };
    tr.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(6).value = '';
    tr.getCell(7).value = '';
    tr.getCell(8).value = excelFmtVnInt(totalAmount);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = '';
    tr.getCell(10).value = '';
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [
      { width: 6 }, { width: 12 }, { width: 12 }, { width: 24 }, { width: 10 }, { width: 8 },
      { width: 14 }, { width: 16 }, { width: 20 }, { width: 24 },
    ];
  };

  const fillInventorySheet = ws => {
    const lastCol = 9;
    applyReportTitleBlock(ws, {
      title: 'BÁO CÁO TỒN KHO',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = [
      'TT', 'Mã hàng', 'Tên nguyên liệu', 'Đơn vị', 'Tồn hiện tại', 'Tồn tối thiểu',
      'Giá vốn (VND)', 'Giá trị tồn (VND)', 'Trạng thái',
    ];
    headers.forEach((h, i) => { ws.getRow(HEADER_ROW).getCell(i + 1).value = h; });
    paintExcelHeaderRow(ws, HEADER_ROW, lastCol);
    const hr = ws.getRow(HEADER_ROW);
    hr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for(let c = 2; c <= 4; c++) hr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for(let c = 5; c <= 7; c++) hr.getCell(c).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    hr.getCell(9).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    const inv = Store.getInventory() || [];
    let r = HEADER_ROW + 1;
    let stt = 1;
    let totalValue = 0;
    inv.forEach(i => {
      const qty = Number(i.qty || 0);
      const min = Number(i.minQty || 0);
      const cost = Number(i.costPerUnit || 0);
      const value = qty * cost;
      const status = qty <= 0 ? 'Hết hàng' : (qty <= min ? 'Sắp hết' : 'Bình thường');
      const row = ws.getRow(r);
      row.getCell(1).value = stt++;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = i.id || '';
      row.getCell(3).value = i.name || '';
      row.getCell(4).value = i.unit || '';
      row.getCell(5).value = qty;
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).value = min;
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).value = excelFmtVnInt(cost);
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).value = excelFmtVnInt(value);
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).value = status;
      setRowBorders(ws, r, lastCol);
      totalValue += value;
      r++;
    });
    ws.mergeCells(r, 1, r, 7);
    const tr = ws.getRow(r);
    tr.getCell(1).value = 'TỔNG';
    tr.getCell(1).font = { bold: true };
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    tr.getCell(8).value = excelFmtVnInt(totalValue);
    tr.getCell(8).font = { bold: true };
    tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    tr.getCell(9).value = '';
    paintExcelTotalRow(ws, r, lastCol);

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: lastCol },
    };
    ws.columns = [{ width: 6 }, { width: 12 }, { width: 28 }, { width: 8 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 14 }];
  };

  const workbook = new ExcelJSLib.Workbook();
  workbook.creator = 'Ganh Kho POS';
  let filename = 'bao_cao_tong_hop';

  if(type === 'revenue') {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    fillRevenueSheet(workbook.addWorksheet('DoanhThu_TheoMon', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_doanh_thu';
  } else if(type === 'orders') {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    filename = 'lich_su_don_hang';
  } else if(type === 'expense') {
    fillExpenseSheet(workbook.addWorksheet('ChiPhi', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_chi_phi';
  } else if(type === 'purchase') {
    fillPurchaseSheet(workbook.addWorksheet('NhapHang', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_nhap_hang';
  } else if(type === 'inventory') {
    fillInventorySheet(workbook.addWorksheet('TonKho', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_ton_kho';
  } else if(type === 'all') {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    fillRevenueSheet(workbook.addWorksheet('DoanhThu_TheoMon', { views: [{ showGridLines: true }] }));
    fillExpenseSheet(workbook.addWorksheet('ChiPhi', { views: [{ showGridLines: true }] }));
    fillPurchaseSheet(workbook.addWorksheet('NhapHang', { views: [{ showGridLines: true }] }));
    fillInventorySheet(workbook.addWorksheet('TonKho', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_tong_hop';
  } else {
    fillOrdersSheet(workbook.addWorksheet('LichSuDon', { views: [{ showGridLines: true }] }));
    fillRevenueSheet(workbook.addWorksheet('DoanhThu_TheoMon', { views: [{ showGridLines: true }] }));
    filename = 'bao_cao_doanh_thu';
  }

  const wbout = await workbook.xlsx.writeBuffer();
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const dateStr = new Date().toISOString().slice(0,10);
  const downloadName = `${filename}_${dateStr}.xlsx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if(!skipLocalDownload) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = Store.getSettings();
  const wantsUpload = forceUploadToDrive || (override.uploadToDrive !== false && s.autoUploadToGoogleDrive);
  let uploadOk = null;
  let uploadDriveOpaque = false;

  if(wantsUpload) {
    const { uploadUrl, folderId } = getGoogleDriveConfigFromUi();
    if(!uploadUrl || !folderId) {
      if(forceUploadToDrive) {
        showToast('Thiếu URL Web App hoặc ID thư mục Google Drive.', 'warning');
        return false;
      }
      if(s.autoUploadToGoogleDrive && !skipLocalDownload) {
        showToast('⚠️ Bật tự đẩy sau xuất nhưng thiếu URL hoặc ID thư mục Google Drive.', 'warning');
      }
    } else {
      try {
        const up = await uploadFileToGoogleDriveByEndpoint({
          uploadUrl,
          folderId,
          filename: downloadName,
          mimeType,
          blob,
        });
        uploadOk = true;
        uploadDriveOpaque = !!(up && up.opaque);
      } catch(err) {
        console.warn('uploadFileToGoogleDrive error', err);
        uploadOk = false;
        uploadDriveOpaque = false;
        if(forceUploadToDrive) {
          showToast('⚠️ Đẩy lên Google Drive thất bại: ' + (err.message || err), 'warning');
          return false;
        }
        showToast('⚠️ Upload Google Drive thất bại: ' + (err.message || err), 'warning');
      }
    }
  }

  if(!skipLocalDownload) {
    if(uploadOk === true && s.autoUploadToGoogleDrive) {
      showToast(uploadDriveOpaque
        ? 'Đã xuất Excel. Đã gửi bản sao lên Drive — vui lòng kiểm tra thư mục (trình duyệt có thể không đọc được phản hồi).'
        : 'Đã xuất file báo cáo Excel và đẩy bản .xlsx lên Google Drive.', 'success');
    } else {
      showToast('Đã xuất file báo cáo Excel.', 'success');
    }
  } else if(uploadOk === true) {
    showToast(uploadDriveOpaque
      ? '☁️ Đã gửi file .xlsx lên Drive. Mở thư mục đã chọn để xác nhận (chế độ tương thích CORS: không đọc được phản hồi chi tiết).'
      : '☁️ Đã đẩy file báo cáo (.xlsx) lên thư mục Google Drive đã chọn.', 'success');
  }

  return true;
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result || '';
      const base64 = dataUrl.toString().split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Không đọc được file để upload.'));
    reader.readAsDataURL(blob);
  });
}

function normalizeGoogleScriptWebAppUrl(raw) {
  let u = String(raw || '').trim();
  if(!u) return '';
  u = u.replace(/\s+/g, '');
  if(/\/usercodeapp\.app$/i.test(u) || /script\.googleusercontent\.com/i.test(u)) {
    return u;
  }
  return u.replace(/\/$/, '');
}

function isGoogleAppsScriptWebAppUrl(u) {
  if(!u) return false;
  return /script\.google\.com\/macros\/s\//i.test(u)
    || /script\.googleusercontent\.com\/macros\/exec/i.test(u);
}

/**
 * Google Apps Script /exec thường chặn CORS khi POST application/json (preflight OPTIONS).
 * Gửi body là JSON nhưng Content-Type: text/plain để tránh preflight — doPost vẫn JSON.parse(postData.contents).
 * Nếu vẫn Failed to fetch: thử mode no-cors (không đọc được phản hồi, coi như đã gửi).
 */
async function uploadFileToGoogleDriveByEndpoint({ uploadUrl, folderId, filename, mimeType, blob }) {
  const url = normalizeGoogleScriptWebAppUrl(uploadUrl);
  if(!url) {
    throw new Error('Thiếu URL Web App.');
  }
  if(!/^https:\/\//i.test(url)) {
    throw new Error('URL Web App phải dùng https://');
  }
  if(/\/dev($|\?)/i.test(url)) {
    throw new Error('Không dùng URL /dev. Hãy triển khai Web App và dùng URL kết thúc /exec (hoặc URL triển khai đầy đủ Google cung cấp).');
  }

  const base64Data = await blobToBase64(blob);
  const payload = { filename, mimeType, base64Data, folderId };
  const body = JSON.stringify(payload);

  const readResponse = async (res) => {
    const text = await res.text();
    if(!text) return null;
    try {
      return JSON.parse(text);
    } catch(_) {
      return { _raw: text };
    }
  };

  const assertOk = (data, res) => {
    if(data && data.success === false) {
      throw new Error(data.message || data.error || 'Google Drive từ chối lưu file.');
    }
    if(!res.ok) {
      const msg = (data && (data.message || data.error)) ? (data.message || data.error) : `HTTP ${res.status}`;
      throw new Error(msg);
    }
  };

  const postCorsPlain = async (contentType) => {
    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Content-Type': contentType },
      body,
    });
    const data = await readResponse(res);
    assertOk(data, res);
    return { data, opaque: false };
  };

  const tryNoCorsPlain = async () => {
    for(const ct of ['text/plain;charset=UTF-8', 'text/plain']) {
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          cache: 'no-store',
          credentials: 'omit',
          headers: { 'Content-Type': ct },
          body,
        });
        return { opaque: true };
      } catch(e) {
        /* thử Content-Type khác */
      }
    }
    throw new Error('Không gửi được tới Web App (kiểm tra mạng hoặc URL).');
  };

  const isNetErr = (err) => {
    const msg = String(err && err.message != null ? err.message : err);
    return !!(err && (err.name === 'TypeError' || /Failed to fetch|NetworkError|network error|Load failed|aborted/i.test(msg)));
  };

  let lastNet = null;
  for(const ct of ['text/plain;charset=UTF-8', 'text/plain']) {
    try {
      return await postCorsPlain(ct);
    } catch(err) {
      if(!isNetErr(err)) throw err;
      lastNet = err;
      console.warn('[Drive] Lỗi mạng/CORS với Content-Type', ct, err);
    }
  }

  if(!isGoogleAppsScriptWebAppUrl(url)) {
    throw new Error('Failed to fetch — URL phải là Web App Google (dạng script.google.com/.../exec). Kiểm tra HTTPS, mạng, hoặc tắt extension chặn script.google.com.');
  }

  console.warn('[Drive] Chuyển sang no-cors (chỉ phù hợp với Web App Google):', lastNet);
  return tryNoCorsPlain();
}

function getWeekStartKey(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  // getDay: 0=Sun..6=Sat → chuyển về Monday start
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x.toISOString().slice(0,10);
}

async function autoExportReportsIfNeeded() {
  const s = Store.getSettings();
  const now = new Date();

  if(s.autoExportWeekly) {
    const weekKey = getWeekStartKey(now);
    const last = Store.getLastReportExportWeeklyKey();
    if(weekKey && last !== weekKey) {
      const pushDrive = !!s.autoPushWeeklyReportToGoogleDrive;
      const ok = await exportReportExcel({
        type: s.reportExportType,
        period: 'week',
        skipLocalDownload: pushDrive,
        uploadToDrive: pushDrive ? true : undefined,
      });
      if(ok) Store.setLastReportExportWeeklyKey(weekKey);
    }
  }

  if(s.autoExportMonthly) {
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const last = Store.getLastReportExportMonthlyKey();
    if(monthKey && last !== monthKey) {
      const ok = await exportReportExcel({ type: s.reportExportType, period: 'month' });
      if(ok) Store.setLastReportExportMonthlyKey(monthKey);
    }
  }
}

function importBackup() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept= '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const backup = JSON.parse(ev.target.result);
        Store.restoreFromBackup(backup);
        orderItems = {};
        applyStoreSettings();
        renderPage(currentPage);
        updateAlertBadge();
        showToast(`✅ Đã khôi phục từ backup ${backup.exportedAt ? fmtDate(backup.exportedAt) : ''}!`, 'success');
      } catch(err) {
        showToast('❌ File không hợp lệ: ' + err.message, 'danger');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function renderBackupList() {
  const backups = Store.getLocalBackups();
  const el = document.getElementById('backup-list');
  if(!el) return;
  el.innerHTML = backups.length ? backups.map((b, i) =>
    `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(0,149,255,0.1)">💾</div>
      <div class="list-item-content">
        <div class="list-item-title">${i === 0 ? '⭐ ' : ''}Backup ${i+1}</div>
        <div class="list-item-sub">${b.label || fmtDate(b.date)} · ${(b.size/1024).toFixed(1)} KB</div>
      </div>
      <div style="display:flex;gap:4px">
        ${i === 0 ? `<button class="btn btn-xs btn-secondary" onclick="restoreLatestBackup()">↩️</button>` : ''}
        <button class="btn btn-xs btn-danger" onclick="deleteBackup(${i})" title="Xóa backup này">🗑️</button>
      </div>
    </div>`
  ).join('') : '<div style="padding:12px;color:var(--text2);font-size:12px;text-align:center">Chưa có backup nào</div>';
}

function deleteBackup(index) {
  if(!confirm(`Xóa backup ${index+1}? Hành động này không thể hoàn tác.`)) return;
  Store.deleteLocalBackup(index);
  renderBackupList();
  showToast('🗑️ Đã xóa backup', 'success');
}

function restoreLatestBackup() {
  if(!confirm('Khôi phục backup gần nhất? Dữ liệu hiện tại sẽ bị ghi đè.')) return;
  const raw = localStorage.getItem('gkhl_backup_latest');
  if(!raw) { showToast('❌ Không tìm thấy backup', 'danger'); return; }
  try {
    const backup = JSON.parse(raw);
    Store.restoreFromBackup(backup);
    orderItems = {};
    applyStoreSettings();
    renderPage(currentPage);
    updateAlertBadge();
    showToast('✅ Đã khôi phục backup!', 'success');
  } catch(err) {
    showToast('❌ Khôi phục thất bại', 'danger');
  }
}

// ============================================================
// AI ASSISTANT – Full-featured Chatbot
// Voice + Camera + Gemini + Google Cloud TTS
// ============================================================
let aiRecognition = null;
let aiIsListening  = false;
let aiOutputMode = 'voice'; // 'voice' or 'text'

// ------ UI helpers ------
let aiChatHistoryLoaded = false;

function openAIAssistant() {
  const modal = document.getElementById('ai-modal');
  if(!modal) return;
  modal.classList.add('active');
  updateAIModeUI();
  updateAIOutputToggleUI();

  if (!aiChatHistoryLoaded) {
    const history = Store.getAIHistory();
    const container = document.getElementById('ai-chat-messages');
    const welcomeMsg = document.getElementById('ai-welcome-msg');
    
    if (history.length > 0 && container) {
      container.innerHTML = '';
      if (welcomeMsg) container.appendChild(welcomeMsg);
      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = `ai-bubble ai-bubble-${msg.role}`;
        div.innerHTML = msg.content;
        container.appendChild(div);
      });
      container.scrollTop = container.scrollHeight;
    }
    aiChatHistoryLoaded = true;
  }
}

function closeAIAssistant() {
  document.getElementById('ai-modal').classList.remove('active');
  stopAIListening();
}

function toggleAIMode() {
  const s = Store.getSettings();
  s.forceOffline = !s.forceOffline;
  Store.setSettings(s);
  updateAIModeUI();
}

function updateAIModeUI() {
  const s = Store.getSettings();
  const el = document.getElementById('ai-status-text');
  if(!el) return;
  if (s.forceOffline) {
    el.innerHTML = '📴 Chế độ Offline (Nhanh)';
    el.style.background = 'var(--bg2)';
    el.style.color = 'var(--text2)';
    el.style.border = '1px solid var(--border)';
  } else {
    const hasKey = !!s.geminiApiKey;
    el.innerHTML = hasKey ? '🌐 Chế độ Online (Gemini)' : '⚠️ Online (Thiếu API Key)';
    el.style.background = hasKey ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
    el.style.color = hasKey ? 'var(--success)' : 'var(--danger)';
    el.style.border = hasKey ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
  }
}

// ------ Audio/Text Output Toggle ------
function toggleAIOutput() {
  aiOutputMode = aiOutputMode === 'voice' ? 'text' : 'voice';
  updateAIOutputToggleUI();
  showToast(aiOutputMode === 'voice' ? '🔊 Đã bật phát âm thanh' : '📝 Chỉ hiển thị văn bản');
}

function updateAIOutputToggleUI() {
  const iconSvg = document.getElementById('ai-output-icon-svg');
  const label = document.getElementById('ai-output-label');
  if(iconSvg) {
    if(aiOutputMode === 'voice') {
      iconSvg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
    } else {
      iconSvg.innerHTML = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>';
    }
  }
  if(label) label.textContent = aiOutputMode === 'voice' ? 'Phát âm thanh' : 'Chỉ văn bản';
  const btn = document.getElementById('ai-output-toggle');
  if(btn) btn.classList.toggle('active', aiOutputMode === 'voice');
}

function clearAIAssistantHistory() {
  if(!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện AI?')) return;
  Store.setAIHistory([]);
  const container = document.getElementById('ai-chat-messages');
  const welcomeMsg = document.getElementById('ai-welcome-msg');
  if (container) {
    container.innerHTML = '';
    if (welcomeMsg) container.appendChild(welcomeMsg);
  }
}

function openFullAIHistory() {
  const history = Store.getAIHistory();
  const list = document.getElementById('ai-history-list');
  if(!list) return;
  
  list.innerHTML = history.length ? history.map(msg => `
    <div class="history-item">
      <div class="history-role ${msg.role}">${msg.role === 'user' ? '👤 Bạn' : '🤖 Trợ lý'}</div>
      <div class="history-content">${msg.content}</div>
      <div class="history-time">${msg.time ? fmtDateTime(msg.time) : ''}</div>
    </div>
  `).reverse().join('') : '<div style="text-align:center;color:var(--text3);padding:20px">Chưa có lịch sử trò chuyện</div>';
  
  document.getElementById('ai-history-modal').classList.add('active');
}

function preprocessAIText(text) {
  let t = text.toLowerCase().trim();
  
  // === Fix Vietnamese speech recognition errors ===
  // "bàn" is frequently misrecognized as bà, bàng, bằng, bản, bặn, bạn, ban
  // Pattern: misheard-word + number → "bàn" + number
  t = t.replace(/\b(?:bà|bàng|bằng|bản|bặn|bạn|ban)\s*((?:số\s*)?\d+)/gi, 'bàn $1');
  // "bà năm" → "bàn 5", "bà ba" → "bàn 3" etc.
  const wordToNum = {'một':1,'hai':2,'ba':3,'bốn':4,'bón':4,'năm':5,'sáu':6,'bảy':7,'bẩy':7,'tám':8,'chín':9,'mười':10,
    'mươi':10,'mười một':11,'mười hai':12,'mười ba':13,'mười bốn':14,'mười lăm':15,'mười sáu':16,'mười bảy':17,'mười tám':18,'mười chín':19,'hai mươi':20};
  for (const [word, num] of Object.entries(wordToNum)) {
    // "bà năm" → "bàn 5"
    t = t.replace(new RegExp(`\\b(?:bà|bàng|bằng|bản|bạn|ban)\\s+${word}\\b`, 'gi'), `bàn ${num}`);
  }
  // "bàn số năm" → "bàn số 5" (after the above fix)
  for (const [word, num] of Object.entries(wordToNum)) {
    t = t.replace(new RegExp(`\\bbàn\\s+số\\s+${word}\\b`, 'gi'), `bàn số ${num}`);
    t = t.replace(new RegExp(`\\bbàn\\s+${word}\\b`, 'gi'), `bàn ${num}`);
  }

  // Menu aliases
  const aliases = {
    'cọp trắng': 'tiger bạc',
    'cọp nâu': 'tiger nâu',
    'ken lùn': 'ken lớn',
    'đào': 'trà đào',
    'tắc': 'trà tắc',
    'set 1': 'hoàng hôn trên biển',
    'set 2': 'đêm huyền diệu',
    'set 3': 'không say không về',
    'cút': 'trứng cút thảo mộc',
    'trứng cút': 'trứng cút thảo mộc',
    'ngọt': 'sting'
  };
  
  for (const [alias, realName] of Object.entries(aliases)) {
    const regex = new RegExp(`(^|\\s)${alias}(?=\\s|$)`, 'gi');
    t = t.replace(regex, `$1${realName}`);
  }
  return t;
}

function addAIBubble(text, role = 'bot') {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-bubble ai-bubble-${role}`;
  div.innerHTML = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  
  if (role !== 'thinking') {
    const history = Store.getAIHistory();
    history.push({ role, content: text, time: new Date().toISOString() });
    if (history.length > 200) history.shift();
    Store.setAIHistory(history);
  }
  
  return div;
}

function removeThinkingBubble() {
  const t = document.getElementById('ai-thinking-bubble');
  if (t) t.remove();
}

// ------ Voice Input (Web Speech API) ------
function toggleAIVoice() {
  if (aiIsListening) {
    stopAIListening();
  } else {
    startAIListening();
  }
}

const ICON_MIC = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
const ICON_STOP = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

function startAIListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addAIBubble('⚠️ Trình duyệt này không hỗ trợ ghi âm. Hãy dùng Safari trên iPhone.', 'error');
    return;
  }

  aiRecognition = new SpeechRecognition();
  aiRecognition.lang = 'vi-VN';
  aiRecognition.continuous = false;
  aiRecognition.interimResults = false;

  aiRecognition.onstart = () => {
    aiIsListening = true;
    const btn = document.getElementById('ai-voice-btn');
    const ind = document.getElementById('ai-listening-indicator');
    if (btn) { btn.innerHTML = ICON_STOP; btn.classList.add('recording'); }
    if (ind) ind.style.display = 'block';
  };

  aiRecognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    stopAIListening();
    document.getElementById('ai-text-input').value = text;
    sendAIText(true);
  };

  aiRecognition.onerror = (e) => {
    stopAIListening();
    const msgs = {
      'not-allowed': '🔒 Bạn chưa cho phép truy cập micro. Vào Cài đặt iPhone → Safari → Micro.',
      'no-speech'  : '🎙️ Không nghe thấy gì. Thử lại nhé!',
      'network'    : '🌐 Lỗi mạng khi nhận giọng nói.',
    };
    addAIBubble(msgs[e.error] || `Lỗi ghi âm: ${e.error}`, 'error');
  };

  aiRecognition.onend = () => stopAIListening();
  aiRecognition.start();
}

function stopAIListening() {
  aiIsListening = false;
  if (aiRecognition) { try { aiRecognition.stop(); } catch(_){} aiRecognition = null; }
  const btn = document.getElementById('ai-voice-btn');
  const ind = document.getElementById('ai-listening-indicator');
  if (btn) { btn.innerHTML = ICON_MIC; btn.classList.remove('recording'); }
  if (ind) ind.style.display = 'none';
}

// ------ Camera Capture → Gemini Vision ------
async function handleAICameraCapture(event) {
  const file = event.target.files[0];
  if(!file) return;
  
  const s = Store.getSettings();
  if(!s.geminiApiKey) {
    addAIBubble('⚠️ Cần có Gemini API Key để sử dụng chức năng nhận diện ảnh. Vào <strong>Cài đặt</strong> để cấu hình.', 'error');
    event.target.value = '';
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    const mimeType = file.type || 'image/jpeg';
    
    addAIBubble(`📷 <img src="${e.target.result}" style="max-width:200px;max-height:150px;border-radius:8px;margin-top:6px;display:block">`, 'user');
    
    const thinking = addAIBubble('⏳ Đang nhận diện ảnh...', 'thinking');
    if(thinking) thinking.id = 'ai-thinking-bubble';

    try {
      const menu = Store.getMenu();
      const menuNames = menu.map(m => `${m.name} (${m.price}đ)`).join(', ');
      
      const prompt = `Bạn là trợ lý AI của quán ăn "Gánh Khô Chữa Lành". Hãy phân tích ảnh này:
- Nếu là hình ảnh thực đơn/menu: liệt kê các món nhìn thấy
- Nếu là hình ảnh hóa đơn/bill: đọc các món + số lượng + giá
- Nếu là hình ảnh món ăn: nhận diện tên món

Thực đơn quán: ${menuNames}

Trả về JSON: { "actions": [{ "type": "order", "tableId": "1", "items": [{"id":"<id>","qty":1}] }], "reply": "..." }
Nếu không liên quan đến đặt hàng, trả: { "actions": [], "reply": "Mô tả ảnh..." }
CHỈ trả JSON, không markdown.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${s.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } }
              ]
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512, response_mime_type: "application/json" }
          }),
          signal: AbortSignal.timeout(15000)
        }
      );
      
      const data = await res.json();
      removeThinkingBubble();
      
      if(data.error) {
        addAIBubble(`❌ Lỗi Gemini: ${data.error.message}`, 'error');
        return;
      }
      
      let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(raw);
        const reply = executeAIActions(parsed, menu, '');
        addAIBubble(reply, 'bot');
        if(aiOutputMode === 'voice') speakText(reply);
      } catch(_) {
        addAIBubble(raw || 'Không nhận diện được ảnh.', 'bot');
      }
    } catch(err) {
      removeThinkingBubble();
      addAIBubble(`❌ Lỗi xử lý ảnh: ${err.message}`, 'error');
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ------ Text send ------
function sendAIText(isVoice = false) {
  const inp = document.getElementById('ai-text-input');
  const rawText = inp ? inp.value.trim() : '';
  if (!rawText) return;
  if(inp) inp.value = '';
  
  addAIBubble(rawText, 'user');
  const text = preprocessAIText(rawText);

  const isOnline = navigator.onLine;
  const s = Store.getSettings();
  const hasKey = !!s.geminiApiKey;

  const modeLabel = (!s.forceOffline && isOnline && hasKey)
    ? '🌐 Gemini AI'
    : '📱 Offline Engine';
  const thinking = addAIBubble(`⏳ Đang xử lý... <span style="font-size:11px;opacity:0.7">${modeLabel}</span>`, 'thinking');
  if (thinking) thinking.id = 'ai-thinking-bubble';

  processAICommand(text).then(reply => {
    removeThinkingBubble();
    addAIBubble(reply, 'bot');
    // Auto speak if voice input OR output mode is voice
    if (isVoice || aiOutputMode === 'voice') speakText(reply);
  }).catch(err => {
    removeThinkingBubble();
    addAIBubble(`❌ ${err.message || 'Lỗi không xác định'}`, 'error');
  });
}

// ------ TTS: Google Cloud TTS (premium) + SpeechSynthesis (fallback) ------
async function speakText(text) {
  if (!text) return;
  const plain = (text || '').replace(/<[^>]+>/g, '').replace(/[🎤🤖👋✅⚠️❌📉🛵🏦💵📷📅📆🔊📝]/gu, '').trim();
  if (!plain) return;

  const s = Store.getSettings();
  
  // Try Google Cloud TTS first (natural voice)
  if (s.googleTTSKey && navigator.onLine) {
    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${s.googleTTSKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: plain.slice(0, 500) }, // Limit to 500 chars
          voice: {
            languageCode: 'vi-VN',
            name: 'vi-VN-Neural2-A', // Premium neural voice
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.05,
            pitch: 1.0
          }
        }),
        signal: AbortSignal.timeout(5000)
      });
      
      const data = await response.json();
      if (data.audioContent) {
        const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
        audio.playbackRate = 1.0;
        await audio.play();
        return; // Success, no need for fallback
      }
    } catch(e) {
      console.warn('Google TTS failed, falling back to browser TTS:', e.message);
    }
  }
  
  // Fallback: Browser SpeechSynthesis
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance(plain);
  msg.lang = 'vi-VN';
  msg.rate = 1.05;

  const voices = window.speechSynthesis.getVoices();
  // Prefer Google Vietnamese voice if available
  const viVoice = voices.find(v => v.lang.startsWith('vi') && v.name.includes('Google'))
    || voices.find(v => v.lang.startsWith('vi'))
    || voices.find(v => v.lang.includes('vi'));
  if (viVoice) msg.voice = viVoice;

  window.speechSynthesis.speak(msg);
}

if (window.speechSynthesis) window.speechSynthesis.getVoices();

// ============================================================
// HYBRID AI ENGINE: Gemini (online) + Local NLP (offline)
// ============================================================

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash-lite',
];

async function callGemini(apiKey, systemPrompt) {
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512, response_mime_type: "application/json" }
          }),
          signal: AbortSignal.timeout(8000)
        }
      );
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 404 || data.error.code === 400 ||
            (data.error.message || '').includes('no longer available') ||
            (data.error.message || '').includes('deprecated')) {
          lastError = new Error(data.error.message);
          continue;
        }
        throw new Error(data.error.message);
      }
      if (!data.candidates?.length) throw new Error('Gemini không trả về kết quả.');
      return data.candidates[0].content.parts[0].text;
    } catch(e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e;
      lastError = e;
    }
  }
  throw lastError || new Error('Tất cả Gemini models đều không khả dụng.');
}

// --- Main processor: Hybrid Failover ---
async function processAICommand(text) {
  const s = Store.getSettings();
  const menu       = Store.getMenu();
  const tablesInfo = Store.getTables().map(t => ({ id: t.id, name: t.name, status: t.status }));

  const canUseGemini = !s.forceOffline && navigator.onLine && s.geminiApiKey;

  let parsed;
  let modeColor = '';

  if (canUseGemini) {
    try {
      const menuForAI = menu.map(m => ({ id: m.id, name: m.name, price: m.price }));
      const prompt = buildGeminiPrompt(text, tablesInfo, menuForAI);
      let raw = await callGemini(s.geminiApiKey, prompt);
      raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      try { parsed = JSON.parse(raw); }
      catch(_) { return raw; }
      modeColor = 'var(--success)';
    } catch(e) {
      console.warn('Gemini failed, switching to Local NLP:', e.message);
      const offlineResult = localNLPEngine(text, menu, tablesInfo);
      if (offlineResult) {
        parsed = offlineResult;
        modeColor = 'var(--warning)';
      } else {
        return `⚠️ Mất kết nối mạng và không nhận ra lệnh. Thử nói rõ hơn: "bàn 1 đặt 2 bia"`;
      }
    }
  } else {
    if (!s.geminiApiKey) {
      parsed = localNLPEngine(text, menu, tablesInfo);
      if (!parsed) {
        return '⚠️ Chưa có Gemini API Key. Vào <strong>Cài đặt → Gemini API Key</strong> để dùng AI đầy đủ. Hoặc nói rõ câu lệnh kiểu: "bàn 1 đặt 2 bia sài gòn"';
      }
      modeColor = 'var(--warning)';
    } else {
      parsed = localNLPEngine(text, menu, tablesInfo);
      if (!parsed) {
        return '📵 Đang mất mạng và không nhận ra lệnh. Thử: "bàn 1 đặt 3 bia"';
      }
      modeColor = 'var(--warning)';
    }
  }

  let finalReply = executeAIActions(parsed, menu, text);
  if (typeof finalReply === 'string' && modeColor) {
    finalReply = `<span style="color:${modeColor}">${finalReply}</span>`;
  }
  
  return finalReply;
}

function buildGeminiPrompt(text, tablesInfo, menu) {
  const inventoryInfo = Store.getInventory().map(i => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit }));
  
  // Add current orders context
  const currentOrders = {};
  const orders = Store.getOrders();
  Object.keys(orders).forEach(tid => {
    if(orders[tid] && orders[tid].length > 0) {
      currentOrders[tid] = orders[tid].map(i => `${i.qty}x ${i.name}`);
    }
  });

  // Add today's summary
  const todayRev = getRevenueSummary('today');
  
  return `Bạn là "Gánh Khô" – trợ lý AI thu ngân quán nhậu Việt Nam.
Nhiệm vụ: Phân tích câu lệnh tiếng Việt và trả về JSON.

Danh sách bàn: ${JSON.stringify(tablesInfo)}
Đơn hàng đang mở: ${JSON.stringify(currentOrders)}
Danh sách thực đơn: ${JSON.stringify(menu)}
Kho hàng hóa: ${JSON.stringify(inventoryInfo)}
Doanh thu hôm nay: ${todayRev.orders} đơn, ${todayRev.revenue}đ doanh thu, ${todayRev.expenseTotal}đ chi phí, lãi gộp ${todayRev.gross}đ

ACTION hỗ trợ:
1. "order"  – Gọi/thêm món: { type:"order",  tableId:"1", items:[{id:"<id>", qty:2}] }
2. "remove" – Bớt/xoá món:  { type:"remove", tableId:"1", itemId:"<id>", qty:1 }
3. "pay"    – Mở bill tính tiền: { type:"pay", tableId:"1" }
4. "view"   – Mở/xem trạng thái bàn: { type:"view", tableId:"1" }
5. "report" – Báo cáo doanh thu: { type:"report", date:"YYYY-MM-DD" } (nếu người dùng hỏi ngày khác. VD: "báo cáo hôm qua" trả về date của hôm qua. Hôm nay là: ${new Date().toISOString().split('T')[0]})
6. "restock"– Nhập thêm hàng vào kho: { type:"restock", items:[{name:"<tên>", qty:5}] }
7. "unknown" - Khi không rõ hoặc món không có: { type:"unknown", tableId:"1" }

Quy tắc:
- Khớp tên món/nguyên liệu GẦN ĐÚNG (sài gòn ≈ Bia Sài Gòn, tiger ≈ Bia Tiger, mực ≈ Mực khô nướng).
- Nếu người dùng gọi món KHÔNG CÓ trong thực đơn, dùng "unknown".
- "report" cho câu hỏi: doanh thu, bán được bao nhiêu, báo cáo, tổng kết, tồn kho thế nào, v.v.
- "restock" cho: nhập thêm đồ, mua thêm hàng vào kho.
- reply: ngắn gọn, thân thiện, xưng "em". Nếu report, tóm tắt: doanh thu, lãi, chi phí, đơn, tồn kho cần nhập.

Câu lệnh: "${text}"

CHỈ trả về JSON: { "actions": [...], "reply": "..." }`;
}

// ============================================================
// LOCAL NLP ENGINE (Offline Fallback)
// Pattern matching for Vietnamese POS commands
// ============================================================
function localNLPEngine(text, menu, tables) {
  const t = text.toLowerCase()
    .replace(/[.,!?]/g, '')
    .normalize('NFC');

  // --- Extract table number ---
  // Handles: bàn 5, bàn số 5, ban 5, bà 5 (speech errors already fixed in preprocessor)
  let tableId = null;
  const tableMatch = t.match(/(?:b[àaằảãạăắặẳẵâấầẩẫậ]n?g?\s*(?:s[ốo]\s*)?(\d+))|(?:kh[aá]ch\s*)?(mang v[eề]|takeaway)/i);
  if (tableMatch) {
    if (tableMatch[1]) {
      tableId = tableMatch[1];
    } else if (tableMatch[2]) {
      tableId = 'takeaway';
    }
  }

  // --- Detect intent ---
  const isOrder  = /đặt|gọi|th[eê]m|lên|cho|order/i.test(t);
  const isRemove = /b[oó]t|x[oó]a|hủy|cancel|bỏ/i.test(t);
  const isPay    = /t[íi]nh ti[eề]n|thanh to[aá]n|check|bill|xu[aâ]t bill/i.test(t);
  const isView   = /m[oở] b[aà]n|xem b[aà]n|qu[aả]n l[yý] b[aà]n|v[aà]o b[aà]n/i.test(t);
  const isQuery  = /c[oò]n m[oó]n|th[uú]c đ[oơ]n|menu|b[aà]n n[aà]o|doanh thu|b[aà]o c[aá]o|t[oổ]ng k[eế]t|b[aá]n đ[uượ]c|tồn kho|nhập hàng gần đây/i.test(t);
  const isRestock = /nh[aậ]p (?:h[aà]ng|th[eê]m)|nh[aậ]p|m[uụ]c nh[aậ]p/i.test(t);

  // --- View / Manage Table ---
  if (isView && tableId) {
    return {
      actions: [{ type: 'view', tableId }],
      reply: `Dạ em mở bàn ${tableId} rồi ạ!`
    };
  }

  // --- Pay / Bill ---
  if (isPay) {
    if (tableId) {
      return {
        actions: [{ type: 'pay', tableId }],
        reply: `Dạ em mở bill bàn ${tableId} cho anh chị ạ!`
      };
    } else {
      // No table specified → ask
      return {
        actions: [],
        reply: `Dạ anh chị muốn tính tiền bàn nào ạ? Ví dụ: "Tính tiền bàn 5"`
      };
    }
  }

  // --- Query / Báo cáo ---
  // Nhận diện báo cáo doanh thu: "báo cáo doanh thu ngày...", "hôm ... bán được", "ngày ... bán thế nào", "tháng ... bán thế nào/bao nhiêu"
  const isRevReport = /b[aá]o c[aá]o doanh thu|doanh thu ng[aà]y|doanh thu tuần|doanh thu tháng|doanh thu năm|b[aá]n đ[uược]c bao nhi[eê]u|b[aá]n th[eế] n[aà]o|b[aá]n đ[uược] kh[oô]ng|hôm.*b[aá]n|ng[aà]y.*b[aá]n|tuần.*b[aá]n|tháng.*b[aá]n/i.test(t);
  const isPurchaseReport = /b[aá]o c[aá]o nh[aậ]p h[aà]ng|nh[aậ]p h[aà]ng ng[aà]y|nh[aậ]p h[aà]ng tuần|nh[aậ]p h[aà]ng tháng/i.test(t);
  const isExpenseReport  = /b[aá]o c[aá]o chi ph[íi]|chi ph[íi] ng[aà]y|chi ph[íi] tuần|chi ph[íi] tháng/i.test(t);
  const isFinanceReport  = /b[aá]o c[aá]o t[aà]i ch[íi]nh|t[aà]i ch[íi]nh ng[aà]y|t[aà]i ch[íi]nh tuần|t[aà]i ch[íi]nh tháng|t[aà]i ch[íi]nh năm/i.test(t);

  if (isRevReport || isPurchaseReport || isExpenseReport || isFinanceReport) {
    const pi = parseViDateFromText(t);
    const type = isFinanceReport ? 'finance' : isPurchaseReport ? 'purchase' : isExpenseReport ? 'expense' : 'revenue';
    return buildDetailedReportReply(type, pi || { period: 'today', label: 'hôm nay' });
  }

  if (isQuery) {
    if (/b[aà]n n[aà]o.*tr[oố]ng|tr[oố]ng.*b[aà]n/i.test(t)) {
      const emptyTables = tables.filter(tb => tb.status === 'empty').map(tb => tb.name || `Bàn ${tb.id}`);
      return {
        actions: [],
        reply: emptyTables.length
          ? `Hiện đang trống: ${emptyTables.join(', ')} ạ!`
          : 'Hiện tại tất cả các bàn đều đang có khách ạ!'
      };
    }
    if (/menu|th[uú]c đ[oơ]n|c[oò]n m[oó]n/i.test(t)) {
      const names = menu.slice(0, 8).map(m => m.name).join(', ');
      return {
        actions: [],
        reply: `Thực đơn có: ${names}... và nhiều món khác ạ!`
      };
    }
    if (/doanh thu|b[aà]o c[aá]o|t[oổ]ng k[eế]t|b[aá]n đ[uượ]c|tồn kho/i.test(t)) {
      return buildReportReply();
    }
    return null;
  }

  // --- Restock ---
  if (isRestock) {
    const matchedInv = extractMenuItems(t, Store.getInventory());
    if (matchedInv.length > 0) {
      return {
        actions: [{ type: 'restock', items: matchedInv.map(it => ({ name: it.name, qty: it.qty })) }],
        reply: `Dạ em đã nhập thêm ${matchedInv.map(it => it.qty + ' ' + it.name).join(', ')} vào kho rồi ạ!`
      };
    }
    return null;
  }

  // --- Remove items: handle even without tableId feedback ---
  if (isRemove) {
    if (!tableId) {
      return {
        actions: [],
        reply: `Dạ anh chị muốn bớt món ở bàn nào ạ? Ví dụ: "Bớt 1 bia bàn 2"`
      };
    }
    const matchedItems = extractMenuItems(t, menu);
    if (matchedItems.length > 0) {
      const actions = matchedItems.map(it => ({ type: 'remove', tableId, itemId: it.id, qty: it.qty }));
      const names = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
      return {
        actions,
        reply: `Dạ em đã bớt ${names} ở bàn ${tableId} ạ!`
      };
    }
    return {
      actions: [{ type: 'view', tableId }],
      reply: `Dạ em chưa xác định được món cần bớt, mở bàn ${tableId} để anh chị chỉnh thủ công ạ!`
    };
  }

  // --- Order: need tableId ---
  if (!tableId) return null;
  
  const matchedItems = extractMenuItems(t, menu);
  
  if (isOrder) {
    if (matchedItems.length === 0) {
      return {
        actions: [{ type: 'unknown', tableId }],
        reply: `Dạ em chưa nghe rõ tên món, mời anh chị chọn món thủ công cho bàn ${tableId} ạ!`
      };
    }
    const actions = [{ type: 'order', tableId, items: matchedItems.map(it => ({ id: it.id, qty: it.qty })) }];
    const names   = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
    return {
      actions,
      reply: `Dạ em đã lên ${names} cho bàn ${tableId} rồi ạ! Nếu thiếu món nào anh chị chọn thêm trong menu nhé.`
    };
  }

  // If we have tableId but no clear intent, try matching items as an order
  if (matchedItems.length > 0) {
    const actions = [{ type: 'order', tableId, items: matchedItems.map(it => ({ id: it.id, qty: it.qty })) }];
    const names = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
    return {
      actions,
      reply: `Dạ em lên ${names} cho bàn ${tableId} ạ!`
    };
  }
}

// Định dạng số tiền đầy đủ, dùng "đồng" thay "đ" cho chatbot
function fmtDong(n) {
  return n.toLocaleString('vi-VN') + ' đồng';
}

// Phân tích ngày tháng tiếng Việt từ văn bản
// Trả về { period, dateStr, label } hoặc null
function parseViDateFromText(text) {
  const t = text.toLowerCase().normalize('NFC');
  const now = new Date();

  // "hôm nay" / "hôm nay"
  if (/hôm nay|hom nay/i.test(t)) {
    return { period: 'today', dateStr: now.toISOString().split('T')[0], label: 'hôm nay' };
  }
  // "hôm qua"
  if (/hôm qua|hom qua/i.test(t)) {
    const d = new Date(now); d.setDate(d.getDate()-1);
    return { period: 'day', dateStr: d.toISOString().split('T')[0], label: 'hôm qua' };
  }
  // "tuần này" / "tuần nay"
  if (/tuần này|tuan nay|tuan nay|tuần nay/i.test(t)) {
    return { period: 'week', label: 'tuần này' };
  }
  // "tuần trước"
  if (/tuần trước|tuan truoc/i.test(t)) {
    const from = new Date(now); from.setDate(from.getDate()-14);
    const to   = new Date(now); to.setDate(to.getDate()-7);
    return { period: 'range', fromDate: from.toISOString().split('T')[0], toDate: to.toISOString().split('T')[0], label: 'tuần trước' };
  }
  // "tháng này"
  if (/tháng này|thang nay|tháng nay/i.test(t)) {
    return { period: 'month', label: 'tháng này' };
  }
  // "tháng trước"
  if (/tháng trước|thang truoc/i.test(t)) {
    const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const from = d.toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const to = lastDay.toISOString().split('T')[0];
    return { period: 'range', fromDate: from, toDate: to, label: 'tháng trước' };
  }
  // "năm nay"
  if (/năm nay|nam nay/i.test(t)) {
    const from = `${now.getFullYear()}-01-01`;
    const to   = `${now.getFullYear()}-12-31`;
    return { period: 'range', fromDate: from, toDate: to, label: `năm ${now.getFullYear()}` };
  }

  // Ngày cụ thể: "ngày 7/4", "7 tháng 4", "ngày 7 tháng 4"
  const dayMonthMatch = t.match(/ng[àa]y\s*(\d{1,2})[\/-](\d{1,2})/) ||
                        t.match(/(\d{1,2})\s*\/\s*(\d{1,2})/) ||
                        t.match(/(\d{1,2})\s*tháng\s*(\d{1,2})/) ||
                        t.match(/(\d{1,2})\s*thang\s*(\d{1,2})/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const month = parseInt(dayMonthMatch[2]);
    const year = now.getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month-1, day);
      return { period: 'day', dateStr: d.toISOString().split('T')[0], label: `ngày ${day}/${month}` };
    }
  }

  // Tháng cụ thể: "tháng 3", "tháng 12"
  const monthMatch = t.match(/tháng\s*(\d{1,2})|thang\s*(\d{1,2})/);
  if (monthMatch) {
    const m = parseInt(monthMatch[1] || monthMatch[2]);
    const year = now.getFullYear();
    const from = new Date(year, m-1, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, m, 0);
    const to = lastDay.toISOString().split('T')[0];
    return { period: 'range', fromDate: from, toDate: to, label: `tháng ${m}` };
  }

  // Tuần số cụ thể: "tuần 2", "tuần 15"
  const weekMatch = t.match(/tuần\s*(\d+)|tuan\s*(\d+)/);
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1] || weekMatch[2]);
    // Ước tính bắt đầu tuần theo weekNum trong năm hiện tại
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const from = new Date(jan1.getTime() + (weekNum-1)*7*86400000);
    const to   = new Date(from.getTime() + 6*86400000);
    return { period: 'range', fromDate: from.toISOString().split('T')[0], toDate: to.toISOString().split('T')[0], label: `tuần ${weekNum}` };
  }

  return null; // Không phân tích được
}

// Tạo nội dung báo cáo chi tiết không viết tắt
function buildDetailedReportReply(type, periodInfo) {
  const pi = periodInfo || { period: 'today', label: 'hôm nay' };
  const opts = pi.dateStr ? { date: pi.dateStr } : (pi.fromDate ? { fromDate: pi.fromDate, toDate: pi.toDate } : {});

  if (type === 'revenue' || type === 'finance') {
    const s = getRevenueSummary(pi.period, opts);
    const label = pi.label || 'kỳ này';
    let reply = `📊 <b>Báo cáo doanh thu ${label}:</b><br>`;
    reply += `• Doanh thu: <b>${fmtDong(s.revenue)}</b><br>`;
    reply += `• Số đơn hàng: <b>${s.orders} đơn hàng</b><br>`;
    reply += `• Tiền mặt: ${fmtDong(s.revenueCash)}<br>`;
    reply += `• Chuyển khoản: ${fmtDong(s.revenueBank)}<br>`;
    if (type === 'finance') {
      reply += `• Giá vốn: ${fmtDong(s.cost)}<br>`;
      reply += `• Lãi gộp: <b>${fmtDong(s.gross)}</b><br>`;
      reply += `• Chi phí hoạt động: ${fmtDong(s.expenseTotal)}<br>`;
      reply += `• Lợi nhuận ròng: <b style="color:var(--success)">${fmtDong(s.profit)}</b><br>`;
      if (s.discountTotal > 0)
        reply += `• Tổng giảm giá: ${fmtDong(s.discountTotal)}<br>`;
    }
    return { actions: [{ type: 'report' }], reply };
  }

  if (type === 'purchase') {
    const opts2 = pi.dateStr ? { date: pi.dateStr } : (pi.fromDate ? { fromDate: pi.fromDate, toDate: pi.toDate } : {});
    const purchases = Store.getPurchases();
    const label = pi.label || 'kỳ này';
    const now = new Date();
    // Lọc nhập hàng theo kỳ
    const filtered = purchases.filter(p => {
      const d = new Date(p.date);
      if (pi.period === 'today') return d.toDateString() === now.toDateString();
      if (pi.period === 'day' && pi.dateStr) return d.toISOString().split('T')[0] === pi.dateStr;
      if (pi.period === 'week') return (now - d)/86400000 <= 7;
      if (pi.period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (pi.period === 'range' && pi.fromDate && pi.toDate) {
        const from = new Date(pi.fromDate); from.setHours(0,0,0,0);
        const to   = new Date(pi.toDate);   to.setHours(23,59,59,999);
        return d >= from && d <= to;
      }
      return false;
    });
    const total = filtered.reduce((s,p) => s + p.price, 0);
    let reply = `📦 <b>Báo cáo nhập hàng ${label}:</b><br>`;
    if (filtered.length === 0) {
      reply += `• Không có lần nhập hàng nào trong ${label}.`;
    } else {
      reply += `• Số lần nhập hàng: <b>${filtered.length} lần</b><br>`;
      reply += `• Tổng tiền nhập hàng: <b>${fmtDong(total)}</b><br>`;
      const top3 = filtered.slice(0,3);
      reply += `• Các mặt hàng nhập gần đây: ${top3.map(p => `${p.name} (${p.qty} ${p.unit || 'phần'}, ${fmtDong(p.price)})`).join('; ')}`;
    }
    return { actions: [{ type: 'report' }], reply };
  }

  if (type === 'expense') {
    const expenses = filterExpenses(pi.period, opts);
    const label = pi.label || 'kỳ này';
    const total = expenses.reduce((s,e) => s + e.amount, 0);
    let reply = `💸 <b>Báo cáo chi phí ${label}:</b><br>`;
    if (expenses.length === 0) {
      reply += `• Không có chi phí nào trong ${label}.`;
    } else {
      reply += `• Tổng chi phí: <b>${fmtDong(total)}</b><br>`;
      reply += `• Số khoản chi: <b>${expenses.length} khoản</b><br>`;
      // Nhóm theo danh mục
      const bycat = {};
      expenses.forEach(e => { bycat[e.category] = (bycat[e.category]||0) + e.amount; });
      Object.entries(bycat).forEach(([cat,amt]) => {
        reply += `• ${cat}: ${fmtDong(amt)}<br>`;
      });
    }
    return { actions: [{ type: 'report' }], reply };
  }

  return buildReportReply();
}

// Build basic report reply (today, no abbreviations)
function buildReportReply() {
  const todayRev = getRevenueSummary('today');
  const weekRev = getRevenueSummary('week');
  const alerts = getInventoryAlerts();
  const needRestock = alerts.critical.length + alerts.low.length;
  
  let reply = `📊 <b>Báo cáo hôm nay:</b><br>`;
  reply += `• Doanh thu: <b>${fmtDong(todayRev.revenue)}</b> (${todayRev.orders} đơn hàng)<br>`;
  reply += `• Lãi gộp: <b>${fmtDong(todayRev.gross)}</b><br>`;
  reply += `• Chi phí: ${fmtDong(todayRev.expenseTotal)}<br>`;
  reply += `• Lợi nhuận: <b>${fmtDong(todayRev.profit)}</b><br>`;
  reply += `• Tiền mặt: ${fmtDong(todayRev.revenueCash)} | Chuyển khoản: ${fmtDong(todayRev.revenueBank)}<br>`;
  
  if(weekRev.orders > 0) {
    const avgDaily = Math.round(weekRev.revenue / 7);
    reply += `<br>📈 <b>7 ngày qua:</b> ${fmtDong(weekRev.revenue)} (Trung bình: ${fmtDong(avgDaily)}/ngày)<br>`;
  }
  
  if(needRestock > 0) {
    reply += `<br>⚠️ <b>Tồn kho:</b> ${alerts.critical.length} mặt hàng cần nhập gấp, ${alerts.low.length} mặt hàng sắp hết`;
    if(alerts.critical.length > 0) {
      reply += `<br>🚨 ${alerts.critical.slice(0,3).map(i => i.name).join(', ')}`;
    }
  } else {
    reply += `<br>✅ Tồn kho ổn định`;
  }
  
  return {
    actions: [{ type: 'report' }],
    reply
  };
}

// Fuzzy menu matcher: tìm món trong text + số lượng
function extractMenuItems(text, menu) {
  const results = [];

  const norm = s => s.toLowerCase()
    .replace(/[àáạảãăắặẳẵặâấầẩẫậ]/g, 'a')
    .replace(/[èéẹẻẽêếềểễệ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôốồổỗộơớờởỡợ]/g, 'o')
    .replace(/[ùúụủũưứừựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const normText = norm(text);

  const sortedMenu = [...menu].sort((a, b) => b.name.length - a.name.length);

  let remaining = normText;

  for (const item of sortedMenu) {
    const normName = norm(item.name);
    const keywords = [normName];
    
    let stripped = normName.replace(/^(kho |bia |tra |ruou |combo )/i, '').trim();
    if (stripped !== normName && stripped.length > 2) {
      keywords.push(stripped);
    }
    
    const noSuffix = stripped.replace(/( nuong| chien gion| chien bo toi| chien bo| om bau)$/i, '').trim();
    if (noSuffix !== stripped && noSuffix.length > 2) {
      keywords.push(noSuffix);
    }
    
    if (normName.includes('tiger nau')) keywords.push('tiger nau', 'tiger');
    if (normName.includes('tiger bac')) keywords.push('tiger bac');
    if (normName.includes('sai gon')) keywords.push('sai gon');
    if (normName.includes('ken lon')) keywords.push('ken', 'heineken');

    const finalKeywords = [...new Set(keywords)].sort((a,b) => b.length - a.length);

    let found = false;
    for (const kw of finalKeywords) {
      const idx = remaining.indexOf(kw);
      if (idx === -1) continue;

      const beforeStr = remaining.slice(0, idx);
      const afterStr  = remaining.slice(idx + kw.length);

      const numBefore = beforeStr.match(/(\d+)\s*$/);
      const numAfter  = afterStr.match(/^\s*(\d+)/);
      const wordNum   = /(?:hai|ba|b[óo]n|năm|s[aá]u|bảy|tám|ch[íi]n|mười)\s*$/i.exec(beforeStr);

      const wordNumMap = { hai:2, ba:3, bon:4, bón:4, bốn:4, nam:5, năm:5, sau:6, sáu:6, bay:7, bảy:7, tam:8, tám:8, chin:9, chín:9, muoi:10, mười:10 };

      let qty = 1;
      if (numBefore) qty = parseInt(numBefore[1]);
      else if (numAfter) qty = parseInt(numAfter[1]);
      else if (wordNum) qty = wordNumMap[norm(wordNum[0].trim())] || 1;

      results.push({ id: item.id, name: item.name, qty: Math.max(1, qty) });
      remaining = remaining.replace(kw, '   ');
      found = true;
      break;
    }
  }

  return results;
}

// --- Execute parsed actions (shared between Gemini and Local NLP) ---
function executeAIActions(parsed, menuFull, userText = '') {
  if (!parsed) return 'Không nhận ra lệnh này ạ.';

  if (parsed.actions?.length) {
    for (const a of parsed.actions) {
      if (a.type === 'order') {
        const tid = String(a.tableId);
        if (!orderItems[tid]) {
          const saved = Store.getOrders()[tid];
          orderItems[tid] = saved ? [...saved] : [];
        }
        for (const it of (a.items || [])) {
          const m = menuFull.find(x => x.id === it.id);
          if (!m) continue;
          const ex = orderItems[tid].find(x => x.id === m.id);
          if (ex) ex.qty += it.qty;
          else    orderItems[tid].push({ id: m.id, name: m.name, price: m.price, cost: m.cost || 0, qty: it.qty });
        }
        // Persist + update table status for correct coloring
        try { saveOrderForTable(tid); } catch(_) {}

        // Tự động mở bàn để xác nhận
        setTimeout(() => {
          closeAIAssistant();
          if (tid === 'takeaway') openTakeaway();
          else openTable(Number(tid));
        }, 300);

      } else if (a.type === 'remove') {
        const tid = String(a.tableId);
        if (!orderItems[tid]) {
          const saved = Store.getOrders()[tid];
          orderItems[tid] = saved ? [...saved] : [];
        }
        if (orderItems[tid]) {
          const ex = orderItems[tid].find(x => x.id === a.itemId);
          if (ex) {
            ex.qty -= (a.qty || 1);
            if (ex.qty <= 0) orderItems[tid] = orderItems[tid].filter(x => x.id !== a.itemId);
          }
        }
        // Persist + update table status for correct coloring
        try { saveOrderForTable(tid); } catch(_) {}
        setTimeout(() => {
          closeAIAssistant();
          if (tid === 'takeaway') openTakeaway();
          else openTable(Number(tid));
        }, 300);

      } else if (a.type === 'pay') {
        const tid = String(a.tableId);
        // Mở bàn trước rồi mở bill modal
        setTimeout(() => {
          closeAIAssistant();
          if (tid === 'takeaway') openTakeaway();
          else openTable(Number(tid));
          // Mở bill sau khi bàn đã mở
          setTimeout(() => {
            if ((orderItems[tid] || []).length > 0) {
              openBillModal();
            }
          }, 400);
        }, 200);

      } else if (a.type === 'view') {
        const tid = String(a.tableId);
        closeAIAssistant();
        setTimeout(() => {
          if (tid === 'takeaway') openTakeaway();
          else openTable(Number(tid));
        }, 200);
      } else if (a.type === 'report') {
        if (!parsed.reply || parsed.reply.length < 30) {
          let reqDate = a.date ? new Date(a.date) : new Date();
          let dateObj = a.date ? { label:`Ngày ${reqDate.getDate()}/${reqDate.getMonth()+1}`, date:a.date } : null;
          const report = buildReportReply(dateObj);
          parsed.reply = report.reply;
        }
        
        setTimeout(() => {
          closeAIAssistant();
          navigate('finance');
          if (a.date) {
            const dateInput = document.getElementById('finance-single-date');
            if (dateInput) {
              dateInput.value = a.date;
              setFinancePeriod('day');
            }
          } else {
            setFinancePeriod('today');
          }
        }, 500);

      } else if (a.type === 'restock') {
        const inv = Store.getInventory();
        let addedNames = [];
        const rawCmd = String(userText || '').trim();
        const noteText = rawCmd ? rawCmd.slice(0, 500) : 'Nhap kho qua tro ly AI';
        for (const it of (a.items || [])) {
          const stock = inv.find(x => x.id === it.id || x.name === it.name);
          if (!stock) continue;
          stock.qty += it.qty;
          Store.addPurchase({ 
            id: uid(), 
            name: stock.name, 
            qty: it.qty, 
            unit: stock.unit, 
            price: (stock.costPerUnit || 0) * it.qty, 
            costPerUnit: stock.costPerUnit || 0, 
            date: new Date().toISOString(), 
            supplier: '',
            supplierId: null,
            supplierPhone: '',
            supplierAddress: '',
            note: noteText,
          });
          addedNames.push(it.qty + ' ' + stock.unit + ' ' + stock.name);
        }
        if (addedNames.length) {
          Store.setInventory(inv);
          updateAlertBadge();
          if (currentPage === 'inventory') renderInventory();
          if (!parsed.reply || parsed.reply.length < 10) {
            parsed.reply = `Dạ em đã nhập thêm ${addedNames.join(', ')} vào kho rồi ạ!`;
          }
          
          setTimeout(() => {
            closeAIAssistant();
            navigate('inventory');
            switchInvTab('purchase', document.querySelectorAll('.tab-btn')[1]);
          }, 500);
        }
      } else if (a.type === 'unknown') {
        const tid = String(a.tableId);
        setTimeout(() => {
          closeAIAssistant();
          if (tid === 'takeaway') openTakeaway();
          else openTable(Number(tid));
        }, 500);
      }
    }
    if (currentPage === 'orders') renderCart();
    if (currentPage === 'tables') renderTables();
  }

  return parsed.reply || 'Xong rồi ạ!';
}

// ============================================================
// PAGE: NCC (NHÀ CUNG CẤP)
// ============================================================
function renderNCC() {
  const suppliers = Store.getSuppliers();
  const purchases = Store.getPurchases();
  const el = document.getElementById('ncc-list');
  if (!el) return;

  if (suppliers.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏭</div><div class="empty-text">Chưa có nhà cung cấp nào<br><small>Nhấn "+ Thêm NCC" để bắt đầu</small></div></div>`;
    return;
  }

  el.innerHTML = suppliers.map(s => {
    // Tính doanh số nhập theo từng NCC
    const myPurchases = purchases.filter(p => p.supplierId === s.id || p.supplier === s.name);
    const totalAmount = myPurchases.reduce((sum, p) => sum + p.price, 0);
    const thisMonth = myPurchases.filter(p => {
      const d = new Date(p.date); const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + p.price, 0);

    const debtLabels = { immediate: 'Tiền ngay', weekly: 'Gối tuần', monthly: 'Gối tháng', credit: 'Công nợ dài hạn' };
    const debtLabel = debtLabels[s.debtPolicy] || s.debtPolicy || 'Chưa rõ';

    return `<div class="list-item" style="flex-direction:column;align-items:flex-start;gap:6px;cursor:pointer" onclick="openNCCDetail('${s.id}')">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <div>
          <div class="list-item-title" style="font-size:15px">${s.name}</div>
          ${s.phone ? `<div class="list-item-sub">📞 ${s.phone}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs btn-outline" onclick="event.stopPropagation();editNCC('${s.id}')">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="event.stopPropagation();deleteNCC('${s.id}')">🗑️</button>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--text2)">
        ${s.address ? `<span>📍 ${s.address}</span>` : ''}
        <span>💳 ${debtLabel}</span>
        <span>📦 Tháng này: <b style="color:var(--primary)">${fmt(thisMonth)}đ</b></span>
        <span>🔄 Tổng: ${fmt(totalAmount)}đ</span>
      </div>
      ${s.products && s.products.length ? `<div style="font-size:11px;color:var(--text3)">Hàng cung cấp: ${s.products.join(', ')}</div>` : ''}
    </div>`;
  }).join('');
}

function openAddNCCModal() {
  const form = document.getElementById('ncc-form');
  if (!form) return;
  delete form.dataset.editId;
  form.reset();
  document.getElementById('ncc-modal-title').textContent = '🏭 Thêm Nhà Cung Cấp';
  document.getElementById('ncc-modal').classList.add('active');
}

function editNCC(id) {
  const s = Store.getSuppliers().find(x => x.id === id);
  if (!s) return;
  document.getElementById('ncc-form').dataset.editId = id;
  document.getElementById('ncc-edit-name').value = s.name || '';
  document.getElementById('ncc-edit-phone').value = s.phone || '';
  document.getElementById('ncc-edit-address').value = s.address || '';
  document.getElementById('ncc-edit-debt').value = s.debtPolicy || 'immediate';
  document.getElementById('ncc-edit-products').value = (s.products || []).join(', ');
  document.getElementById('ncc-edit-notes').value = s.notes || '';
  document.getElementById('ncc-modal-title').textContent = '✏️ Sửa Nhà Cung Cấp';
  document.getElementById('ncc-modal').classList.add('active');
}

function submitNCC(e) {
  e.preventDefault();
  const name = document.getElementById('ncc-edit-name').value.trim();
  if (!name) return;
  const phone = document.getElementById('ncc-edit-phone').value.trim();
  const address = document.getElementById('ncc-edit-address').value.trim();
  const debtPolicy = document.getElementById('ncc-edit-debt').value;
  const productsRaw = document.getElementById('ncc-edit-products').value.trim();
  const products = productsRaw ? productsRaw.split(',').map(x => x.trim()).filter(Boolean) : [];
  const notes = document.getElementById('ncc-edit-notes').value.trim();
  const form = document.getElementById('ncc-form');
  const editId = form.dataset.editId;

  if (editId) {
    Store.updateSupplier(editId, { name, phone, address, debtPolicy, products, notes });
    showToast('✅ Đã cập nhật nhà cung cấp!', 'success');
  } else {
    Store.addSupplier({ id: uid(), name, phone, address, debtPolicy, products, notes });
    showToast('✅ Đã thêm nhà cung cấp!', 'success');
    // Cập nhật dropdown trong purchase modal
    renderPurchaseSupplierDropdown();
  }
  document.getElementById('ncc-modal').classList.remove('active');
  renderNCC();
}

function deleteNCC(id) {
  const s = Store.getSuppliers().find(x => x.id === id);
  if (!confirm(`Xoá nhà cung cấp "${s?.name}"?`)) return;
  Store.deleteSupplier(id);
  renderNCC();
  showToast('🗑️ Đã xoá nhà cung cấp', 'success');
}

function openNCCDetail(id) {
  const s = Store.getSuppliers().find(x => x.id === id);
  if (!s) return;
  const purchases = Store.getPurchases().filter(p => p.supplierId === id || p.supplier === s.name);
  const debtLabels = { immediate: 'Tiền ngay', weekly: 'Gối đầu theo tuần', monthly: 'Gối đầu theo tháng', credit: 'Công nợ dài hạn' };

  const now = new Date();
  const thisMonth = purchases.filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const thisWeek  = purchases.filter(p => (now - new Date(p.date)) / 86400000 <= 7);
  const total     = purchases.reduce((s, p) => s + p.price, 0);
  const monthAmt  = thisMonth.reduce((s, p) => s + p.price, 0);
  const weekAmt   = thisWeek.reduce((s, p) => s + p.price, 0);

  const detailEl = document.getElementById('ncc-detail-content');
  if (!detailEl) return;
  detailEl.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:18px;font-weight:800">${s.name}</div>
      ${s.phone ? `<div style="color:var(--text2);margin-top:4px">📞 ${s.phone}</div>` : ''}
      ${s.address ? `<div style="color:var(--text2)">📍 ${s.address}</div>` : ''}
      <div style="color:var(--text2)">💳 Chính sách: ${debtLabels[s.debtPolicy] || s.debtPolicy || 'Chưa rõ'}</div>
      ${s.products?.length ? `<div style="color:var(--text3);font-size:12px;margin-top:6px">Hàng cung cấp: ${s.products.join(', ')}</div>` : ''}
      ${s.notes ? `<div style="color:var(--text3);font-size:12px;margin-top:4px;border-left:2px solid var(--border);padding-left:8px">${s.notes}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
      <div class="stat-card" style="padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text3)">Tuần này</div>
        <div style="font-size:15px;font-weight:700;color:var(--primary)">${fmt(weekAmt)}đ</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text3)">Tháng này</div>
        <div style="font-size:15px;font-weight:700;color:var(--info)">${fmt(monthAmt)}đ</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text3)">Tổng cộng</div>
        <div style="font-size:15px;font-weight:700;color:var(--success)">${fmt(total)}đ</div>
      </div>
    </div>
    <div style="font-weight:600;margin-bottom:8px">📋 Lịch sử nhập hàng (${purchases.length} lần)</div>
    ${purchases.slice(0,10).map(p => `
      <div class="list-item" style="padding:8px 0">
        <div class="list-item-content">
          <div class="list-item-title">${p.name}</div>
          <div class="list-item-sub">${p.qty} ${p.unit||'phần'} · ${fmtDate(p.date)}</div>
        </div>
        <div class="list-item-right"><div class="list-item-amount">${fmt(p.price)}đ</div></div>
      </div>`).join('') || '<div style="color:var(--text3);text-align:center;padding:12px">Chưa có lịch sử nhập hàng</div>'}
  `;
  document.getElementById('ncc-detail-modal').classList.add('active');
}

// Điền supplier dropdown trong purchase modal
function renderPurchaseSupplierDropdown() {
  const sel = document.getElementById('pur-supplier-select');
  if (!sel) return;
  const suppliers = Store.getSuppliers();
  sel.innerHTML = `<option value="">-- Chọn NCC (tuỳ chọn) --</option>` +
    suppliers.map(s => `<option value="${s.id}" data-phone="${s.phone||''}" data-addr="${s.address||''}" data-name="${s.name}">${s.name}</option>`).join('');
}

function onSupplierSelect(select) {
  const opt = select.options[select.selectedIndex];
  const phoneEl = document.getElementById('pur-supplier-phone');
  const addrEl  = document.getElementById('pur-supplier-addr');
  const nameEl  = document.getElementById('pur-supplier');
  if (!opt || !opt.value) {
    if (phoneEl) phoneEl.value = '';
    if (addrEl) addrEl.value = '';
    if (nameEl) nameEl.value = '';
    return;
  }
  if (phoneEl) phoneEl.value = opt.dataset.phone || '';
  if (addrEl)  addrEl.value  = opt.dataset.addr  || '';
  if (nameEl)  nameEl.value  = opt.dataset.name  || '';
}

function syncPurchaseSupplierSelectFromPurchase(p) {
  const sel = document.getElementById('pur-supplier-select');
  if (!sel || !p) return;
  if (p.supplierId) {
    sel.value = String(p.supplierId);
    if (sel.value === String(p.supplierId)) return;
  }
  const target = String(p.supplier || '').trim();
  if (!target) {
    sel.value = '';
    return;
  }
  for (let i = 0; i < sel.options.length; i++) {
    const opt = sel.options[i];
    const nm = String(opt.dataset.name || '').trim();
    if (nm && nm === target) {
      sel.selectedIndex = i;
      return;
    }
  }
  sel.value = '';
}

/* --- ORPHANED DUPLICATE CODE COMMENTED OUT ---


      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = `ai-bubble ai-bubble-${msg.role}`;
        div.innerHTML = msg.content;
        container.appendChild(div);
      });
      container.scrollTop = container.scrollHeight;
    }
    aiChatHistoryLoaded = true;
  }
}

function closeAIAssistant() {
  document.getElementById('ai-modal').classList.remove('active');
  stopAIListening();
}

function toggleAIMode() {
  const s = Store.getSettings();
  s.forceOffline = !s.forceOffline;
  Store.setSettings(s);
  updateAIModeUI();
}

function updateAIModeUI() {
  const s = Store.getSettings();
  const el = document.getElementById('ai-status-text');
  if(!el) return;
  if (s.forceOffline) {
    el.innerHTML = '📴 Chế độ Offline (Nhanh)';
    el.style.background = 'var(--bg2)';
    el.style.color = 'var(--text2)';
    el.style.border = '1px solid var(--border)';
  } else {
    const hasKey = !!s.geminiApiKey;
    el.innerHTML = hasKey ? '🌐 Chế độ Online (Gemini)' : '⚠️ Online (Thiếu API Key)';
    el.style.background = hasKey ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
    el.style.color = hasKey ? 'var(--success)' : 'var(--danger)';
    el.style.border = hasKey ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
  }
}

function clearAIAssistantHistory() {
  if(!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện AI?')) return;
  Store.setAIHistory([]);
  const container = document.getElementById('ai-chat-messages');
  const welcomeMsg = document.getElementById('ai-welcome-msg');
  if (container) {
    container.innerHTML = '';
    if (welcomeMsg) container.appendChild(welcomeMsg);
  }
}

function openFullAIHistory() {
  const history = Store.getAIHistory();
  const list = document.getElementById('ai-history-list');
  if(!list) return;
  
  list.innerHTML = history.length ? history.map(msg => `
    <div class="history-item">
      <div class="history-role ${msg.role}">${msg.role === 'user' ? '👤 Bạn' : '🤖 Trợ lý'}</div>
      <div class="history-content">${msg.content}</div>
      <div class="history-time">${msg.time ? fmtDateTime(msg.time) : ''}</div>
    </div>
  `).reverse().join('') : '<div style="text-align:center;color:var(--text3);padding:20px">Chưa có lịch sử trò chuyện</div>';
  
  document.getElementById('ai-history-modal').classList.add('active');
}

function preprocessAIText(text) {
  let t = text.toLowerCase().trim();
  // Map từ lóng / biệt danh sang tên món chuẩn trong hệ thống
  const aliases = {
    'cọp trắng': 'tiger bạc',
    'cọp nâu': 'tiger nâu',
    'đào': 'trà đào',
    'tắc': 'trà tắc',
    'set 1': 'hoàng hôn trên biển',
    'set 2': 'đêm huyền diệu',
    'set 3': 'không say không về',
    'cút': 'trứng cút thảo mộc',
    'trứng cút': 'trứng cút thảo mộc',
    'ngọt': 'sting'
  };
  
  for (const [alias, realName] of Object.entries(aliases)) {
    // Sử dụng regex hỗ trợ tiếng Việt thay cho \b
    const regex = new RegExp(`(^|\\s)${alias}(?=\\s|$)`, 'gi');
    t = t.replace(regex, `$1${realName}`);
  }
  return t;
}

function addAIBubble(text, role = 'bot') {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-bubble ai-bubble-${role}`;
  div.innerHTML = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  
  if (role !== 'thinking') {
    const history = Store.getAIHistory();
    history.push({ role, content: text, time: new Date().toISOString() });
    if (history.length > 200) history.shift(); // Lưu nhiều hơn trong bộ nhớ (200 tin)
    Store.setAIHistory(history);
  }
  
  return div;
}

function removeThinkingBubble() {
  const t = document.getElementById('ai-thinking-bubble');
  if (t) t.remove();
}

// ------ Voice Input (Web Speech API) ------
function toggleAIVoice() {
  if (aiIsListening) {
    stopAIListening();
  } else {
    startAIListening();
  }
}

const ICON_MIC = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
const ICON_STOP = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

function startAIListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addAIBubble('⚠️ Trình duyệt này không hỗ trợ ghi âm. Hãy dùng Safari trên iPhone.', 'error');
    return;
  }

  aiRecognition = new SpeechRecognition();
  aiRecognition.lang = 'vi-VN';
  aiRecognition.continuous = false;
  aiRecognition.interimResults = false;

  aiRecognition.onstart = () => {
    aiIsListening = true;
    const btn = document.getElementById('ai-voice-btn');
    const ind = document.getElementById('ai-listening-indicator');
    if (btn) { btn.innerHTML = ICON_STOP; btn.classList.add('recording'); }
    if (ind) ind.style.display = 'block';
  };

  aiRecognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    stopAIListening();
    document.getElementById('ai-text-input').value = text;
    sendAIText(true);
  };

  aiRecognition.onerror = (e) => {
    stopAIListening();
    const msgs = {
      'not-allowed': '🔒 Bạn chưa cho phép truy cập micro. Vào Cài đặt iPhone → Safari → Micro.',
      'no-speech'  : '🎙️ Không nghe thấy gì. Thử lại nhé!',
      'network'    : '🌐 Lỗi mạng khi nhận giọng nói.',
    };
    addAIBubble(msgs[e.error] || `Lỗi ghi âm: ${e.error}`, 'error');
  };

  aiRecognition.onend = () => stopAIListening();
  aiRecognition.start();
}

function stopAIListening() {
  aiIsListening = false;
  if (aiRecognition) { try { aiRecognition.stop(); } catch(_){} aiRecognition = null; }
  const btn = document.getElementById('ai-voice-btn');
  const ind = document.getElementById('ai-listening-indicator');
  if (btn) { btn.innerHTML = ICON_MIC; btn.classList.remove('recording'); }
  if (ind) ind.style.display = 'none';
}

// ------ Text send ------
function sendAIText(isVoice = false) {
  const inp = document.getElementById('ai-text-input');
  const rawText = inp ? inp.value.trim() : '';
  if (!rawText) return;
  if(inp) inp.value = '';
  
  // Hiển thị text gốc của user
  addAIBubble(rawText, 'user');

  // Xử lý tiền xử lý (từ lóng) trước khi gửi cho engine
  const text = preprocessAIText(rawText);

  const isOnline = navigator.onLine;
  const s = Store.getSettings();
  const hasKey = !!s.geminiApiKey;

  // Status badge
  const modeLabel = (!s.forceOffline && isOnline && hasKey)
    ? '🌐 Gemini AI'
    : '📱 Offline Engine';
  const thinking = addAIBubble(`⏳ Đang xử lý... <span style="font-size:11px;opacity:0.7">${modeLabel}</span>`, 'thinking');
  if (thinking) thinking.id = 'ai-thinking-bubble';

  processAICommand(text).then(reply => {
    removeThinkingBubble();
    addAIBubble(reply, 'bot');
    if (isVoice) speakText(reply);
  }).catch(err => {
    removeThinkingBubble();
    addAIBubble(`❌ ${err.message || 'Lỗi không xác định'}`, 'error');
  });
}

// ------ TTS ------
function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const plain = (text || '').replace(/<[^>]+>/g, '').replace(/[🎤🤖👋✅⚠️❌📉🛵🏦💵]/gu, '');
  const msg   = new SpeechSynthesisUtterance(plain);
  msg.lang    = 'vi-VN';
  msg.rate    = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.startsWith('vi'));
  if (viVoice) msg.voice = viVoice;

  window.speechSynthesis.speak(msg);
}

if (window.speechSynthesis) window.speechSynthesis.getVoices();

// ============================================================
// HYBRID AI ENGINE: Gemini (online) + Local NLP (offline)
// ============================================================

// --- Model list: Try newer models first, auto-fallback ---
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
];

async function callGemini(apiKey, systemPrompt) {
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512, response_mime_type: "application/json" }
          }),
          signal: AbortSignal.timeout(8000)  // 8s timeout
        }
      );
      const data = await res.json();
      if (data.error) {
        // Model not available → try next
        if (data.error.code === 404 || data.error.code === 400 ||
            (data.error.message || '').includes('no longer available') ||
            (data.error.message || '').includes('deprecated')) {
          lastError = new Error(data.error.message);
          continue;
        }
        throw new Error(data.error.message);
      }
      if (!data.candidates?.length) throw new Error('Gemini không trả về kết quả.');
      return data.candidates[0].content.parts[0].text;
    } catch(e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e;
      lastError = e;
    }
  }
  throw lastError || new Error('Tất cả Gemini models đều không khả dụng.');
}

// --- Main processor: Hybrid Failover ---
async function processAICommand(text) {
  const s = Store.getSettings();
  const menu       = Store.getMenu();
  const tablesInfo = Store.getTables().map(t => ({ id: t.id, name: t.name, status: t.status }));

  // Route: Online + has key + not forced offline → Gemini; otherwise → Local NLP
  const canUseGemini = !s.forceOffline && navigator.onLine && s.geminiApiKey;

  let parsed;

  if (canUseGemini) {
    try {
      const menuForAI = menu.map(m => ({ id: m.id, name: m.name, price: m.price }));
      const prompt = buildGeminiPrompt(text, tablesInfo, menuForAI);
      let raw = await callGemini(s.geminiApiKey, prompt);
      raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      try { parsed = JSON.parse(raw); }
      catch(_) { return raw; }
    } catch(e) {
      // Network fail or all models fail → fallback to local NLP
      console.warn('Gemini failed, switching to Local NLP:', e.message);
      const offlineResult = localNLPEngine(text, menu, tablesInfo);
      if (offlineResult) {
        parsed = offlineResult;
        // Annotate that it used offline mode
        parsed.reply = (parsed.reply || '') + ' <span style="font-size:10px;opacity:0.6">[Offline]</span>';
      } else {
        return `⚠️ Mất kết nối mạng và không nhận ra lệnh. Thử nói rõ hơn: "bàn 1 đặt 2 bia"`;
      }
    }
  } else {
    // No key or offline → local NLP
    if (!s.geminiApiKey) {
      // Thử local NLP trước
      parsed = localNLPEngine(text, menu, tablesInfo);
      if (!parsed) {
        return '⚠️ Chưa có Gemini API Key. Vào <strong>Cài đặt → Gemini API Key</strong> để dùng AI đầy đủ. Hoặc nói rõ câu lệnh kiểu: "bàn 1 đặt 2 bia sài gòn"';
      }
      parsed.reply = (parsed.reply || '') + ' <span style="font-size:10px;opacity:0.6">[Offline Engine]</span>';
    } else {
      // Has key but offline
      parsed = localNLPEngine(text, menu, tablesInfo);
      if (!parsed) {
        return '📵 Đang mất mạng và không nhận ra lệnh. Thử: "bàn 1 đặt 3 bia"';
      }
      parsed.reply = (parsed.reply || '') + ' <span style="font-size:10px;opacity:0.6">[Offline]</span>';
    }
  }

  // Execute parsed actions
  return executeAIActions(parsed, menu);
}

function buildGeminiPrompt(text, tablesInfo, menu) {
  const inventoryInfo = Store.getInventory().map(i => ({ id: i.id, name: i.name, unit: i.unit }));
  return `Bạn là "Gánh Khô" – trợ lý AI thu ngân quán nhậu Việt Nam.
Nhiệm vụ: Phân tích câu lệnh tiếng Việt và trả về JSON.

Danh sách bàn: ${JSON.stringify(tablesInfo)}
Danh sách thực đơn: ${JSON.stringify(menu)}
Kho hàng hóa: ${JSON.stringify(inventoryInfo)}

ACTION hỗ trợ:
1. "order"  – Gọi/thêm món: { type:"order",  tableId:"1", items:[{id:"<id>", qty:2}] }
2. "remove" – Bớt/xoá món:  { type:"remove", tableId:"1", itemId:"<id>", qty:1 }
3. "pay"    – Mở bill tính tiền: { type:"pay", tableId:"1" }
4. "view"   – Mở/xem trạng thái bàn: { type:"view", tableId:"1" }
5. "report" – Báo cáo doanh thu và tổng kết: { type:"report" }
6. "restock"– Nhập thêm/mua thêm hàng vào kho: { type:"restock", items:[{name:"<tên>", qty:5}] }
7. "unknown" - Sử dụng khi người dùng nhắc món không có trong thực đơn hoặc không rõ: { type:"unknown", tableId:"1" }

Quy tắc:
- Khớp tên món/nguyên liệu gần đúng (sài gòn ≈ Bia Sài Gòn, tiger ≈ Bia Tiger).
- Nếu người dùng gọi món KHÔNG CÓ hoặc KHÔNG RÕ trong thực đơn, hãy dùng action "unknown" và phản hồi lịch sự mời họ chọn thủ công.
- Hành động "report" dùng để hỏi xem hôm nay bán được bao nhiêu, báo cáo thế nào.
- Hành động "restock" dùng để nhập thêm đồ vào kho.
- reply: ngắn gọn, thân thiện, xưng "em".

Câu lệnh: "${text}"

Trí tuệ nhân tạo CHỈ trả về một chuỗi JSON hợp lệ với format:
{ "actions": [...], "reply": "..." }`;
}

// ============================================================
// LOCAL NLP ENGINE (Offline Fallback)
// Pattern matching for Vietnamese POS commands
// ============================================================
function localNLPEngine(text, menu, tables) {
  const t = text.toLowerCase()
    .replace(/[.,!?]/g, '')
    .normalize('NFC');

  // --- Extract table number ---
  let tableId = null;
  const tableMatch = t.match(/(?:b[àa]n\s*(?:s[ốo]\s*)?(\d+))|(?:kh[aá]ch\s*)?(mang v[eề]|takeaway)/i);
  if (tableMatch) {
    if (tableMatch[1]) {
      tableId = tableMatch[1];
    } else {
      tableId = 'takeaway';
    }
  }

  // --- Detect intent ---
  const isOrder  = /đặt|gọi|th[eê]m|lên|cho|order/i.test(t);
  const isRemove = /b[oó]t|x[oó]a|hủy|cancel|bỏ/i.test(t);
  const isPay    = /t[íi]nh ti[eề]n|thanh to[aá]n|check|bill|xu[aâ]t bill/i.test(t);
  const isView   = /m[oở] b[aà]n|xem b[aà]n|qu[aả]n l[yý] b[aà]n|v[aà]o b[aà]n/i.test(t);
  const isQuery  = /c[oò]n m[oó]n|th[uú]c đ[oơ]n|menu|b[aà]n n[aà]o|doanh thu|b[aà]o c[aá]o|t[oổ]ng k[eế]t|b[aá]n đ[uượ]c/i.test(t);
  const isRestock = /nh[aậ]p (?:h[aà]ng|th[eê]m)|nh[aậ]p|m[uụ]c nh[aậ]p/i.test(t);

  // --- View / Manage Table ---
  if (isView && tableId) {
    return {
      actions: [{ type: 'view', tableId }],
      reply: `Dạ em mở bàn ${tableId} rồi ạ!`
    };
  }

  // --- Pay / Bill ---
  if (isPay && tableId) {
    return {
      actions: [{ type: 'pay', tableId }],
      reply: `Dạ em mở bill bàn ${tableId} cho anh chị ạ!`
    };
  }

  // --- Query ---
  if (isQuery) {
    if (/b[aà]n n[aà]o.*tr[oố]ng|tr[oố]ng.*b[aà]n/i.test(t)) {
      const emptyTables = tables.filter(tb => tb.status === 'empty').map(tb => tb.name || `Bàn ${tb.id}`);
      return {
        actions: [],
        reply: emptyTables.length
          ? `Hiện đang trống: ${emptyTables.join(', ')} ạ!`
          : 'Hiện tại tất cả các bàn đều đang có khách ạ!'
      };
    }
    if (/menu|th[uú]c đ[oơ]n|c[oò]n m[oó]n/i.test(t)) {
      const names = menu.slice(0, 8).map(m => m.name).join(', ');
      return {
        actions: [],
        reply: `Thực đơn có: ${names}... và nhiều món khác ạ!`
      };
    }
    if (/doanh thu|b[aà]o c[aá]o|t[oổ]ng k[eế]t|b[aá]n đ[uượ]c/i.test(t)) {
      const todayRev = getRevenueSummary('today');
      const alerts = getInventoryAlerts();
      const needRestock = alerts.critical.length + alerts.low.length;
      return {
        actions: [{ type: 'report' }],
        reply: `Hôm nay bán được ${todayRev.orders} đơn, doanh thu ${fmt(todayRev.revenue)}đ, chi phí ${fmt(todayRev.expenseTotal)}đ. Hiện có ${needRestock} nguyên liệu cần nhập ạ!`
      };
    }
    return null;
  }

  // --- Restock ---
  if (isRestock) {
    const matchedInv = extractMenuItems(t, Store.getInventory());
    if (matchedInv.length > 0) {
      return {
        actions: [{ type: 'restock', items: matchedInv.map(it => ({ name: it.name, qty: it.qty })) }],
        reply: `Dạ em đã nhập thêm ${matchedInv.map(it => it.qty + ' ' + it.name).join(', ')} vào kho rồi ạ!`
      };
    }
    return null;
  }

  // --- Order / Remove: need tableId ---
  if (!tableId) return null;
  
  // --- Match menu items using fuzzy matching ---
  const matchedItems = extractMenuItems(t, menu);
  
  if (isOrder) {
    if (matchedItems.length === 0) {
      return {
        actions: [{ type: 'unknown', tableId }],
        reply: `Dạ em chưa nghe rõ tên món, mời anh chị chọn món thủ công cho bàn ${tableId} ạ!`
      };
    }
    const actions = [{ type: 'order', tableId, items: matchedItems.map(it => ({ id: it.id, qty: it.qty })) }];
    const names   = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
    return {
      actions,
      reply: `Dạ em đã lên ${names} cho bàn ${tableId} rồi ạ! Nếu thiếu món nào anh chị chọn thêm trong menu nhé.`
    };
  }
}

// Fuzzy menu matcher: tìm món trong text + số lượng
function extractMenuItems(text, menu) {
  const results = [];

  // Normalize text for matching
  const norm = s => s.toLowerCase()
    .replace(/[àáạảãăắặẳẵặâấầẩẫậ]/g, 'a')
    .replace(/[èéẹẻẽêếềểễệ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôốồổỗộơớờởỡợ]/g, 'o')
    .replace(/[ùúụủũưứừựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const normText = norm(text);

  // Sort menu by name length DESC so longer names match first
  const sortedMenu = [...menu].sort((a, b) => b.name.length - a.name.length);

  let remaining = normText;

  for (const item of sortedMenu) {
    const normName = norm(item.name);
    const keywords = [normName];
    
    // Add safe subset keywords by stripping common generic words
    let stripped = normName.replace(/^(kho |bia |tra |ruou |combo )/i, '').trim();
    if (stripped !== normName && stripped.length > 2) {
      keywords.push(stripped);
    }
    
    // Also strip generic suffixes like " nuong", " chien gion"
    const noSuffix = stripped.replace(/( nuong| chien gion| chien bo toi| chien bo| om bau)$/i, '').trim();
    if (noSuffix !== stripped && noSuffix.length > 2) {
      keywords.push(noSuffix);
    }
    
    // Common mappings
    if (normName.includes('tiger nau')) keywords.push('tiger nau', 'tiger');
    if (normName.includes('tiger bac')) keywords.push('tiger bac');
    if (normName.includes('sai gon')) keywords.push('sai gon');
    if (normName.includes('ken lon')) keywords.push('ken', 'heineken');

    // Remove duplicates and sort by length DESC
    const finalKeywords = [...new Set(keywords)].sort((a,b) => b.length - a.length);

    let found = false;
    for (const kw of finalKeywords) {
      const idx = remaining.indexOf(kw);
      if (idx === -1) continue;

      // Extract quantity: look for number before or after keyword
      const beforeStr = remaining.slice(0, idx);
      const afterStr  = remaining.slice(idx + kw.length);

      const numBefore = beforeStr.match(/(\d+)\s*$/);
      const numAfter  = afterStr.match(/^\s*(\d+)/);
      const wordNum   = /(?:hai|ba|b[óo]n|năm|s[aá]u|bảy|tám|ch[íi]n|mười)\s*$/i.exec(beforeStr);

      const wordNumMap = { hai:2, ba:3, bon:4, bón:4, bốn:4, nam:5, năm:5, sau:6, sáu:6, bay:7, bảy:7, tam:8, tám:8, chin:9, chín:9, muoi:10, mười:10 };

      let qty = 1;
      if (numBefore) qty = parseInt(numBefore[1]);
      else if (numAfter) qty = parseInt(numAfter[1]);
      else if (wordNum) qty = wordNumMap[norm(wordNum[0].trim())] || 1;

      results.push({ id: item.id, name: item.name, qty: Math.max(1, qty) });
      remaining = remaining.replace(kw, '   ');
      found = true;
      break;
    }
  }

  return results;
}

// --- Execute parsed actions (shared between Gemini and Local NLP) ---
function executeAIActions(parsed, menuFull, userText = '') {
  if (!parsed) return 'Không nhận ra lệnh này ạ.';

  if (parsed.actions?.length) {
    for (const a of parsed.actions) {
      if (a.type === 'order') {
        const tid = String(a.tableId);
        if (!orderItems[tid]) {
          const saved = Store.getOrders()[tid];
          orderItems[tid] = saved ? [...saved] : [];
        }
        for (const it of (a.items || [])) {
          const m = menuFull.find(x => x.id === it.id);
          if (!m) continue;
          const ex = orderItems[tid].find(x => x.id === m.id);
          if (ex) ex.qty += it.qty;
          else    orderItems[tid].push({ id: m.id, name: m.name, price: m.price, cost: m.cost || 0, qty: it.qty });
        }

        // Tự động mở bàn để xác nhận thay vì lưu ngay
        setTimeout(() => {
          closeAIAssistant();
          if (tid === 'takeaway') openTakeaway();
          else openTable(tid);
        }, 300);

      } else if (a.type === 'remove') {
        const tid = String(a.tableId);
        if (orderItems[tid]) {
          const ex = orderItems[tid].find(x => x.id === a.itemId);
          if (ex) {
            ex.qty -= (a.qty || 1);
            if (ex.qty <= 0) orderItems[tid] = orderItems[tid].filter(x => x.id !== a.itemId);
          }
        }
        setTimeout(() => {
          closeAIAssistant();
          if (tid === 'takeaway') openTakeaway();
          else openTable(tid);
        }, 300);

      } else if (a.type === 'pay') {
        const tid = String(a.tableId);
        closeAIAssistant();
        setTimeout(() => {
          if (tid === 'takeaway') openTakeaway();
          else openTable(tid);
        }, 200);

      } else if (a.type === 'view') {
        const tid = String(a.tableId);
        closeAIAssistant();
        setTimeout(() => {
          if (tid === 'takeaway') openTakeaway();
          else openTable(tid);
        }, 200);
      } else if (a.type === 'report') {
        const todayRev = getRevenueSummary('today');
        const alerts = getInventoryAlerts();
        const needRestock = alerts.critical.length + alerts.low.length;
        parsed.reply = `Hôm nay bán được ${todayRev.orders} đơn, doanh thu ${fmt(todayRev.revenue)}đ, chi phí ${fmt(todayRev.expenseTotal)}đ. Hiện có ${needRestock} nguyên liệu cần nhập ạ!`;
        
        // Tự động chuyển trang báo cáo
        setTimeout(() => {
          closeAIAssistant();
          navigate('finance');
        }, 500);

      } else if (a.type === 'restock') {
        const inv = Store.getInventory();
        let addedNames = [];
        for (const it of (a.items || [])) {
          const stock = inv.find(x => x.id === it.id || x.name === it.name);
          if (!stock) continue;
          stock.qty += it.qty;
          Store.addPurchase({ 
            id: uid(), 
            name: stock.name, 
            qty: it.qty, 
            unit: stock.unit, 
            price: (stock.costPerUnit || 0) * it.qty, 
            costPerUnit: stock.costPerUnit || 0, 
            date: new Date().toISOString(), 
            supplier: 'AI Assistant' 
          });
          addedNames.push(it.qty + ' ' + stock.unit + ' ' + stock.name);
        }
        if (addedNames.length) {
          Store.setInventory(inv);
          updateAlertBadge();
          if (currentPage === 'inventory') renderInventory();
          if (!parsed.reply || parsed.reply.length < 10) {
            parsed.reply = `Dạ em đã nhập thêm ${addedNames.join(', ')} vào kho rồi ạ!`;
          }
          
          // Tự động chuyển sang trang kho -> Tab Nhập hàng
          setTimeout(() => {
            closeAIAssistant();
            navigate('inventory');
            switchInvTab('purchase', document.querySelectorAll('.tab-btn')[1]);
          }, 500);
        }
      } else if (a.type === 'unknown') {
        const tid = String(a.tableId);
        setTimeout(() => {
          closeAIAssistant();
          if (tid === 'takeaway') openTakeaway();
          else openTable(tid);
        }, 500);
      }
    }
    if (currentPage === 'orders') renderCart();
    if (currentPage === 'tables') renderTables();
  }

  return parsed.reply || 'Xong rồi ạ!';
}
*/
