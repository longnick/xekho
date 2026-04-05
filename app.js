// ============================================================
// APP.JS - Main Application Controller
// ============================================================

// ---- Global State ----
let currentPage = 'tables';
let currentTable = null;
let orderItems = {};  // tableId -> [{id,name,price,qty,cost}]
let chartInstances = {};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  navigate('tables');
  updateAlertBadge();
});

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

  grid.innerHTML = tables.map(t => {
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
  const total = items.reduce((s,i) => s + i.price*i.qty, 0);

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
        <div class="cart-price">${fmt(item.price*item.qty)}đ</div>
      </div>`
    ).join('');
  }

  document.getElementById('cart-total').textContent = fmtFull(total);
  document.getElementById('pay-btn').disabled = items.length === 0;
}

function openBillModal() {
  const items = orderItems[currentTable] || [];
  if(items.length === 0) return;
  const total = items.reduce((s,i) => s + i.price*i.qty, 0);
  const cost = items.reduce((s,i) => s + (i.cost||0)*i.qty, 0);
  const now = new Date();
  const billNo = `B${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${uid().slice(0,4).toUpperCase()}`;

  const desc = `Thanh toan Ban ${currentTable} - ${billNo}`;
  const qrUrl = getVietQR(total, desc);

  document.getElementById('bill-content').innerHTML = `
    <div class="bill-container" id="bill-print-area">
      <div class="bill-header">
        <div class="bill-logo">🍢 Gánh Khô Chữa Lành</div>
        <div class="bill-sub">Ăn là nhớ, nhớ là ghiền!</div>
        <div class="bill-sub" style="margin-top:4px">ĐT: 0937707900</div>
      </div>
      <hr class="bill-divider">
      <div class="bill-info">
        <div>Bill: <span>${billNo}</span></div>
        <div>Bàn: <span>Bàn ${currentTable}</span></div>
        <div>Thời gian: <span>${fmtDateTime(now)}</span></div>
        <div>Thu ngân: <span>Admin</span></div>
      </div>
      <hr class="bill-divider">
      <table class="bill-items">
        <thead><tr><th>Món</th><th style="text-align:center">SL</th><th style="text-align:right">Đ.Giá</th><th style="text-align:right">T.Tiền</th></tr></thead>
        <tbody>
          ${items.map(i=>`<tr>
            <td>${i.name}</td>
            <td style="text-align:center">${i.qty}</td>
            <td style="text-align:right">${fmt(i.price)}</td>
            <td class="amount">${fmt(i.price*i.qty)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <hr class="bill-divider">
      <div class="bill-total"><span>TỔNG CỘNG</span><span>${fmtFull(total)}</span></div>
      <div class="bill-qr">
        <div class="bill-qr-label">Quét QR thanh toán</div>
        <img src="${qrUrl}" alt="QR Thanh toán" onerror="this.style.display='none'">
        <div class="bill-qr-label">Vietinbank – ${PAYMENT_INFO.account}</div>
        <div class="bill-qr-label" style="font-weight:700">Số tiền: ${fmtFull(total)}</div>
      </div>
      <hr class="bill-divider">
      <div class="bill-thanks">Cảm ơn quý khách! Hẹn gặp lại 🙏</div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-secondary" style="flex:1" onclick="printBill()">🖨️ In bill</button>
      <button class="btn btn-success" style="flex:1" onclick="confirmPayment('${billNo}',${total},${cost})">✅ Đã thanh toán</button>
    </div>`;

  document.getElementById('bill-modal').classList.add('active');
}

function closeBillModal() {
  document.getElementById('bill-modal').classList.remove('active');
}

function printBill() {
  window.print();
}

function confirmPayment(billNo, total, cost) {
  const items = orderItems[currentTable] || [];

  // Save to history
  Store.addHistory({
    id: billNo,
    tableId: currentTable,
    tableName: `Bàn ${currentTable}`,
    items: items.map(i => ({...i})),
    total,
    cost,
    paidAt: new Date().toISOString(),
  });

  // Deduct inventory
  Store.deductInventory(items);

  // Clear table
  delete orderItems[currentTable];
  const orders = Store.getOrders();
  delete orders[currentTable];
  Store.setOrders(orders);

  const tables = Store.getTables();
  const table = tables.find(t => t.id === currentTable);
  if(table) { table.status = 'empty'; table.openTime = null; }
  Store.setTables(tables);

  closeBillModal();
  updateAlertBadge();
  showToast('✅ Thanh toán thành công!', 'success');
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
        <div style="display:flex;gap:4px;margin-top:4px">
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
  if(critical.length > 0) alertHtml += `<div class="alert-card danger"><div class="alert-icon">🚨</div><div class="alert-content"><div class="alert-title">Cần nhập gấp (${critical.length})</div><div class="alert-desc">${critical.map(i=>i.name).join(', ')}</div></div></div>`;
  if(low.length > 0) alertHtml += `<div class="alert-card warning"><div class="alert-icon">⚠️</div><div class="alert-content"><div class="alert-title">Sắp hết (${low.length})</div><div class="alert-desc">${low.map(i=>i.name).join(', ')}</div></div></div>`;
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
  const newQty = parseFloat(prompt(`Sửa tồn kho "${item.name}" (hiện: ${item.qty} ${item.unit})`, item.qty));
  if(isNaN(newQty) || newQty < 0) return;
  item.qty = newQty;
  Store.setInventory(inv);
  renderInventory();
  showToast('✅ Đã cập nhật tồn kho');
}

function renderPurchaseList() {
  const purchases = Store.getPurchases().slice(0, 50);
  document.getElementById('purchase-list').innerHTML = purchases.length ? purchases.map(p =>
    `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(0,149,255,0.1)">📦</div>
      <div class="list-item-content">
        <div class="list-item-title">${p.name}</div>
        <div class="list-item-sub">${p.qty} ${p.unit} · ${p.supplier} · ${fmtDate(p.date)}</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount">-${fmt(p.price)}đ</div>
      </div>
    </div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Chưa có lịch sử nhập hàng</div></div>';
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
  document.getElementById('purchase-modal').classList.add('active');
}

function submitPurchase(e) {
  e.preventDefault();
  const inv = Store.getInventory();
  const name = document.getElementById('pur-name').value.trim();
  const qty = parseFloat(document.getElementById('pur-qty').value);
  const price = parseFloat(document.getElementById('pur-price').value);
  const supplier = document.getElementById('pur-supplier').value.trim() || 'Không rõ';

  if(!name || isNaN(qty) || isNaN(price)) return;

  // Find or create inventory item
  let item = inv.find(i => i.name.toLowerCase() === name.toLowerCase());
  if(item) {
    item.qty += qty;
    item.costPerUnit = price/qty;
  } else {
    inv.push({ id:uid(), name, qty, unit:'phần', minQty:5, costPerUnit:price/qty });
  }
  Store.setInventory(inv);

  Store.addPurchase({ id:uid(), name, qty, unit:item?.unit||'phần', price, costPerUnit:price/qty, date:new Date().toISOString(), supplier });
  Store.addExpense({ id:uid(), name:`Nhập hàng: ${name}`, amount:price, category:'Nhập hàng', date:new Date().toISOString() });

  document.getElementById('purchase-modal').classList.remove('active');
  document.getElementById('purchase-form').reset();
  renderInventory();
  updateAlertBadge();
  showToast('✅ Đã nhập hàng thành công!');
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
  document.getElementById('order-history-list').innerHTML = orders.length ? orders.map(o =>
    `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(0,214,143,0.1)">🧾</div>
      <div class="list-item-content">
        <div class="list-item-title">${o.tableName} – ${o.id}</div>
        <div class="list-item-sub">${fmtDateTime(o.paidAt)} · ${o.items?.length||0} món</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount">${fmt(o.total)}đ</div>
      </div>
    </div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Chưa có lịch sử</div></div>';
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
  const search = (document.getElementById('menu-admin-search')||{}).value || '';
  const filtered = menu.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  document.getElementById('menu-admin-list').innerHTML = filtered.map(m =>
    `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(255,107,53,0.1)">🍽️</div>
      <div class="list-item-content">
        <div class="list-item-title">${m.name}</div>
        <div class="list-item-sub">${m.category} · Giá vốn: ${fmt(m.cost||0)}đ</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount">${fmt(m.price)}đ</div>
        <div style="display:flex;gap:4px;margin-top:4px">
          <button class="btn btn-xs btn-outline" onclick="editMenuItem('${m.id}')">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="deleteMenuItem('${m.id}')">🗑️</button>
        </div>
      </div>
    </div>`
  ).join('') || '<div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-text">Không có món</div></div>';
}

function openAddMenuModal(id) {
  const menu = Store.getMenu();
  const dish = id ? menu.find(m => m.id === id) : null;
  document.getElementById('menu-modal-title').textContent = dish ? 'Sửa món ăn' : 'Thêm món mới';
  document.getElementById('menu-item-id').value = dish?.id || '';
  document.getElementById('menu-item-name').value = dish?.name || '';
  document.getElementById('menu-item-price').value = dish?.price || '';
  document.getElementById('menu-item-cost').value = dish?.cost || '';
  document.getElementById('menu-item-category').value = dish?.category || CATEGORIES[0];
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
  const cost = parseFloat(document.getElementById('menu-item-cost').value) || 0;
  const category = document.getElementById('menu-item-category').value;
  if(!name || isNaN(price)) return;

  if(id) {
    const idx = menu.findIndex(m => m.id === id);
    if(idx >= 0) { menu[idx] = {...menu[idx], name, price, cost, category}; }
  } else {
    menu.push({ id:uid(), name, price, cost, category, unit:'phần', ingredients:[] });
  }
  Store.setMenu(menu);
  document.getElementById('menu-modal').classList.remove('active');
  renderMenuAdmin();
  showToast('✅ Đã lưu món ăn!');
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
// ADD DEMO DATA (for testing)
// ============================================================
function addDemoOrders() {
  const menu = Store.getMenu();
  for(let d = 6; d >= 0; d--) {
    const orders = Math.floor(Math.random()*8)+3;
    for(let o = 0; o < orders; o++) {
      const nItems = Math.floor(Math.random()*4)+1;
      const items = [];
      for(let i = 0; i < nItems; i++) {
        const dish = menu[Math.floor(Math.random()*menu.length)];
        const ex = items.find(x=>x.id===dish.id);
        if(ex) ex.qty++;
        else items.push({id:dish.id,name:dish.name,price:dish.price,cost:dish.cost||0,qty:1+Math.floor(Math.random()*2)});
      }
      const total = items.reduce((s,i)=>s+i.price*i.qty,0);
      const cost = items.reduce((s,i)=>s+(i.cost||0)*i.qty,0);
      const date = new Date();
      date.setDate(date.getDate()-d);
      date.setHours(11+Math.floor(Math.random()*10));
      Store.addHistory({ id:uid(), tableId:Math.floor(Math.random()*10)+1, tableName:`Bàn ${Math.floor(Math.random()*10)+1}`, items, total, cost, paidAt:date.toISOString() });
    }
  }
  showToast('✅ Đã tạo dữ liệu demo!', 'success');
  renderPage(currentPage);
  updateAlertBadge();
}
