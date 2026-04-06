// ============================================================
// APP.JS - Main Application Controller
// ============================================================

// ---- Global State ----
let currentPage = 'tables';
let currentTable = null;
let orderItems = {};  // tableId -> [{id,name,price,qty,cost}]
let orderExtras = {}; // tableId -> {discount, shipping}
let chartInstances = {};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  applyStoreSettings();
  runMigrations(); // Patch data spelling differences
  navigate('tables');
  updateAlertBadge();
  // Auto backup mỗi ngày
  setTimeout(() => {
    if(Store.autoBackupIfNeeded()) {
      console.log('[POS] Auto backup done');
    }
  }, 3000);
});

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
  currentTable = tableId;
  const tables = Store.getTables();
  const table = tables.find(t => t.id === tableId);

  // Load existing order
  const orders = Store.getOrders();
  if(!orderItems[tableId]) {
    orderItems[tableId] = orders[tableId] ? [...orders[tableId]] : [];
  }

  document.getElementById('order-table-title').textContent = `Bàn ${tableId}`;
  navigate('orders');
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
  const sInp = document.getElementById('cart-shipping');
  
  if (dInp && document.activeElement === dInp) extras.discount = parseFloat(dInp.value) || 0;
  else if (dInp) dInp.value = extras.discount || '';

  if (sInp && document.activeElement === sInp) extras.shipping = parseFloat(sInp.value) || 0;
  else if (sInp) sInp.value = extras.shipping || '';

  orderExtras[currentTable] = extras;

  const itemsTotal = items.reduce((s,i) => s + i.price*i.qty, 0);
  const total = Math.max(0, itemsTotal - extras.discount + extras.shipping);

  if(items.length === 0) {
    document.getElementById('cart-items').innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:32px">🛒</div><div class="empty-text">Chưa có món</div></div>`;
  } else {
    document.getElementById('cart-items').innerHTML = items.map(item =>
      `<div class="cart-item">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <span class="cart-qty">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
        </div>
        <div style="display:flex; align-items:center; gap:6px">
          <div class="cart-price">${fmt(item.price*item.qty)}đ</div>
          <button class="qty-btn" style="color:var(--danger); background:rgba(255,61,113,0.1); width:28px;" onclick="removeCartItem('${item.id}')">✕</button>
        </div>
      </div>`
    ).join('');
  }

  document.getElementById('cart-total').textContent = fmtFull(total);
  document.getElementById('pay-btn').disabled = items.length === 0;
}

function openBillModal() {
  const items = orderItems[currentTable] || [];
  if(items.length === 0) return;
  const extras = orderExtras[currentTable] || {discount: 0, shipping: 0};
  const s = Store.getSettings();
  const itemsTotal = items.reduce((s,i) => s + i.price*i.qty, 0);
  const total = Math.max(0, itemsTotal - extras.discount + extras.shipping);
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

  // Store bill data for payment confirmation
  window._pendingBill = { billNo, total, cost, extras, tableLabel };

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
      ${extras.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Giảm giá</span><span>-${fmtFull(extras.discount)}</span></div>` : ''}
      ${extras.shipping > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Phí giao hàng</span><span>+${fmtFull(extras.shipping)}</span></div>` : ''}
      <div class="bill-total"><span>TỔNG CỘNG</span><span>${fmtFull(total)}</span></div>
      <div class="bill-qr">
        <div class="bill-qr-label">Quét QR để thanh toán chuyển khoản</div>
        <img src="${qrUrl}" alt="QR Thanh toán" onerror="this.style.display='none'" style="width:200px;height:200px;object-fit:contain;margin:8px auto;display:block">
        <div class="bill-qr-bank">${s.bankName||'Vietinbank'} – ${bank}</div>
        <div class="bill-qr-amount">${fmtFull(total)}</div>
      </div>
      <hr class="bill-divider">
      <div class="bill-thanks">Cảm ơn quý khách! Hẹn gặp lại 🙏</div>
    </div>
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
  const { billNo, total, cost, extras } = window._pendingBill;
  confirmPayment(billNo, total, cost, extras, method);
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

function confirmPayment(billNo, total, cost, extras, payMethod) {
  const items = orderItems[currentTable] || [];
  const tableLabel = currentTable === 'takeaway' ? '🛍️ Mang về' : `Bàn ${currentTable}`;

  // Save to history
  Store.addHistory({
    id: billNo,
    tableId: currentTable,
    tableName: tableLabel,
    items: items.map(i => ({...i})),
    total,
    cost,
    discount: extras?.discount || 0,
    shipping: extras?.shipping || 0,
    payMethod: payMethod || 'cash',
    paidAt: new Date().toISOString(),
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
  else renderForecast();
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

  if(!name || !unit || isNaN(qty) || isNaN(minQty) || isNaN(cost)) return;

  const inv = Store.getInventory();
  const idx = inv.findIndex(i => i.id === id);
  if(idx >= 0) {
    inv[idx] = { ...inv[idx], name, unit, qty, minQty, costPerUnit: cost };
    Store.setInventory(inv);
    renderInventory();
    document.getElementById('inv-edit-modal').classList.remove('active');
    showToast('✅ Đã cập nhật kho');
  }
}

function renderPurchaseList() {
  const purchases = Store.getPurchases().slice(0, 50);
  document.getElementById('purchase-list').innerHTML = purchases.length ? purchases.map(p => {
    let subInfo = `${p.qty} ${p.unit} · ${p.supplier || 'Không rõ'} · ${fmtDate(p.date)}`;
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
}

function editPurchase(purchaseId) {
  const purchases = Store.getPurchases();
  const p = purchases.find(x => x.id === purchaseId);
  if(!p) return;
  // Fill form and open modal
  document.getElementById('pur-name').value = p.name;
  document.getElementById('pur-qty').value = p.qty;
  document.getElementById('pur-price').value = p.price;
  document.getElementById('pur-supplier').value = p.supplier || '';
  document.getElementById('pur-supplier-phone').value = p.supplierPhone || '';
  document.getElementById('pur-supplier-addr').value = p.supplierAddress || '';
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

function openPurchaseModal() {
  const form = document.getElementById('purchase-form');
  delete form.dataset.editId;
  form.reset();
  document.getElementById('purchase-modal-title').textContent = '🚚 Nhập hàng mới';
  document.getElementById('purchase-modal').classList.add('active');
}

function submitPurchase(e) {
  e.preventDefault();
  const inv = Store.getInventory();
  const name = document.getElementById('pur-name').value.trim();
  const qty = parseFloat(document.getElementById('pur-qty').value);
  const price = parseFloat(document.getElementById('pur-price').value);
  const supplierName = document.getElementById('pur-supplier').value.trim() || 'Không rõ';
  const supplierPhone = document.getElementById('pur-supplier-phone').value.trim() || '';
  const supplierAddr = document.getElementById('pur-supplier-addr').value.trim() || '';

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

      purchases[pIdx] = { ...purchases[pIdx], name, qty, price, unit:item.unit, costPerUnit:price/qty, supplier:supplierName, supplierPhone, supplierAddress:supplierAddr };
      Store.setPurchases(purchases);
      Store.setInventory(inv);
      delete form.dataset.editId;
      document.getElementById('purchase-modal-title').textContent = '🚚 Nhập hàng mới';
    }
    showToast('✅ Đã cập nhật nhập hàng!');
  } else {
    // ADD MODE
    if(item) {
      item.qty += qty;
      item.costPerUnit = price/qty;
    } else {
      item = { id:uid(), name, qty, unit:'phần', minQty:5, costPerUnit:price/qty };
      inv.push(item);
    }
    Store.setInventory(inv);
    Store.addPurchase({ id:uid(), name, qty, unit:item.unit, price, costPerUnit:price/qty, date:new Date().toISOString(), supplier: supplierName, supplierPhone, supplierAddress: supplierAddr });
    Store.addExpense({ id:uid(), name:`Nhập hàng: ${name}`, amount:price, category:'Nhập hàng', date:new Date().toISOString() });
    showToast('✅ Đã nhập hàng thành công!');
  }

  document.getElementById('purchase-modal').classList.remove('active');
  document.getElementById('purchase-form').reset();
  renderInventory();
  updateAlertBadge();
}

// ============================================================
// PAGE: FINANCE
// ============================================================
let financePeriod = 'today';

function renderFinance() {
  setFinancePeriod(financePeriod);
}

function setFinancePeriod(p) {
  financePeriod = p;
  document.querySelectorAll('.finance-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === p));
  const s = getRevenueSummary(p);

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

  renderExpenseList();
  renderRevenueChart();
}

function renderExpenseList() {
  const expenses = Store.getExpenses().filter(e => {
    const d = new Date(e.date), now = new Date();
    if(financePeriod === 'today') return d.toDateString() === now.toDateString();
    if(financePeriod === 'week') return (now-d)/86400000 <= 7;
    if(financePeriod === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  document.getElementById('expense-list').innerHTML = expenses.length ? expenses.map(e =>
    `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(255,61,113,0.1)">💸</div>
      <div class="list-item-content">
        <div class="list-item-title">${e.name}</div>
        <div class="list-item-sub">${e.category} · ${fmtDate(e.date)}</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount" style="color:var(--danger)">-${fmt(e.amount)}đ</div>
      </div>
    </div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-text">Chưa có chi phí</div></div>';
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
let reportPeriod = 'week';

function renderReports() {
  setReportPeriod(reportPeriod);
}

function setReportPeriod(p) {
  reportPeriod = p;
  document.querySelectorAll('.report-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === p));
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
  const orders = filterHistory(reportPeriod).slice(0, 30);
  document.getElementById('order-history-list').innerHTML = orders.length ? orders.map(o => {
    const payIcon = o.payMethod === 'bank' ? '🏦' : '💵';
    const payLabel = o.payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
    const discountLabel = o.discount > 0 ? `<br>📉 Giảm: -${fmt(o.discount)}đ` : '';
    return `<div class="list-item" onclick="viewOrderDetail('${o.id}')" style="cursor:pointer">
      <div class="list-item-icon" style="background:rgba(0,214,143,0.1)">🧾</div>
      <div class="list-item-content">
        <div class="list-item-title">${o.tableName} – ${o.id}</div>
        <div class="list-item-sub">${fmtDateTime(o.paidAt)} · ${o.items?.length||0} món · ${payIcon} ${payLabel}${discountLabel}</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount">${fmt(o.total)}đ</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">Tap xem chi tiết</div>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Chưa có lịch sử</div></div>';
}

function viewOrderDetail(orderId) {
  const h = Store.getHistory();
  const o = h.find(x => x.id === orderId);
  if(!o) return;
  const payIcon = o.payMethod === 'bank' ? '🏦' : '💵';
  const payLabel = o.payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
  const itemsHtml = (o.items||[]).map(i =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${i.name} <span style="color:var(--text3)">x${i.qty}</span></span>
      <span style="font-size:13px;font-weight:700;color:var(--primary)">${fmt(i.price*i.qty)}đ</span>
    </div>`
  ).join('');
  document.getElementById('order-detail-content').innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:16px;font-weight:800;margin-bottom:4px">${o.tableName}</div>
      <div style="font-size:12px;color:var(--text2)">${o.id} · ${fmtDateTime(o.paidAt)}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">${payIcon} Thanh toán: ${payLabel}</div>
    </div>
    <div style="margin-bottom:12px">${itemsHtml}</div>
    ${o.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--danger)"><span>📉 Giảm giá</span><span>-${fmtFull(o.discount)}</span></div>` : ''}
    ${o.shipping > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--info)"><span>🛵 Phí giao hàng</span><span>+${fmtFull(o.shipping)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--border)">
      <span style="font-weight:700">TỔNG CỘNG</span>
      <span style="font-size:18px;font-weight:800;color:var(--primary)">${fmtFull(o.total)}</span>
    </div>
    ${o.cost > 0 ? `<div style="font-size:11px;color:var(--text3);text-align:right">Giá vốn: ${fmtFull(o.cost)} · Lãi gộp: ${fmtFull(o.total - o.cost)}</div>` : ''}
  `;
  document.getElementById('order-detail-modal').classList.add('active');
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
// TOAST

// ============================================================
function showToast(msg, type) {
  let toast = document.getElementById('toast');
  if(!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:calc(var(--nav-height,70px) + env(safe-area-inset-bottom,0px) + 16px);left:50%;transform:translateX(-50%) translateY(20px);background:var(--card);color:var(--text);padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;opacity:0;transition:all 0.3s;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid var(--border);';
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
    ['set-tableCount',   s.tableCount  || 20],
  ];
  fields.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if(el) el.value = val;
  });
  const autoEl = document.getElementById('set-autoBackup');
  if(autoEl) autoEl.checked = s.autoBackup !== false;

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
  const tableCountEl  = document.getElementById('set-tableCount');
  const autoBackupEl  = document.getElementById('set-autoBackup');

  const newTableCount = tableCountEl ? (parseInt(tableCountEl.value) || 20) : oldTableCount;

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
    tableCount:   newTableCount,
    autoBackup:   autoBackupEl ? autoBackupEl.checked : s.autoBackup,
  };
  Store.setSettings(updated);

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
  showToast('✅ Đã lưu cài đặt!' + (newTableCount !== oldTableCount ? ` Sơ đồ bàn cập nhật: ${newTableCount} bàn.` : ''), 'success');
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
    const snapshot = Store.saveLocalBackup();
    renderBackupList();
    const last = Store.getLastBackupTime();
    const lastEl = document.getElementById('last-backup-time');
    if(lastEl) lastEl.textContent = last ? fmtDateTime(last) : '';
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
      ${i === 0 ? `<button class="btn btn-xs btn-secondary" onclick="restoreLatestBackup()">↩️ Khôi phục</button>` : ''}
    </div>`
  ).join('') : '<div style="padding:12px;color:var(--text2);font-size:12px;text-align:center">Chưa có backup nào</div>';
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
// AI ASSISTANT – STANDALONE (iPhone / Safari only, no server)
// Uses: Web Speech API (mic) + Gemini REST API + SpeechSynthesis (TTS)
// ============================================================
let aiRecognition = null;
let aiIsListening  = false;

// ------ UI helpers ------
let aiChatHistoryLoaded = false;

function openAIAssistant() {
  document.getElementById('ai-modal').classList.add('active');
  updateAIModeUI();

  if (!aiChatHistoryLoaded) {
    const history = Store.getAIHistory();
    if (history.length > 0) {
      const container = document.getElementById('ai-chat-messages');
      const welcomeMsg = document.getElementById('ai-welcome-msg');
      container.innerHTML = '';
      if (welcomeMsg) container.appendChild(welcomeMsg);
      history.forEach(msg => {
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
    history.push({ role, content: text });
    if (history.length > 50) history.shift(); // Giới hạn lưu 50 tin
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
    if (btn) { btn.textContent = '⏹'; btn.classList.add('recording'); }
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
  if (btn) { btn.textContent = '🎤'; btn.classList.remove('recording'); }
  if (ind) ind.style.display = 'none';
}

// ------ Text send ------
function sendAIText(isVoice = false) {
  const inp  = document.getElementById('ai-text-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  inp.value = '';
  addAIBubble(text, 'user');

  const isOnline = navigator.onLine;
  const s = Store.getSettings();
  const hasKey = s && s.geminiApiKey;

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
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
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
6. "restock"– Nhập thêm/mua thêm tài sản vào kho: { type:"restock", items:[{id:"<id>", qty:5}] }

Quy tắc:
- Khớp tên món/nguyên liệu gần đúng (sài gòn ≈ Bia Sài Gòn, tiger ≈ Bia Tiger).
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
        actions: matchedInv.map(it => ({ type: 'restock', itemId: it.id, qty: it.qty })),
        reply: `Dạ em đã nhập thêm ${matchedInv.map(it => it.qty + ' ' + it.name).join(', ')} vào kho rồi ạ!`
      };
    }
    return null;
  }

  // --- Order / Remove: need tableId ---
  if (!tableId) return null;
  if (!isOrder && !isRemove) return null;

  // --- Match menu items using fuzzy matching ---
  const matchedItems = extractMenuItems(t, menu);
  if (matchedItems.length === 0) return null;

  if (isRemove) {
    const actions = matchedItems.map(it => ({
      type: 'remove', tableId, itemId: it.id, qty: it.qty
    }));
    const names = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
    return {
      actions,
      reply: `Dạ em bớt ${names} ở bàn ${tableId} rồi ạ!`
    };
  }

  // Order
  const actions = [{ type: 'order', tableId, items: matchedItems.map(it => ({ id: it.id, qty: it.qty })) }];
  const names   = matchedItems.map(it => `${it.qty} ${it.name}`).join(', ');
  return {
    actions,
    reply: `Dạ em đã lên ${names} cho bàn ${tableId} rồi ạ!`
  };
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
function executeAIActions(parsed, menuFull) {
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
      } else if (a.type === 'restock') {
        const inv = Store.getInventory();
        let addedNames = [];
        for (const it of (a.items || [])) {
          const stock = inv.find(x => x.id === it.id || x.name === it.name);
          if (!stock) continue;
          stock.qty += it.qty;
          Store.addPurchase({ id: uid(), name: stock.name, qty: it.qty, unit: stock.unit, price: stock.costPerUnit * it.qty, costPerUnit: stock.costPerUnit, date: new Date().toISOString(), supplier: 'AI Assistant' });
          addedNames.push(it.qty + ' ' + stock.unit + ' ' + stock.name);
        }
        if (addedNames.length) {
          Store.setInventory(inv);
          updateAlertBadge();
          if (currentPage === 'inventory') renderInventory();
          if (!parsed.reply || parsed.reply.length < 10) {
            parsed.reply = `Dạ em đã nhập thêm ${addedNames.join(', ')} vào kho rồi ạ!`;
          }
        }
      }
    }
    if (currentPage === 'orders') renderCart();
    if (currentPage === 'tables') renderTables();
  }

  return parsed.reply || 'Xong rồi ạ!';
}

