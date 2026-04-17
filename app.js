// ============================================================
// WASTAGE (Xuất hủy / Hao hụt)
// ============================================================
function renderWastageTab() {
  const expenses = Store.getExpenses().filter(e => e.category === 'Chi phí hao hụt');
  const listEl = document.getElementById('wastage-list');
  if(!listEl) return;

  listEl.innerHTML = expenses.map(e => `
    <div class="list-item">
      <div class="list-item-icon" style="background:rgba(255,61,113,0.1)">🗑️</div>
      <div class="list-item-content">
        <div class="list-item-title">${e.name}</div>
        <div class="list-item-sub">Lý do: ${e.note || 'Không có'}</div>
        <div class="list-item-sub" style="font-size:10px;color:var(--text3)">${fmtDateTime(e.date)}</div>
      </div>
      <div class="list-item-right" style="flex-direction:row; gap:4px; align-items:center;">
        <div class="list-item-amount" style="color:var(--danger)">-${fmt(e.amount)}đ</div>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">🗑️</div><div class="empty-text">Chưa có phiếu xuất hủy nào</div></div>';
}

function submitWastage(e) {
  e.preventDefault();
  const name = document.getElementById('wastage-name').value.trim();
  const qty = parseFloat(document.getElementById('wastage-qty').value);
  const reason = document.getElementById('wastage-reason').value;
  const note = document.getElementById('wastage-note').value.trim();

  if(!name || isNaN(qty) || qty <= 0) return;

  const inv = Store.getInventory();
  const item = inv.find(i => i.name.toLowerCase() === name.toLowerCase());

  if(!item) {
    showToast('⚠️ Không tìm thấy nguyên liệu này trong kho.', 'warning');
    return;
  }
  if(item.qty < qty) {
    showToast(`⚠️ Trong kho chỉ còn ${item.qty} ${item.unit}. Không thể hủy ${qty}.`, 'warning');
    return;
  }

  const cost = (item.costPerUnit || 0) * qty;

  if (window.DB && window.DB.Inventory) {
    window.DB.Inventory.update(item.id, { qty: item.qty - qty })
      .then(() => {
        Store.addExpense({
          id: uid(),
          name: `Hủy: ${qty} ${item.unit} ${item.name}`,
          amount: cost,
          category: 'Chi phí hao hụt',
          date: new Date().toISOString(),
          note: reason + (note ? ` - ${note}` : '')
        });
        document.getElementById('wastage-form').reset();
        renderInventory();
        showToast('✅ Đã ghi nhận xuất hủy!', 'success');
      }).catch(err => showToast('Lỗi xuất hủy: ' + err.message, 'danger'));
  } else {
    item.qty -= qty;
    Store.setInventory(inv);
    Store.addExpense({
      id: uid(),
      name: `Hủy: ${qty} ${item.unit} ${item.name}`,
      amount: cost,
      category: 'Chi phí hao hụt',
      date: new Date().toISOString(),
      note: reason + (note ? ` - ${note}` : '')
    });
    document.getElementById('wastage-form').reset();
    renderInventory();
    showToast('✅ Đã ghi nhận xuất hủy!', 'success');
  }
}

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
let currentPurchasePhotos = [];       // ảnh chứng từ cho lần nhập hàng �?ang m�?
let currentPurchasePhotosBatchId = null; // id "lần nhập/chứng từ" �?�? gom ảnh
let purchasePhotoCache = null;        // RAM cache cho b�? nh�? thiết b�?
let currentPurchaseOcrMode = null;    // 'auto' | 'offline' | 'online' (override settings)
let tesseractWorker = null;           // Tesseract.js worker (offline OCR)
const ORDER_HISTORY_PHOTO_RETENTION_DAYS = 3; // giữ ảnh order trong l�?ch sử 3 ngày

function applyTheme(themeName) {
  const body = document.body;
  if (!body) return;

  body.classList.remove('theme-nang-dong', 'theme-nhe-nhang', 'theme-chill', 'theme-ruc-ro', 'theme-hien-dai');
  body.classList.add(`theme-${themeName || 'hien-dai'}`);
}

// ============================================================
// IMAGE ZOOM/PAN VIEWER
// Supports pinch-to-zoom & drag/pan for mobile image viewing
// ============================================================

const ImgZoom = (() => {
  let _img = null;
  let _wrap = null;
  let _scale = 1;
  let _translateX = 0;
  let _translateY = 0;
  let _startX = 0;
  let _startY = 0;
  let _lastDist = null;
  let _lastScale = 1;
  let _isDragging = false;
  let _originX = 0;
  let _originY = 0;
  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  function _applyTransform() {
    if (!_img) return;
    _img.style.transform = `scale(${_scale}) translate(${_translateX / _scale}px, ${_translateY / _scale}px)`;
    _img.style.cursor = _scale > 1 ? 'grab' : 'default';
  }

  function _clampTranslate() {
    if (!_img || !_wrap) return;
    const ww = _wrap.clientWidth;
    const wh = _wrap.clientHeight;
    const iw = _img.naturalWidth || _img.clientWidth;
    const ih = _img.naturalHeight || _img.clientHeight;
    // Compute visible bounds
    const scaledW = Math.min(iw, ww) * _scale;
    const scaledH = Math.min(ih, wh) * _scale;
    const maxX = Math.max(0, (scaledW - ww) / 2);
    const maxY = Math.max(0, (scaledH - wh) / 2);
    _translateX = Math.max(-maxX, Math.min(maxX, _translateX));
    _translateY = Math.max(-maxY, Math.min(maxY, _translateY));
  }

  function _onTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _lastDist = Math.hypot(dx, dy);
      _lastScale = _scale;
      _isDragging = false;
    } else if (e.touches.length === 1) {
      _startX = e.touches[0].clientX - _translateX;
      _startY = e.touches[0].clientY - _translateY;
      _isDragging = true;
    }
  }

  function _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 2 && _lastDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / _lastDist;
      _scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, _lastScale * ratio));
      if (_scale <= MIN_SCALE) { _translateX = 0; _translateY = 0; }
      _clampTranslate();
      _applyTransform();
    } else if (e.touches.length === 1 && _isDragging && _scale > 1) {
      _translateX = e.touches[0].clientX - _startX;
      _translateY = e.touches[0].clientY - _startY;
      _clampTranslate();
      _applyTransform();
    }
  }

  function _onTouchEnd(e) {
    if (e.touches.length < 2) _lastDist = null;
    if (e.touches.length === 0) _isDragging = false;
    if (_scale < 1.05) { _scale = 1; _translateX = 0; _translateY = 0; _applyTransform(); }
  }

  // Double-tap to toggle zoom
  let _lastTap = 0;
  function _onTouchEndTap(e) {
    _onTouchEnd(e);
    if (e.changedTouches.length !== 1) return;
    const now = Date.now();
    if (now - _lastTap < 300) {
      if (_scale > 1) { _scale = 1; _translateX = 0; _translateY = 0; }
      else { _scale = 2.5; }
      _applyTransform();
    }
    _lastTap = now;
  }

  // Mouse drag for desktop
  function _onMouseDown(e) {
    if (_scale <= 1) return;
    _isDragging = true;
    _startX = e.clientX - _translateX;
    _startY = e.clientY - _translateY;
    _img.style.cursor = 'grabbing';
  }
  function _onMouseMove(e) {
    if (!_isDragging || _scale <= 1) return;
    _translateX = e.clientX - _startX;
    _translateY = e.clientY - _startY;
    _clampTranslate();
    _applyTransform();
  }
  function _onMouseUp() {
    _isDragging = false;
    if (_img) _img.style.cursor = _scale > 1 ? 'grab' : 'default';
  }
  // Mouse wheel zoom
  function _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.2;
    _scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, _scale * delta));
    if (_scale <= MIN_SCALE) { _translateX = 0; _translateY = 0; }
    _clampTranslate();
    _applyTransform();
  }

  function attach(wrapEl, imgEl) {
    detach();
    _img = imgEl;
    _wrap = wrapEl;
    _scale = 1; _translateX = 0; _translateY = 0;
    _applyTransform();
    _img.style.transformOrigin = 'center center';
    _img.style.transition = 'none';
    _img.style.willChange = 'transform';
    _img.style.maxWidth = '100%';
    _img.style.maxHeight = '100%';
    _img.style.userSelect = 'none';
    _img.style.webkitUserSelect = 'none';
    _img.draggable = false;

    _wrap.addEventListener('touchstart', _onTouchStart, { passive: false });
    _wrap.addEventListener('touchmove', _onTouchMove, { passive: false });
    _wrap.addEventListener('touchend', _onTouchEndTap, { passive: false });
    _wrap.addEventListener('mousedown', _onMouseDown);
    _wrap.addEventListener('mousemove', _onMouseMove);
    _wrap.addEventListener('mouseup', _onMouseUp);
    _wrap.addEventListener('mouseleave', _onMouseUp);
    _wrap.addEventListener('wheel', _onWheel, { passive: false });
  }

  function detach() {
    if (_wrap) {
      _wrap.removeEventListener('touchstart', _onTouchStart);
      _wrap.removeEventListener('touchmove', _onTouchMove);
      _wrap.removeEventListener('touchend', _onTouchEndTap);
      _wrap.removeEventListener('mousedown', _onMouseDown);
      _wrap.removeEventListener('mousemove', _onMouseMove);
      _wrap.removeEventListener('mouseup', _onMouseUp);
      _wrap.removeEventListener('mouseleave', _onMouseUp);
      _wrap.removeEventListener('wheel', _onWheel);
    }
    _img = null; _wrap = null;
    _scale = 1; _translateX = 0; _translateY = 0;
  }

  function reset() {
    _scale = 1; _translateX = 0; _translateY = 0;
    if (_img) _applyTransform();
  }

  return { attach, detach, reset };
})();

// ============================================================
// LOGIN & USER MANAGEMENT
// ============================================================
let currentUser = { username: 'admin', role: 'admin' }; // Mặc �?�?nh là admin khi bỏ giao di�?n �?�?ng nhập

// Ch�? dùng biến trên RAM, tuy�?t �?�?i không lấy từ LocalStorage
function checkLoginState() {
  return true; // Bỏ qua check login
}

async function handleLoginSubmit(e) {
  e.preventDefault();
}

function handleLogout() {
  if (window.DB && window.DB.logout) {
    window.DB.logout();
  } else {
    sessionStorage.removeItem('gkhl_current_session');
    location.reload();
  }
}

function applyRoleRights() {
  if(!currentUser) currentUser = { username: 'admin', role: 'admin' };
  
  const userDisplay = document.getElementById('current-user-display');
  if(userDisplay) {
    userDisplay.innerHTML = `<span style="margin-right:4px">👤</span>${currentUser.username}`;
  }

  const isStaff = currentUser.role === 'staff';
  
  // Hide restricted tabs for Staff
  const restrictedTabs = ['inventory', 'finance', 'reports', 'insights', 'menu', 'settings'];
  restrictedTabs.forEach(tab => {
    const el = document.querySelector(`.nav-item[data-page="${tab}"]`);
    if(el) el.style.display = isStaff ? 'none' : '';
  });
  
  // Hide UI parts for Staff
  const revCard = document.getElementById('staff-hide-rev');
  if(revCard) revCard.style.display = isStaff ? 'none' : '';
  const ordCard = document.getElementById('staff-hide-ord');
  if(ordCard) ordCard.style.display = isStaff ? 'none' : '';
  
  const aifab = document.getElementById('ai-fab');
  if(aifab) aifab.style.display = isStaff ? 'none' : '';
  const aimic = document.getElementById('ai-mic-btn');
  if(aimic) aimic.style.display = isStaff ? 'none' : '';
  const mainFab = document.getElementById('main-fab');
  if(mainFab) mainFab.style.display = isStaff ? 'none' : '';

  // Hide delete buttons inside Order Page
  const orderDelBtns = document.querySelectorAll('.delete-order-btn'); 
  orderDelBtns.forEach(btn => btn.style.display = isStaff ? 'none' : '');
  
  const clearTableBtn = document.getElementById('btn-clear-table');
  if(clearTableBtn) clearTableBtn.style.display = isStaff ? 'none' : '';
}

// ==== Quản lý người dùng ====
function _getManagedUsers(includeDisabled = false) {
  const users = (window.appState && Array.isArray(window.appState.users) && window.appState.users.length > 0)
    ? window.appState.users
    : Store.getUsers();
  if (!includeDisabled) return (users || []).filter(u => String(u?.role || '').toLowerCase() !== 'disabled');
  return users || [];
}

function _getUserIdentity(u = {}) {
  return String(u.uid || u.username || u.email || '');
}

function renderUserManagement() {
  if (!isAdminUser()) return;
  const umSection = document.getElementById('settings-user-management');
  if(umSection) umSection.style.display = 'block';

  const list = document.getElementById('user-management-list');
  if(!list) return;

  const users = _getManagedUsers(false);
  const presence = (window.appState && window.appState.presence) || {};

  if (!users.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Chưa có nhân viên</div></div>';
    return;
  }

  list.innerHTML = users.map(u => {
    const uname    = u.username || u.displayName || u.email || '';
    const uid      = _getUserIdentity(u);
    const pres     = presence[uid] || null;
    const isOnline = pres && pres.online;
    const onlineDot = `<span title="${isOnline ? 'Đang online' : 'Offline'}" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isOnline ? 'var(--success,#00D68F)' : '#555'};margin-left:6px;vertical-align:middle;"></span>`;
    const roleText = String(u.role || '').toLowerCase();
    const isRootAdmin = uname.toLowerCase() === 'admin' || roleText === 'admin';
    const isSelf = String(currentUser?.username || '').toLowerCase() === uname.toLowerCase();

    return `
    <div class="list-item" onclick="editUserById('${uid}')" style="cursor:pointer">
      <div class="list-item-icon" style="background:rgba(124,58,237,0.1)">👥</div>
      <div class="list-item-content">
        <div class="list-item-title">${uname} ${roleText==='admin' ? '<span class="badge badge-primary">Admin</span>' : '<span class="badge badge-info">Staff</span>'} ${onlineDot}</div>
        <div class="list-item-sub">${isOnline ? '🟢 Đang online' : (pres ? '⚫ Offline' : 'Chưa hoạt động')}</div>
      </div>
      <div>
        <button type="button" class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); editUserById('${uid}')">Sửa</button>
        <button type="button" class="btn btn-xs btn-danger" onclick="event.stopPropagation(); deleteUserById('${uid}')" ${(isRootAdmin || isSelf) ? 'disabled' : ''}>Xóa</button>
      </div>
    </div>`;
  }).join('');
}

function openAddUserModal() {
  document.getElementById('user-edit-username').value = '';
  document.getElementById('user-edit-username').readOnly = false;
  document.getElementById('user-edit-password').value = '';
  document.getElementById('user-edit-password').placeholder = '***';
  document.getElementById('user-edit-password').required = true;
  document.getElementById('user-edit-role').value = 'staff';
  document.getElementById('user-edit-role').disabled = false;
  
  const title = document.getElementById('user-modal-title');
  if(title) title.textContent = 'Thêm Nhân Viên';
  
  document.getElementById('user-modal').classList.add('active');
}

function editUserById(userId) {
  const users = _getManagedUsers(true);
  const u = users.find(x => _getUserIdentity(x) === String(userId));
  if(!u) return;

  const title = document.getElementById('user-modal-title');
  if(title) title.textContent = 'Sửa Nhân Viên';
  
  document.getElementById('user-edit-username').value = u.username;
  document.getElementById('user-edit-username').readOnly = true;
  document.getElementById('user-edit-password').value = '';
  document.getElementById('user-edit-password').placeholder = '(Bỏ trống nếu không đổi)';
  document.getElementById('user-edit-password').required = false;
  
  if (u.username.toLowerCase() === 'admin') {
    document.getElementById('user-edit-role').value = 'admin';
    document.getElementById('user-edit-role').disabled = true;
  } else {
    document.getElementById('user-edit-role').disabled = false;
    document.getElementById('user-edit-role').value = u.role;
  }
  
  document.getElementById('user-modal').classList.add('active');
}

function editUser(username) {
  const users = _getManagedUsers(true);
  const u = users.find(x => String((x.username || '')).toLowerCase() === String(username || '').toLowerCase());
  if (!u) return;
  editUserById(_getUserIdentity(u));
}

async function submitUser(e) {
  e.preventDefault();
  const u = document.getElementById('user-edit-username').value.trim();
  const p = document.getElementById('user-edit-password').value.trim();
  let r = document.getElementById('user-edit-role').value;
  
  if(!u) return;
  if(u.toLowerCase() === 'admin') r = 'admin'; // security enforcement
  
  const users = _getManagedUsers(true);
  const existing = users.find(x => String(x.username || '').toLowerCase() === u.toLowerCase());
  
  if(existing) {
    if(p) {
      showToast('⚠️ Không thể đổi mật khẩu nhân viên khác từ tài khoản này', 'danger');
    }
    // Update role sang Firebase
    if (window.DB && window.DB.Users) {
      await window.DB.Users.setRole(existing.uid || existing.username, r);
    }
  } else {
    if(!p) return; // Must have password for new user
    const emailStr = u.includes('@') ? u : u + '@ganhkho.vn';
    // FIX 3: Dùng Users.add (Shadow App) �?? Admin KH�?NG b�? v�?ng phiên
    if (window.DB && window.DB.Users && window.DB.Users.add) {
      try {
        await window.DB.Users.add(emailStr, p, u, r);
      } catch (err) {
        showToast('Lỗi tạo tài khoản: ' + err.message, 'danger');
        return;
      }
    } else {
      const lsUsers = Store.getUsers();
      lsUsers.push({ username: u, password: p, role: r });
      Store.setUsers(lsUsers);
    }
  }
  
  document.getElementById('user-modal').classList.remove('active');
  showToast('✅ Đã lưu nhân viên ' + u);
  renderUserManagement();
}

async function deleteUserById(userId) {
  const users = _getManagedUsers(true);
  const u = users.find(x => _getUserIdentity(x) === String(userId));
  if (!u) return;

  const uname = u.username || u.displayName || u.email || 'nhân viên';
  if (uname.toLowerCase() === 'admin' || String(u.role || '').toLowerCase() === 'admin') {
    showToast('Không thể xóa tài khoản quản trị.', 'warning');
    return;
  }
  if (String(currentUser?.username || '').toLowerCase() === String(uname).toLowerCase()) {
    showToast('Không thể tự xóa tài khoản đang đăng nhập.', 'warning');
    return;
  }
  if (!confirm(`Xóa nhân viên ${uname}?`)) return;

  // Cloud-first: disable user trên Firestore để đồng bộ toàn hệ thống
  if (window.DB?.Users?.disable && u.uid) {
    try {
      await window.DB.Users.disable(u.uid);
      if (window.appState?.users) {
        window.appState.users = window.appState.users.map(x =>
          (x.uid === u.uid ? { ...x, role: 'disabled' } : x)
        );
      }
      showToast(`✅ Đã xóa nhân viên ${uname}`, 'success');
      renderUserManagement();
      return;
    } catch (err) {
      showToast('Lỗi xóa nhân viên: ' + (err?.message || err), 'danger');
      return;
    }
  }

  // Fallback local
  let localUsers = Store.getUsers();
  localUsers = localUsers.filter(x => _getUserIdentity(x) !== String(userId));
  Store.setUsers(localUsers);
  if (window.appState?.users) {
    window.appState.users = (window.appState.users || []).filter(x => _getUserIdentity(x) !== String(userId));
  }
  showToast(`✅ Đã xóa nhân viên ${uname}`, 'success');
  renderUserManagement();
}

function deleteUser(username) {
  const users = _getManagedUsers(true);
  const u = users.find(x => String((x.username || '')).toLowerCase() === String(username || '').toLowerCase());
  if (!u) return;
  deleteUserById(_getUserIdentity(u));
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  // Chặn �?�?ng nhập (LocalStorage session)
  const isLoggedIn = checkLoginState();
  if(!isLoggedIn) {
    // App vẫn init ngầm phía sau, login xong hi�?n th�? ngay
  }

  // 1. Tải cơ s�? dữ li�?u h�? th�?ng (Bất �?�?ng b�?)
  await PhotoDB.init();
  await migratePhotosToIndexedDB();
  purchasePhotoCache = await Store.getPurchasePhotosAsync() || {};
  orderPhotoCache    = await Store.getOrderPhotosAsync()   || {};

  // 2. Chạy lu�?ng Main
  initNav();
  applyStoreSettings();
  
  // Áp dụng Theme ngay từ lúc load app
  const s = Store.getSettings();
  if (s && s.appTheme) {
    applyTheme(s.appTheme);
  }
  
  runMigrations();
  cleanupOldPurchasePhotos();
  cleanupOldOrderHistoryPhotos();
  navigate('tables');
  updateAlertBadge();

  setTimeout(() => {
    // Ch�? auto-backup LocalStorage khi Firebase chưa sẵn sàng (offline mode)
    if (!window.DB || !window.appState || !window.appState.ready) {
      if(Store.autoBackupIfNeeded()) console.log('[POS] Auto backup (offline mode) done');
    } else {
      console.log('[POS] Firebase đang hoạt động - bỏ qua auto backup LocalStorage');
    }
  }, 3000);
  try { updatePurOcrModeLabel(); } catch(_) {}
  setTimeout(() => {
    try { autoExportReportsIfNeeded(); } catch(_) {}
  }, 4500);

  // 3. ======================== FIREBASE BRIDGE ========================
  // db.js dùng type="module" nên window.DB gán bất �?�?ng b�?.
  // Hàm này poll t�?i �?a 5 giây r�?i m�?i �?�?ng ký lắng nghe events.
  function _waitForDB(cb, timeout = 5000) {
    if (window.DB) { cb(); return; }
    const start = Date.now();
    const t = setInterval(() => {
      if (window.DB) {
        clearInterval(t);
        cb();
      } else if (Date.now() - start > timeout) {
        clearInterval(t);
        console.warn('[Bridge] ⚠️ window.DB không khởi tạo được sau 5s - chạy offline');
      }
    }, 50);
  }

  _waitForDB(() => {
    console.log('[Bridge] window.DB đã sẵn sàng - đăng ký Firebase events');

  window.addEventListener('db:signedIn', (e) => {
    const ud = e.detail && e.detail.userDoc;
    if (ud) {
      currentUser = { username: ud.displayName || ud.username || ud.email, role: ud.role };
      // Ẩn màn hình �?�?ng nhập nếu �?ẫ load xong Auth
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.classList.remove('active');
      applyRoleRights();
      console.log('[Bridge] db:signedIn ->', ud.role, ud.email);
    }
  });

  // Khi db.js báo signedOut �?? ch�? reload nếu TRƯ�?C Đ�? có session (tránh vòng lặp reload)
  window.addEventListener('db:signedOut', () => {
    const hadSession = !!sessionStorage.getItem('gkhl_current_session');
    sessionStorage.removeItem('gkhl_current_session');
    if (hadSession) {
      // Người dùng �?ang dùng app r�?i b�? �?�?ng xuất �?? reload về login
      location.reload();
    }
    // Nếu chưa có session (lần �?ầu load, chưa �?�?ng nhập) �?? không làm gì
  });

  // Khi Firebase �?ã ready (tất cả snapshot �?ã về)
  window.addEventListener('db:ready', () => {
    console.log('[Bridge] appState.ready - re-render từ Cloud');
    applyStoreSettings();
    renderTables();
    updateAlertBadge();
    renderUserManagement();

    // Re-render các màn hình dựa trên current page �?�? tránh b�? tr�?ng
    if (typeof currentPage !== 'undefined') {
      if (currentPage === 'orders') {
        renderCatTabs?.();
        renderMenuItems();
      } else if (currentPage === 'menu') {
        try { renderMenuAdmin(); } catch(_) {}
      } else if (currentPage === 'inventory') {
        try { renderInventory(); } catch(_) {}
      }
    }

    // Kh�?i tạo sơ �?�? bàn nếu collection tables tr�?ng (ch�?ng failed-precondition)
    if (window.DB && window.DB.seedTables) {
      const s = (window.appState && window.appState.settings) || {};
      const tableCount = s.tableCount || 20;
      window.DB.seedTables(tableCount)
        .then(r => { if (r && r.created) renderTables(); })
        .catch(console.error);
    }
  });

  // Re-render khi từng collection cập nhật (Real-time sync)
  window.addEventListener('db:update', (e) => {
    const key = e.detail && e.detail.key;
    if (key === 'tables' || key === 'orders') renderTables();
    if (key === 'settings')                   applyStoreSettings();
    if (key === 'users' || key === 'presence') renderUserManagement();
    if (key === 'menu') {
      renderMenuItems();
      renderCatTabs?.();
      if (typeof currentPage !== 'undefined' && currentPage === 'menu') {
        try { renderMenuAdmin(); } catch(_) {}
      }
    }
    // Báo cáo: re-render khi l�?ch sử / chi phí / nhập hàng thay �?�?i
    if (key === 'history' || key === 'expenses' || key === 'purchases') {
      renderTables();    // cập nhật doanh thu hôm nay trên thẻ
      updateAlertBadge();
      // Nếu �?ang �? trang reports hoặc finance thì re-render luôn
      if (typeof currentPage !== 'undefined' && currentPage === 'reports') {
        try { renderReports(); } catch(_) {}
      }
      if (typeof currentPage !== 'undefined' && currentPage === 'finance') {
        try { renderFinancePage?.() || updateFinanceUI(getRevenueSummary(financePeriod, financeDateOpts)); } catch(_) {}
      }
    }
  });
  // ===================================================================
  }); // end _waitForDB
}); // end DOMContentLoaded



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

// Chạy m�?t lần lúc load �?�? tự �?�?ng sửa l�?i chính tả dữ li�?u cũ mà không làm mất trạng thái của người dùng
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
    else if (m.name === 'Khô cá bò') { mappedMenu = true; m.name = 'Khô cá bò nướng'; }
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
  // Ưu tiên settings từ Cloud (appState), fallback về LocalStorage
  const s = (window.appState && window.appState.settings && window.appState.settings.storeName)
    ? window.appState.settings
    : Store.getSettings();

  if(s.bankAccount) PAYMENT_INFO.account = s.bankAccount;
  if(s.bankName)    PAYMENT_INFO.bank    = s.bankName;
  if(s.bankOwner)   PAYMENT_INFO.name    = s.bankOwner;

  const logoText = document.querySelector('.logo-text');
  if(logoText) logoText.textContent = s.storeName || 'Gánh Khô Chữa Lành';

  const logoIcon = document.querySelector('.logo-icon');
  if(logoIcon) {
    if(s.storeLogo) {
      logoIcon.innerHTML = `<img src="${s.storeLogo}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
      logoIcon.style.background = 'transparent';
    } else {
      logoIcon.innerHTML = '🧡';
      logoIcon.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
    }
  }
}

// Dọn ảnh nhập hàng cũ theo photoRetentionDays
async function cleanupOldPurchasePhotos() {
  try {
    const s = Store.getSettings();
    const days = Number(s.photoRetentionDays || 0);
    if(!days || isNaN(days) || days <= 0) return;
    const map = purchasePhotoCache || {};
    if(Object.keys(map).length === 0) return;
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
    if(changed) {
      purchasePhotoCache = map;
      await Store.setPurchasePhotosAsync(map);
    }
  } catch(e) {
    console.warn('cleanupOldPurchasePhotos error', e);
  }
}

async function cleanupOldOrderHistoryPhotos() {
  try {
    // Cloud-first with LocalStorage fallback
    const history = (window.appState && window.appState.history && window.appState.history.length > 0)
      ? window.appState.history
      : Store.getHistory();
    if(!Array.isArray(history) || !history.length) return;
    const now = Date.now();
    const maxAgeMs = ORDER_HISTORY_PHOTO_RETENTION_DAYS * 86400000;

    for (const order of history) {
      const d = new Date(order.paidAt).getTime();
      if (!Number.isNaN(d) && (now - d) > maxAgeMs) {
         await PhotoDB.remove('history_' + order.historyId);
      }
    }
  } catch(e) {
    console.warn('cleanupOldOrderHistoryPhotos error', e);
  }
}

// ---- Navigation ----
function initNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.id !== 'nav-more') {
      el.addEventListener('click', () => navigate(el.dataset.page));
    }
  });
}

function navigate(page) {
  try { closeCartSheet(); } catch(_) {}
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.id === 'nav-more') {
      n.classList.toggle('active', ['menu', 'settings', 'insights'].includes(page));
    } else {
      n.classList.toggle('active', n.dataset.page === page);
    }
  });
  renderPage(page);
}

function openMoreModal() {
  document.getElementById('more-modal').classList.add('active');
}

function closeMoreModal() {
  document.getElementById('more-modal').classList.remove('active');
}

function navigateMore(page) {
  closeMoreModal();
  if (page === 'users' || page === 'settings') {
    navigate('settings');
    setTimeout(() => {
      const targetTab = page === 'users' ? 'users' : 'store';
      const btn = document.querySelector(`#page-settings .tab-bar .tab-btn[onclick*="'${targetTab}'"]`);
      if (btn) btn.click();
    }, 50);
  } else {
    navigate(page);
  }
}

function openInvMoreModal() {
  document.getElementById('inv-more-modal').classList.add('active');
}

function closeInvMoreModal() {
  document.getElementById('inv-more-modal').classList.remove('active');
}

function navigateInvMore(tab) {
  closeInvMoreModal();
  const btn = document.getElementById('inv-tab-more');
  switchInvTab(tab, btn);
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

function switchSettingsTab(tabId, btn) {
  const tabsWrap = btn.parentElement;
  tabsWrap.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const settingsWrap = document.getElementById('page-settings');
  settingsWrap.querySelectorAll('.settings-tab-content').forEach(el => el.style.display = 'none');
  const target = document.getElementById('set-tab-' + tabId);
  if(target) target.style.display = 'block';
}

function switchReportTab(tabId, btn) {
  const tabsWrap = btn.parentElement;
  tabsWrap.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const reportsWrap = document.getElementById('page-reports');
  reportsWrap.querySelectorAll('.report-tab-content').forEach(el => el.style.display = 'none');
  const target = document.getElementById('report-tab-' + tabId);
  if(target) target.style.display = 'block';
}

function navigateToReport(type) {
  navigate('reports');
  if (type === 'revenue') {
    const btn = document.querySelector('#page-reports .tab-bar .tab-btn:first-child');
    if (btn) switchReportTab('revenue', btn);
  } else if (type === 'expense') {
    const btn = document.querySelector('#page-reports .tab-bar .tab-btn:nth-child(2)');
    if (btn) switchReportTab('purchase', btn);
  }
}

function addNoteToCartItem(itemId) {
  const items = orderItems[currentTable] || [];
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const currentNote = item.note || '';
  const newNote = prompt(`Nhập ghi chú cho món [${item.name}]:`, currentNote);

  if (newNote !== null) {
    // Treat as valid update, trim if present
    item.note = newNote.trim();
    renderCart();
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
          📦 Nhập hàng đầy đủ
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('stock-alert-modal').classList.remove('active')">✕ Đóng</button>
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
  const inv = (window.appState && window.appState.inventory) || Store.getInventory();
  const item = inv.find(i => i.id === invId);
  if(!item) return;
  const amt = parseFloat(prompt(`Nhập thêm bao nhiêu ${item.unit} cho "${item.name}"?`, '10'));
  if(isNaN(amt) || amt <= 0) return;
  const newQty = (item.qty || 0) + amt;
  const currentTotalValue = (item.qty || 0) * (item.costPerUnit || 0);
  const addTotalValue = amt * (item.costPerUnit || 0); // For quick add, we assume the same cost per unit
  const newCostPerUnit = newQty > 0 ? (currentTotalValue + addTotalValue) / newQty : (item.costPerUnit || 0);

  // FIX 4: Ghi thẳng lên Firestore
  if (window.DB && window.DB.Inventory) {
    window.DB.Inventory.update(item.id, { qty: newQty, costPerUnit: newCostPerUnit })
      .then(() => {
        updateAlertBadge();
        openStockAlertPopup();
        showToast(`✅ Đã nhập thêm ${amt} ${item.unit} ${item.name}`);
      }).catch(e => showToast('Lỗi nhập kho: ' + e.message, 'danger'));
  } else {
    item.qty = newQty;
    Store.setInventory(inv);
    updateAlertBadge();
    openStockAlertPopup();
    showToast(`✅ Đã nhập thêm ${amt} ${item.unit} ${item.name}`);
  }
  Store.addPurchase({ id:uid(), name:item.name, qty:amt, unit:item.unit, price:item.costPerUnit*amt, costPerUnit:item.costPerUnit, date:new Date().toISOString(), supplier:'Nhập thủ công' });
}

// ============================================================
// PAGE: TABLES
// ============================================================

/**
 * _getTables() / _getOrders()
 * Luôn ưu tiên dữ li�?u từ Cloud (window.appState).
 * Nếu appState chưa ready hoặc r�?ng �?? fallback LocalStorage.
 * Đây là "L�?p �?�?m Fallback" ch�?ng Race Condition.
 */
function _getTables() {
  return (window.appState && window.appState.tables && window.appState.tables.length > 0)
    ? window.appState.tables
    : Store.getTables();
}
function _getOrders() {
  // appState.orders = { [tableId]: orderObject } (online format)
  // Store.getOrders() = { [tableId]: itemsArray } (offline format)
  // Trả về offline format �?�? không vỡ các hàm cũ
  if (window.appState && window.appState.orders && Object.keys(window.appState.orders).length > 0) {
    const map = {};
    Object.entries(window.appState.orders).forEach(([tid, order]) => {
      map[tid] = order.items || [];
    });
    return map;
  }
  return Store.getOrders();
}
function _getMenu() {
  const inv = _getInventory();
  const menu = (window.appState && window.appState.menu && window.appState.menu.length > 0)
    ? window.appState.menu
    : Store.getMenu();
  return (menu || []).map(item => normalizeMenuItemModel(item, inv));
}
function _getInventory() {
  const inventory = (window.appState && window.appState.inventory && window.appState.inventory.length > 0)
    ? window.appState.inventory
    : Store.getInventory();
  return (inventory || []).map(normalizeInventoryItemModel);
}



const ITEM_TYPE_LABELS = {
  [ITEM_TYPES.RETAIL]: 'Bán thẳng',
  [ITEM_TYPES.RAW]: 'Nguyên liệu',
  [ITEM_TYPES.FINISHED]: 'Thành phẩm',
};

function getCurrentUserRole() {
  return (window.appState && window.appState.userDoc && window.appState.userDoc.role)
    || (currentUser && currentUser.role)
    || 'admin';
}

function isAdminUser() {
  const role = String(getCurrentUserRole() || '').toLowerCase();
  return role === 'admin' || role === 'owner' || role === 'superadmin';
}

function normalizeViKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferInventoryItemType(item = {}) {
  if (item.itemType === ITEM_TYPES.RETAIL || item.itemType === ITEM_TYPES.RAW) return item.itemType;
  if (item.saleMode === 'retail' || item.directSale === true) return ITEM_TYPES.RETAIL;
  return ITEM_TYPES.RAW;
}

function normalizeInventoryItemModel(item = {}) {
  return {
    ...item,
    itemType: inferInventoryItemType(item),
    mergedInto: item.mergedInto || null,
    qty: Number(item.qty || 0),
    minQty: Number(item.minQty || 0),
    costPerUnit: Number(item.costPerUnit || 0),
    hidden: !!item.hidden,
  };
}

function inferMenuItemType(item = {}) {
  if (item.itemType === ITEM_TYPES.RETAIL || item.itemType === ITEM_TYPES.FINISHED) return item.itemType;
  return Array.isArray(item.ingredients) && item.ingredients.length > 0 ? ITEM_TYPES.FINISHED : ITEM_TYPES.RETAIL;
}

function findLinkedInventoryIdForMenuItem(item = {}, inventory = []) {
  if (item.linkedInventoryId && inventory.some(inv => inv.id === item.linkedInventoryId)) return item.linkedInventoryId;
  const exact = inventory.find(inv => !inv.hidden && normalizeViKey(inv.name) === normalizeViKey(item.name));
  return exact ? exact.id : null;
}

function normalizeMenuItemModel(item = {}, inventory = _getInventory()) {
  const itemType = inferMenuItemType(item);
  return {
    ...item,
    itemType,
    linkedInventoryId: itemType === ITEM_TYPES.RETAIL ? findLinkedInventoryIdForMenuItem(item, inventory) : null,
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
  };
}

function getInventoryTypeBadge(itemType) {
  if (itemType === ITEM_TYPES.RETAIL) return '<span class="badge badge-info">Bán thẳng</span>';
  if (itemType === ITEM_TYPES.FINISHED) return '<span class="badge badge-warning">Thành phẩm</span>';
  return '<span class="badge badge-primary">Nguyên liệu</span>';
}

function refreshIngredientDependentViews() {
  try { renderInventory(); } catch(_) {}
  try { renderMenuAdmin(); } catch(_) {}
  try { updateAlertBadge(); } catch(_) {}
  try {
    const purSelect = document.getElementById('pur-name');
    if (purSelect && document.getElementById('purchase-modal')?.classList.contains('active')) {
      const prev = purSelect.value;
      openPurchaseModal();
      if (prev) {
        purSelect.value = prev;
        onPurchaseItemSelect();
      }
    }
  } catch(_) {}
}

function propagateInventoryReferenceRename(oldItem, newItem) {
  if (!oldItem || !newItem || !oldItem.name || oldItem.name === newItem.name) return;
  const oldName = oldItem.name;
  const newName = newItem.name;

  // COMPLETE CLEANUP: Remove all references to old name and replace with new name
  
  // 1. Update Menu items with exact name match
  const menu = Store.getMenu().map(m => {
    const next = { ...m };
    // Update menu item name if it matches exactly
    if (next.name === oldName) {
      next.name = newName;
    }
    // Update ingredients in recipes
    if (Array.isArray(next.ingredients)) {
      next.ingredients = next.ingredients.map(ing => ing.name === oldName ? { ...ing, name: newName } : ing);
    }
    return next;
  });
  Store.setMenu(menu);

  // 2. Update Purchases with exact name match
  const purchases = Store.getPurchases().map(p => p.name === oldName ? { ...p, name: newName } : p);
  Store.setPurchases(purchases);

  // 3. Update Unit Conversions with exact name match
  const conversions = Store.getUnitConversions().map(c => c.ingredientName === oldName ? { ...c, ingredientName: newName } : c);
  Store.setUnitConversions(conversions);

  // 4. Update Expenses with exact name match
  const expenses = Store.getExpenses().map(e => e.name === oldName ? { ...e, name: newName } : e);
  Store.setExpenses(expenses);

  // 5. Update Cloud appState if exists
  if (window.appState?.menu) {
    window.appState.menu = window.appState.menu.map(m => {
      const next = { ...m };
      if (next.name === oldName) {
        next.name = newName;
      }
      if (Array.isArray(next.ingredients)) {
        next.ingredients = next.ingredients.map(ing => ing.name === oldName ? { ...ing, name: newName } : ing);
      }
      return next;
    });
  }
  if (window.appState?.purchases) {
    window.appState.purchases = window.appState.purchases.map(p => p.name === oldName ? { ...p, name: newName } : p);
  }
  if (window.appState?.expenses) {
    window.appState.expenses = window.appState.expenses.map(e => e.name === oldName ? { ...e, name: newName } : e);
  }
}

async function syncInventoryReferenceRenameToCloud(oldItem, newItem) {
  if (!window.DB || !oldItem || !newItem || !oldItem.name || oldItem.name === newItem.name) return;
  try {
    // Sync all menu items that might have been updated
    if (window.DB.Menu?.update) {
      for (const item of Store.getMenu()) {
        await window.DB.Menu.update(item.id, {
          name: item.name,
          itemType: item.itemType,
          linkedInventoryId: item.linkedInventoryId || null,
          ingredients: item.ingredients || [],
        });
      }
    }
    // Sync all purchases with the new name
    if (window.DB.Purchases?.update) {
      for (const p of Store.getPurchases().filter(x => x.name === newItem.name || x.name === oldItem.name)) {
        await window.DB.Purchases.update(p.id, { name: p.name });
      }
    }
    // Sync all expenses with the new name
    if (window.DB.Expenses?.update) {
      for (const e of Store.getExpenses().filter(x => x.name === newItem.name || x.name === oldItem.name)) {
        await window.DB.Expenses.update(e.id, { name: e.name });
      }
    }
    // Sync unit conversions
    if (window.DB.UnitConversions?.update) {
      for (const c of Store.getUnitConversions().filter(x => x.ingredientName === newItem.name || x.ingredientName === oldItem.name)) {
        await window.DB.UnitConversions.update(c.id, { ingredientName: c.ingredientName });
      }
    }
  } catch (e) {
    console.warn('[rename-sync] cloud warning', e);
  }
}

function tokenSimilarity(a, b) {
  const ta = new Set(normalizeViKey(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeViKey(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach(x => { if (tb.has(x)) common += 1; });
  return common / Math.max(ta.size, tb.size);
}

function getIngredientMergeSuggestions() {
  const inv = _getInventory().filter(i => !i.hidden && !i.mergedInto);
  const suggestions = [];
  for (let i = 0; i < inv.length; i++) {
    for (let j = i + 1; j < inv.length; j++) {
      const a = inv[i];
      const b = inv[j];
      if (a.itemType !== b.itemType || a.unit !== b.unit) continue;
      const na = normalizeViKey(a.name);
      const nb = normalizeViKey(b.name);
      const score = na === nb ? 1 : (na.includes(nb) || nb.includes(na) ? 0.9 : tokenSimilarity(a.name, b.name));
      if (score < 0.72) continue;
      const target = a.qty >= b.qty ? a : b;
      const source = target.id === a.id ? b : a;
      if (suggestions.some(s => s.source.id === source.id || s.target.id === source.id)) continue;
      suggestions.push({
        id: `merge_${source.id}_${target.id}`,
        source,
        target,
        score,
      });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score);
}

function renderIngredientMergeBoard() {
  const el = document.getElementById('ingredient-merge-board');
  if (!el) return;
  const suggestions = getIngredientMergeSuggestions();
  const requests = Store.getItemMergeRequests();
  if (!suggestions.length && !requests.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🧹</div><div class="empty-text">Chưa phát hiện nguyên liệu trùng gần giống.</div></div>';
    return;
  }

  const requestSet = new Set(requests.filter(r => r.status === 'pending').map(r => `${r.sourceId}:${r.targetId}`));
  el.innerHTML = suggestions.map(s => {
    const key = `${s.source.id}:${s.target.id}`;
    const hasPending = requestSet.has(key);
    const actionBtn = isAdminUser()
      ? `<button class="btn btn-xs btn-primary" onclick="approveIngredientMerge('${s.source.id}','${s.target.id}')">Phê duyệt merge</button>`
      : `<button class="btn btn-xs btn-outline" ${hasPending ? 'disabled' : ''} onclick="requestIngredientMerge('${s.source.id}','${s.target.id}')">${hasPending ? 'Đã gửi duyệt' : 'Gửi duyệt'}</button>`;
    return `<div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${s.source.name} → ${s.target.name}</div>
        <div class="list-item-sub">${ITEM_TYPE_LABELS[s.source.itemType]} · ${Math.round(s.score * 100)}% giống nhau · cùng đơn vị ${s.source.unit}</div>
      </div>
      <div class="list-item-right">${actionBtn}</div>
    </div>`;
  }).join('');
}

function requestIngredientMerge(sourceId, targetId) {
  const source = _getInventory().find(i => i.id === sourceId);
  const target = _getInventory().find(i => i.id === targetId);
  if (!source || !target) return;
  const requests = Store.getItemMergeRequests();
  if (requests.some(r => r.status === 'pending' && r.sourceId === sourceId && r.targetId === targetId)) {
    showToast('Đề nghị merge này đang chờ admin phê duyệt.', 'warning');
    return;
  }
  requests.unshift({
    id: uid(),
    sourceId,
    targetId,
    sourceName: source.name,
    targetName: target.name,
    requestedBy: currentUser?.username || 'staff',
    requestedAt: new Date().toISOString(),
    status: 'pending',
  });
  Store.setItemMergeRequests(requests);
  renderIngredientMergeBoard();
  showToast('Đã gửi đề nghị merge cho admin.', 'success');
}

async function approveIngredientMerge(sourceId, targetId) {
  if (!isAdminUser()) {
    showToast('Chỉ admin mới được phê duyệt merge nguyên liệu.', 'danger');
    return;
  }
  const inventory = _getInventory();
  const source = inventory.find(i => i.id === sourceId);
  const target = inventory.find(i => i.id === targetId);
  if (!source || !target) {
    showToast('Không tìm thấy nguyên liệu để merge.', 'warning');
    return;
  }
  if (source.id === target.id) return;
  
  // Enhanced confirmation message for complete cleanup
  const confirmMessage = `Gộp "${source.name}" vào "${target.name}"?\n\n` +
    `- Cộng dồn tồn kho\n` +
    `- Giữ lại tên "${target.name}"\n` +
    `- XÓA HOÀN TOÀN tên "${source.name}" khỏi hệ thống\n` +
    `- Cập nhật menu, phiếu nhập, quy đổi liên quan`;
  
  if (!confirm(confirmMessage)) return;

  const mergedQty = (target.qty || 0) + (source.qty || 0);
  const mergedCost = mergedQty > 0
    ? (((target.qty || 0) * (target.costPerUnit || 0)) + ((source.qty || 0) * (source.costPerUnit || 0))) / mergedQty
    : 0;

  const nextInventory = inventory.map(item => {
    if (item.id === target.id) {
      return {
        ...item,
        qty: mergedQty,
        costPerUnit: mergedCost,
        minQty: Math.max(item.minQty || 0, source.minQty || 0),
        supplierName: item.supplierName || source.supplierName || '',
        supplierPhone: item.supplierPhone || source.supplierPhone || '',
        supplierAddress: item.supplierAddress || source.supplierAddress || '',
      };
    }
    if (item.id === source.id) {
      return { ...item, qty: 0, hidden: true, mergedInto: target.id };
    }
    return item;
  });
  Store.setInventory(nextInventory);
  if (window.appState?.inventory) {
    window.appState.inventory = nextInventory.map(normalizeInventoryItemModel);
  }
  propagateInventoryReferenceRename(source, { ...target, name: target.name, id: target.id });
  await syncInventoryReferenceRenameToCloud(source, { ...target, name: target.name, id: target.id });

  const requests = Store.getItemMergeRequests().map(r => (
    r.sourceId === sourceId && r.targetId === targetId
      ? { ...r, status: 'approved', approvedBy: currentUser?.username || 'admin', approvedAt: new Date().toISOString() }
      : r
  ));
  Store.setItemMergeRequests(requests);

  if (window.DB) {
    try {
      if (window.DB.Inventory?.update) {
        await window.DB.Inventory.update(target.id, {
          qty: mergedQty,
          costPerUnit: mergedCost,
          minQty: Math.max(target.minQty || 0, source.minQty || 0),
          supplierName: target.supplierName || source.supplierName || '',
          supplierPhone: target.supplierPhone || source.supplierPhone || '',
          supplierAddress: target.supplierAddress || source.supplierAddress || '',
        });
        await window.DB.Inventory.update(source.id, { qty: 0, hidden: true, mergedInto: target.id });
      }
      if (window.DB.Menu?.update) {
        for (const item of Store.getMenu()) {
          await window.DB.Menu.update(item.id, {
            itemType: item.itemType,
            linkedInventoryId: item.linkedInventoryId || null,
            ingredients: item.ingredients || [],
            name: item.name,
          });
        }
      }
      if (window.DB.Purchases?.update) {
        for (const p of Store.getPurchases().filter(x => x.name === target.name || x.name === source.name)) {
          await window.DB.Purchases.update(p.id, { name: p.name });
        }
      }
    } catch (e) {
      console.warn('[merge] cloud sync warning', e);
    }
  }

  refreshIngredientDependentViews();
  renderIngredientMergeBoard();
  populateManualMergeDropdowns();
  showToast(`Đã merge "${source.name}" vào "${target.name}".`, 'success');
}

// ============================================================
// MANUAL MERGE FUNCTIONS
// ============================================================

function populateManualMergeDropdowns() {
  const inv = _getInventory().filter(i => !i.hidden && !i.mergedInto);
  const sortedInv = inv.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  
  const sourceSelect = document.getElementById('manual-merge-source');
  const targetSelect = document.getElementById('manual-merge-target');
  
  if (sourceSelect && targetSelect) {
    sourceSelect.innerHTML = '<option value="">-- Chọn nguyên liệu nguồn --</option>';
    targetSelect.innerHTML = '<option value="">-- Chọn nguyên liệu đích --</option>';
    
    sortedInv.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.name} (${item.unit})`;
      sourceSelect.appendChild(option.cloneNode(true));
      targetSelect.appendChild(option);
    });
  }
}

function initiateManualMerge() {
  const sourceId = document.getElementById('manual-merge-source').value;
  const targetId = document.getElementById('manual-merge-target').value;
  
  if (!sourceId || !targetId) {
    showToast('Vui lòng chọn cả nguyên liệu nguồn và nguyên liệu đích.', 'warning');
    return;
  }
  
  if (sourceId === targetId) {
    showToast('Không thể merge nguyên liệu với chính nó.', 'warning');
    return;
  }
  
  const source = _getInventory().find(i => i.id === sourceId);
  const target = _getInventory().find(i => i.id === targetId);
  
  if (!source || !target) {
    showToast('Không tìm thấy nguyên liệu.', 'error');
    return;
  }
  
  if (source.itemType !== target.itemType) {
    showToast('Chỉ có thể merge nguyên liệu cùng loại.', 'warning');
    return;
  }
  
  if (source.unit !== target.unit) {
    showToast('Chỉ có thể merge nguyên liệu cùng đơn vị tính.', 'warning');
    return;
  }
  
  if (confirm(`Xác nhận merge thủ công:\n\n"${source.name}" → "${target.name}"\n\n- Cộng dồn tồn kho\n- Giữ lại tên "${target.name}"\n- Xóa tên "${source.name}" khỏi hệ thống`)) {
    if (isAdminUser()) {
      approveIngredientMerge(sourceId, targetId);
      return;
    }
    requestIngredientMerge(sourceId, targetId);
  }
}

function renderTables() {
  const tables = _getTables();
  const orders = _getOrders();
  const grid = document.getElementById('table-grid');
  const now = Date.now();
  const occupiedIcons = ['🍽️', '🍻', '🥢', '🍲', '🥘', '🍺', '🔥', '🧾'];

  const occupied = tables.filter(t => {
    const order = orders[t.id] || [];
    return order.length > 0 || t.status === 'occupied' || t.status === 'serving';
  }).length;
  const empty = tables.length - occupied;
  document.getElementById('tables-occupied').textContent = occupied;
  document.getElementById('tables-empty').textContent    = empty;

  updateShiftBtnUI();

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
    const order      = orders[t.id];
    const total      = order ? order.reduce((s,i) => s+i.price*i.qty, 0) : 0;
    const elapsed    = t.openTime ? Math.floor((now - new Date(t.openTime).getTime())/60000) : 0;
    const isOccupied = total > 0 || t.status === 'occupied' || t.status === 'serving';
    const statusClass = isOccupied ? 'occupied' : 'empty';
    const tableNum = Number(t.id) || 0;
    const occupiedEmoji = occupiedIcons[(Math.max(1, tableNum) - 1) % occupiedIcons.length];
    const statusEmoji = isOccupied ? occupiedEmoji : '🪑';

    return `<div class="table-card ${statusClass}" onclick="openTable(${t.id})" id="table-card-${t.id}">
      ${elapsed > 0 ? `<div class="table-time">${elapsed}p</div>` : ''}
      <div class="table-num">${t.id}</div>
      <div class="table-icon">${statusEmoji}</div>
      ${total > 0 ? `<div class="table-amount">${fmt(total)}đ</div>` : `<div class="table-status">${isOccupied ? 'Đang phục vụ' : 'Trống'}</div>`}
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
  const tid = (tableId === 'takeaway') ? 'takeaway' : Number(tableId);
  currentTable = (tid === 'takeaway') ? 'takeaway' : (isNaN(tid) ? tableId : tid);

  // Load existing order:
  // Ưu tiên từ Cloud (appState.orders), fallback LocalStorage
  if (!orderItems[currentTable]) {
    const cloudOrder = window.appState && window.appState.orders && window.appState.orders[String(currentTable)];
    if (cloudOrder && cloudOrder.items && cloudOrder.items.length > 0) {
      orderItems[currentTable] = [...cloudOrder.items];
      // Ghi cư�?c orderId vào b�? nh�? tiền cho phase write
      window._currentOrderId = window._currentOrderId || {};
      window._currentOrderId[currentTable] = cloudOrder.id || cloudOrder.orderId;
    } else {
      const localOrders = Store.getOrders();
      orderItems[currentTable] = localOrders[currentTable] ? [...localOrders[currentTable]] : [];
    }
  }

  const label = currentTable === 'takeaway' ? '🛍️ Mang về' : `Bàn ${currentTable}`;
  document.getElementById('order-table-title').textContent = label;
  navigate('orders');
}

async function clearTable() {
  try { closeCartSheet(); } catch(_) {}
  if (currentTable == null) return;
  const label = currentTable === 'takeaway' ? 'đơn mang về' : `bàn ${currentTable}`;
  if (!confirm(`Huỷ ${label}? Mọi món đang chọn sẽ bị xoá.`)) return;

  const key = String(currentTable);

  // Cloud: huỷ đơn nếu tồn tại
  try {
    if (window.DB && currentTable !== 'takeaway') {
      const orderIdFromCache = (typeof _getCloudOrderId === 'function') ? _getCloudOrderId(key) : null;
      const orderIdFromAppState = window.appState?.orders?.[key]?.id || null;
      const orderIdFromForTable = window.DB?.Orders?.forTable ? (window.DB.Orders.forTable(currentTable)?.id || null) : null;
      const orderIdFromTable = window.appState?.tables?.find?.(t => String(t.id) === key)?.orderId || null;
      const orderId = orderIdFromCache || orderIdFromAppState || orderIdFromForTable || orderIdFromTable;
      if (orderId && window.DB.Orders && window.DB.Orders.cancel) {
        await window.DB.Orders.cancel(orderId);
      }
      if (window._currentOrderId) delete window._currentOrderId[key];
      if (window.appState?.orders && window.appState.orders[key]) delete window.appState.orders[key];
    }
  } catch(e) {
    console.warn('[clearTable] cloud cancel error', e);
  }

  // Local: xoá giỏ
  orderItems[currentTable] = [];
  orderExtras[currentTable] = { discount: 0, discountInput: 0, discountType: 'amount', shipping: 0, note: '' };

  const orders = Store.getOrders();
  delete orders[key];
  Store.setOrders(orders);

  if (currentTable !== 'takeaway') {
    const tables = Store.getTables();
    const table = tables.find(t => String(t.id) === key);
    if (table) {
      table.status = 'empty';
      table.orderId = null;
      table.openTime = null;
      table.note = '';
      Store.setTables(tables);
    }
    if (window.appState?.tables) {
      const cloudTable = window.appState.tables.find(t => String(t.id) === key);
      if (cloudTable) {
        cloudTable.status = 'empty';
        cloudTable.orderId = null;
        cloudTable.openTime = null;
        cloudTable.note = '';
      }
    }
  }

  try { renderCart(); } catch(_) {}
  try { renderTables(); } catch(_) {}
  navigate('tables');
  showToast('✅ Đã huỷ bàn.', 'success');
}

// ============================================================
// CLOUD ORDER SYNC HELPERS  �??  Transaction-safe
// Thay thế pattern updateMeta({ items }) cũ (race condition)
// ============================================================

/** Lấy orderId hi�?n tại của 1 bàn từ Cloud (appState hoặc cache) */
function _getCloudOrderId(key) {
  const ordersMap = window.appState && window.appState.orders;
  return (window._currentOrderId && window._currentOrderId[String(key)])
    || (ordersMap && ordersMap[String(key)] && ordersMap[String(key)].id)
    || null;
}

/**
 * Đảm bảo t�?n tại �?ơn hàng Cloud cho bàn key.
 * Nếu chưa có �?? gọi Orders.open() và cache lại orderId.
 * Trả về Promise<orderId|null>
 */
async function _ensureCloudOrder(key) {
  if (!window.DB || key === 'takeaway') return null;
  let orderId = _getCloudOrderId(key);
  if (orderId) return orderId;
  const staffUid = window.appState && window.appState.uid;
  const tableName = `Bàn ${key}`;
  orderId = await window.DB.Orders.open(key, tableName, staffUid);
  window._currentOrderId = window._currentOrderId || {};
  window._currentOrderId[String(key)] = orderId;
  return orderId;
}

/**
 * Sync 1 thao tác item lên Firestore qua Transaction-based API.
 *
 * action = {
 *   type : 'add' | 'change' | 'remove'
 *   item : { id, name, price, cost, qty }   �?� bắt bu�?c khi type='add'
 *   itemId   : string                        �?� bắt bu�?c khi type='change'|'remove'
 *   itemNote : string                        �?� tuỳ chọn
 *   delta    : number                        �?� bắt bu�?c khi type='change'
 * }
 * tableKey = currentTable hoặc tableId của bàn cần sync
 *
 * Không ném exception ra ngoài �?? ch�? log l�?i �?�? UI không b�? block.
 */
async function _cloudSyncItem(action, tableKey) {
  if (!window.DB || tableKey === 'takeaway') return;
  const key = String(tableKey);
  try {
    let orderId;
    if (action.type === 'add') {
      // M�? �?ơn m�?i nếu chưa có
      orderId = await _ensureCloudOrder(key);
      if (!orderId) return;
      await window.DB.Orders.addItem(orderId, action.item);
    } else {
      // change / remove ch�? thực hi�?n khi �?ơn �?ã t�?n tại
      orderId = _getCloudOrderId(key);
      if (!orderId) return;
      if (action.type === 'change') {
        await window.DB.Orders.changeQty(orderId, action.itemId, action.itemNote || '', action.delta);
      } else if (action.type === 'remove') {
        await window.DB.Orders.removeItem(orderId, action.itemId, action.itemNote || '');
      }
    }
  } catch (e) {
    console.error('[POS] _cloudSyncItem failed:', action.type, e);
  }
}

// Lưu order cho m�?t bàn cụ th�? (dùng cho AI actions)
function saveOrderForTable(tableId) {
  const tid = (tableId === 'takeaway') ? 'takeaway' : Number(tableId);
  const key = (tid === 'takeaway') ? 'takeaway' : (isNaN(tid) ? String(tableId) : tid);

  // --- LocalStorage (offline backup) ---
  const orders = Store.getOrders();
  orders[key] = orderItems[key] || [];
  Store.setOrders(orders);

  if(key !== 'takeaway') {
    const tables = Store.getTables();
    const table = tables.find(t => t.id === key);
    if(table) {
      const hasItems = (orderItems[key] || []).length > 0;
      if(hasItems) {
        table.status   = 'occupied';
        table.openTime = table.openTime || Date.now();
      } else if(!hasItems) {
        table.status   = 'empty';
        table.openTime = null;
      }
      Store.setTables(tables);
    }
  }

  // --- Firestore (cloud sync �?? AI batch write) ---
  // saveOrderForTable �?ược gọi từ AI actions khi �?ã build sẵn toàn b�? orderItems[key].
  // Dùng _ensureCloudOrder + updateMeta là hợp lý vì AI là writer duy nhất tại thời �?i�?m này.
  if (window.DB && key !== 'takeaway') {
    const items = orderItems[key] || [];
    if (items.length > 0) {
      _ensureCloudOrder(key)
        .then(orderId => {
          if (orderId) return window.DB.Orders.updateMeta(orderId, { items });
        })
        .catch(console.error);
    } else {
      const orderId = _getCloudOrderId(key);
      if (orderId && window.DB.Orders && window.DB.Orders.cancel) {
        window.DB.Orders.cancel(orderId)
          .then(() => {
            if (window._currentOrderId) delete window._currentOrderId[String(key)];
          })
          .catch(console.error);
      }
    }
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
  // Khi m�? trang order, �?�?ng b�? UI ảnh bàn
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
  const menu  = _getMenu(); // �?� Cloud-first v�?i LocalStorage fallback
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
  const menu = _getMenu(); // �?� Cloud-first
  const dish = menu.find(m => m.id === itemId);
  if(!dish) return;
  if(!orderItems[currentTable]) orderItems[currentTable] = [];
  const existing = orderItems[currentTable].find(i => i.id === itemId);
  if(existing) { existing.qty++; }
  else { orderItems[currentTable].push({ id: dish.id, name: dish.name, price: dish.price, cost: dish.cost||0, qty:1 }); }
  saveOrder(); // localStorage + table status
  // Cloud: Transaction-based addItem (tránh race condition khi 2 nhân viên cùng thêm món)
  _cloudSyncItem({
    type: 'add',
    item: { id: dish.id, name: dish.name, price: dish.price, cost: dish.cost||0, qty: 1 },
  }, currentTable);
  renderMenuItems();
  renderCart();
  if(navigator.vibrate) navigator.vibrate(30);
}

function removeCartItem(itemId) {
  const items = orderItems[currentTable];
  if(!items) return;
  const idx = items.findIndex(i => i.id === itemId);
  if(idx < 0) return;
  items.splice(idx, 1);
  saveOrder();
  // Cloud: Transaction-based removeItem
  _cloudSyncItem({ type: 'remove', itemId, itemNote: '' }, currentTable);
  renderMenuItems();
  renderCart();
}

function changeQty(itemId, delta) {
  const items = orderItems[currentTable];
  if(!items) return;
  const idx = items.findIndex(i => i.id === itemId);
  if(idx < 0) return;
  items[idx].qty += delta;
  if(items[idx].qty <= 0) {
    items.splice(idx, 1);
    saveOrder();
    // Cloud: xóa dòng món khỏi �?ơn
    _cloudSyncItem({ type: 'remove', itemId, itemNote: '' }, currentTable);
  } else {
    saveOrder();
    // Cloud: Transaction-based changeQty (tránh race condition)
    _cloudSyncItem({ type: 'change', itemId, itemNote: '', delta }, currentTable);
  }
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
  const delta = qty - items[idx].qty; // tính delta �?�? dùng Transaction
  items[idx].qty = qty;
  saveOrder();
  // Cloud: Transaction-based changeQty v�?i delta thực tế
  if(delta !== 0) _cloudSyncItem({ type: 'change', itemId, itemNote: '', delta }, currentTable);
  renderMenuItems();
  renderCart();
}

function saveOrder() {
  // Ch�? ghi LocalStorage + cập nhật trạng thái bàn.
  // Cloud sync �?ược xử lý riêng b�?i _cloudSyncItem() trong từng hàm
  // (addToOrder, changeQty, removeCartItem, setCartQty) dùng Transaction-based API.

  // --- LocalStorage (offline backup) ---
  const orders = Store.getOrders();
  orders[currentTable] = orderItems[currentTable] || [];
  Store.setOrders(orders);

  if (currentTable !== 'takeaway') {
    const tables = Store.getTables();
    const table = tables.find(t => t.id === currentTable);
    if(table) {
      const hasItems = (orderItems[currentTable]||[]).length > 0;
      if(hasItems) {
        table.status   = 'occupied';
        table.openTime = table.openTime || Date.now();
      } else if(!hasItems) {
        table.status   = 'empty';
        table.openTime = null;
      }
      Store.setTables(tables);
    }
  }
}

function renderCart() {
  const items = orderItems[currentTable] || [];
  const extras = orderExtras[currentTable] || {discount: 0, discountInput: 0, discountType: 'amount', shipping: 0};
  
  const discountTypeEl = document.getElementById('cart-discount-type');
  const dInp = document.getElementById('cart-discount');
  const dNoteInp = document.getElementById('cart-discount-note');
  const sInp = document.getElementById('cart-shipping');
  const noteInp = document.getElementById('cart-note');

  if (discountTypeEl && document.activeElement === discountTypeEl) extras.discountType = discountTypeEl.value;
  else if (discountTypeEl) discountTypeEl.value = extras.discountType || 'amount';

  if (dInp && document.activeElement === dInp) extras.discountInput = parseFloat(dInp.value) || 0;
  else if (dInp) dInp.value = extras.discountInput || '';

  if (dNoteInp && document.activeElement === dNoteInp) extras.discountNote = dNoteInp.value || '';
  else if (dNoteInp) dNoteInp.value = extras.discountNote || '';

  if (sInp && document.activeElement === sInp) extras.shipping = parseFloat(sInp.value) || 0;
  else if (sInp) sInp.value = extras.shipping || '';

  if (noteInp && document.activeElement === noteInp) extras.note = noteInp.value || '';
  else if (noteInp) noteInp.value = extras.note || '';

  const taxRate = (() => { try { const s = Store.getSettings(); return s.taxRate != null ? Number(s.taxRate) : 0; } catch(_) { return 0; } })();
  const itemsTotal = items.reduce((s,i) => s + i.price*(i.qty||1), 0);

  if (extras.discountType === 'percent') {
    extras.discount = Math.round((itemsTotal * (extras.discountInput || 0)) / 100);
  } else {
    extras.discount = extras.discountInput || 0;
  }

  orderExtras[currentTable] = extras;

  // Tính t�?ng có VAT
  const subtotal = Math.max(0, itemsTotal - extras.discount + extras.shipping);
  const vatAmount = taxRate > 0 ? Math.round(subtotal * taxRate / 100) : 0;
  const total = subtotal + vatAmount;
  const qtyCount = items.reduce((s,i) => s + (i.qty || 1), 0);

  if(items.length === 0) {
    document.getElementById('cart-items').innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:32px">🛒</div><div class="empty-text">Chưa có món</div></div>`;
  } else {
      document.getElementById('cart-items').innerHTML = items.map(item =>
        `<div class="cart-item">
          <div>
            <div class="cart-item-name">${item.name}</div>
            ${item.note ? `<div style="font-size:10px; color:var(--text2); margin-top:2px;">( Ghi chú: ${item.note} )</div>` : ''}
          </div>
          <div class="cart-qty-ctrl">
            <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
            <input type="number" class="cart-qty-input" min="1" max="99" value="${item.qty}"
              onchange="setCartQty('${item.id}', this.value)"
              onclick="this.select()" style="width:38px;text-align:center;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text);font-size:14px;font-weight:700;padding:2px 4px">
            <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
          </div>
          <div style="display:flex; align-items:center; gap:6px">
            <div class="cart-price">${fmt(item.price*item.qty)}đ</div>
            <button class="qty-btn" style="color:var(--primary); background:rgba(0,149,255,0.1); width:28px;" onclick="addNoteToCartItem('${item.id}')" title="Thêm ghi chú">📝</button>
            <button class="qty-btn" style="color:var(--danger); background:rgba(255,61,113,0.1); width:28px;" onclick="removeCartItem('${item.id}')">✕</button>
          </div>
        </div>`
      ).join('');
  }

  // Hi�?n th�? VAT trong t�?ng nếu có
  const totalEl = document.getElementById('cart-total');
  if(totalEl) {
    if(vatAmount > 0) {
      totalEl.innerHTML = `${fmtFull(total)} <span style="font-size:10px;color:var(--text3);font-weight:400">(gồm VAT ${taxRate}%: ${fmtFull(vatAmount)})</span>`;
    } else {
      totalEl.textContent = fmtFull(total);
    }
  }
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) cartCountEl.textContent = `${qtyCount} món`;
  const pillCountEl = document.getElementById('order-cart-pill-count');
  if (pillCountEl) pillCountEl.textContent = String(qtyCount);
  const pillTotalEl = document.getElementById('order-cart-pill-total');
  if (pillTotalEl) pillTotalEl.textContent = fmtFull(total);
  document.getElementById('pay-btn').disabled = items.length === 0;

  // Cập nhật UI ảnh bàn (nếu �?ang �? �?úng trang)
  try {
    updateOrderPhotoUI();
  } catch(_) {}
}

function openCartSheet() {
  const overlay = document.getElementById('cart-sheet');
  const body = document.getElementById('cart-sheet-body');
  const cart = document.getElementById('order-cart-root');
  if (!overlay || !body || !cart) return;
  
  // Set explicit height to allow scrolling within the sheet
  body.style.maxHeight = '70vh';
  body.style.overflowY = 'auto';
  
  body.appendChild(cart);
  overlay.classList.add('active');
  renderCart();
}

function closeCartSheet() {
  const overlay = document.getElementById('cart-sheet');
  if (overlay) overlay.classList.remove('active');
  const host = document.getElementById('order-cart-host');
  const cart = document.getElementById('order-cart-root');
  if (host && cart) host.appendChild(cart);
  renderCart(); // Re-render to ensure it shows correctly in the host
}

function openBillModal() {
  try { closeCartSheet(); } catch(_) {}
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
    if (dish && dish.itemType === ITEM_TYPES.RETAIL) {
      const linked = inv.find(i => i.id === dish.linkedInventoryId) || inv.find(i => normalizeViKey(i.name) === normalizeViKey(dish.name));
      dishCost = linked ? linked.costPerUnit || 0 : dishCost;
    } else if (dish && dish.ingredients && dish.ingredients.length > 0) {
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

  // Lấy ảnh của bàn (t�?i �?a 5 ảnh) �?�? in kèm bill
  let orderPhotosHtml = '';
  try {
    if(!orderPhotoCache) orderPhotoCache = {};
    const list = (orderPhotoCache && currentTable && orderPhotoCache[currentTable]) ? orderPhotoCache[currentTable] : [];
    const limited = Array.isArray(list) ? list.slice(0, 5) : [];
    if(limited.length) {
      orderPhotosHtml = `
      <div class="bill-photo-page">
        <h3 style="font-size:14px;margin:12px 0 6px;">📸 Ảnh ghi nhận bàn</h3>
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
        <div class="bill-logo">🧾 ${s.storeName||'Gánh Khô Chữa Lành'}</div>
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
          <td>${i.name}${i.note ? `<br><small style="font-size:9px;color:#666;line-height:1">(Note: ${i.note})</small>` : ''}</td><td style="text-align:center">${i.qty}</td>
          <td style="text-align:right">${fmt(i.price)}</td>
          <td class="amount">${fmt(i.price*i.qty)}</td></tr>`).join('')}
        </tbody>
      </table>
      <hr class="bill-divider">
      ${extras.note ? `<div style="font-size:12px;margin-bottom:8px"><em>Ghi chú: ${extras.note}</em></div>` : ''}
      <div style="font-size:12px;margin-bottom:4px;color:var(--text3);display:flex;justify-content:space-between"><span>Tiền hàng</span><span>${fmtFull(itemsTotal)}</span></div>
      ${extras.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>🏷️ Giảm giá ${extras.discountNote ? `(${extras.discountNote})` : ''}</span><span>-${fmtFull(extras.discount)}</span></div>` : ''}
      ${extras.shipping > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>🚚 Phí giao hàng</span><span>+${fmtFull(extras.shipping)}</span></div>` : ''}
      ${vatAmount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:var(--primary)"><span>🧾 Thuế VAT (${taxRate}%)</span><span>+${fmtFull(vatAmount)}</span></div>` : ''}
      <div class="bill-total"><span>TỔNG CỘNG</span><span>${fmtFull(total)}</span></div>
      ${vatAmount > 0 ? `<div style="font-size:10px;color:var(--text3);text-align:right;margin-top:-4px">Đã bao gồm VAT ${taxRate}%: ${fmtFull(vatAmount)}</div>` : ''}
      <div class="bill-qr">
        <div class="bill-qr-label">Quét QR để thanh toán chuyển khoản</div>
        <img src="${qrUrl}" alt="QR Thanh toán" onerror="this.style.display='none'" style="width:200px;height:200px;object-fit:contain;margin:8px auto;display:block">
        <div class="bill-qr-bank">${s.bankName||'Vietinbank'} • ${bank}</div>
        <div class="bill-qr-amount">${fmtFull(total)}</div>
      </div>
      <hr class="bill-divider">
      <div class="bill-thanks">Cảm ơn quý khách! Hẹn gặp lại ❤️</div>
    </div>
    ${orderPhotosHtml}
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-secondary" style="flex:1" onclick="printBill()">🖨️ In bill</button>
      <button id="bill-pay-btn" class="btn btn-success" style="flex:1" onclick="openPaymentMethodModal()">💳 Thanh toán</button>
    </div>
    <div id="pay-watch-status" style="font-size:11px;text-align:center;margin-top:8px;min-height:16px;color:var(--text3);transition:color 0.3s"></div>`;

  document.getElementById('bill-modal').classList.add('active');

  // Bắt �?ầu theo dõi thanh toán tự �?�?ng (nếu �?ã cấu hình Casso)
  startPaymentWatcher(total, billNo);
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
  stopPaymentWatcher();
  document.getElementById('bill-modal').classList.remove('active');
}

function printBill() {
  const qrImg = document.querySelector('#bill-print-area img');
  if(qrImg && !qrImg.complete) {
    qrImg.onload  = () => window.print();
    qrImg.onerror = () => window.print();
    setTimeout(() => window.print(), 3000);
  } else {
    window.print();
  }
}

function confirmPayment(billNo, total, cost, extras, payMethod, vatAmount, taxRate) {
  const items      = orderItems[currentTable] || [];
  const tableLabel = currentTable === 'takeaway' ? '🛍️ Mang về' : `Bàn ${currentTable}`;

  // --- Ảnh hóa �?ơn ---
  let orderPhotosForBill = [];
  try {
    if(!orderPhotoCache) orderPhotoCache = {};
    const list = orderPhotoCache[currentTable] || [];
    if(Array.isArray(list) && list.length) {
      orderPhotosForBill = list.map(p => ({ id:p.id, dataUrl:p.dataUrl, takenAt:p.takenAt || null }));
      delete orderPhotoCache[currentTable];
      Store.setOrderPhotosAsync(orderPhotoCache);
    }
  } catch(_) {}

  const historyId = uid();
  if (orderPhotosForBill.length > 0) {
    PhotoDB.set('history_' + historyId, orderPhotosForBill);
  }

  const historyRecord = {
    historyId,
    id:           billNo,
    tableId:      currentTable,
    tableName:    tableLabel,
    note:         extras?.note || '',
    items:        items.map(i => ({...i})),
    total,
    cost,
    discount:     extras?.discount || 0,
    discountNote: extras?.discountNote || '',
    shipping:     extras?.shipping || 0,
    vatAmount:    vatAmount || 0,
    taxRate:      taxRate || 0,
    payMethod:    payMethod || 'cash',
    paidAt:       new Date().toISOString(),
    photos:       [],
  };

  // --- Ghi LocalStorage (offline backup) ---
  Store.addHistory(historyRecord);
  Store.deductInventory(items);

  // --- Ghi Firestore (cloud sync) ---
  if (window.DB) {
    const ordersMap = window.appState && window.appState.orders;
    const orderId   = (window._currentOrderId && window._currentOrderId[currentTable])
      || (ordersMap && ordersMap[String(currentTable)] && ordersMap[String(currentTable)].id);

    const payInfo = {
      total, cost,
      payMethod:    payMethod || 'cash',
      discount:     extras?.discount || 0,
      discountNote: extras?.discountNote || '',
      shipping:     extras?.shipping || 0,
      vatAmount:    vatAmount || 0,
      taxRate:      taxRate || 0,
      billNo,
      historyId,
    };

    if (orderId && currentTable !== 'takeaway') {
      // Đóng �?ơn trên Firestore �?? ghi history, xóa order, reset bàn
      window.DB.Orders.close(orderId, payInfo)
        .then(() => window.DB.Inventory.deduct(items))
        .catch(console.error);
    } else {
      // Bán mang về (Takeaway) hoặc Offline không có orderId
      if (window.DB.History && window.DB.History.add) {
        window.DB.History.add({ ...historyRecord, status: 'closed' }).catch(console.error);
      }
      if (window.DB.Inventory && window.DB.Inventory.deduct) {
        window.DB.Inventory.deduct(items).catch(console.error);
      }
    }
    // Dù có hay không orderId, xóa tracking
    if (window._currentOrderId) delete window._currentOrderId[currentTable];
  }

  // --- Dọn local state ---
  delete orderItems[currentTable];
  delete orderExtras[currentTable];
  const lsOrders = Store.getOrders();
  delete lsOrders[currentTable];
  Store.setOrders(lsOrders);

  if(currentTable !== 'takeaway') {
    const tables = Store.getTables();
    const table  = tables.find(t => t.id === currentTable);
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
  if(invTab === 'stock') {
    renderStockList();
    populateManualMergeDropdowns(); // Populate manual merge dropdowns when stock tab is shown
  }
  else if(invTab === 'purchase') renderPurchaseList();
  else if(invTab === 'ledger') renderLedger();
  else if(invTab === 'ncc') renderNCC();
  else if(invTab === 'conversion') renderConversionTab();
  else if(invTab === 'wastage') renderWastageTab();
  else if(invTab === 'stocktake') renderStocktakeHistory();
  else renderForecast();
}

// ============================================================
// ORDER PHOTOS (per table)
// ============================================================

function ensureOrderPhotoCache() {
  if(!orderPhotoCache) {
    orderPhotoCache = {};
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
    Store.setOrderPhotosAsync(orderPhotoCache);
    updateOrderPhotoUI();
    if(added > 0) {
      showToast(added > 1 ? `📸 Đã thêm ${added} ảnh cho bàn ${currentTable}` : `📸 Đã lưu ảnh cho bàn ${currentTable}`);
    } else {
      showToast('⚠️ Không có file ảnh hợp lệ.', 'warning');
    }
    if(files.length > added && list.length >= 5) {
      showToast('⚠️ Đã đủ 5 ảnh/bàn - bỏ qua phần còn lại.', 'warning');
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
    
    // Áp dụng lưu ngay sau khi chụp �?�? tránh vi�?c chưa submit �?ã mất ảnh
    persistCurrentPurchasePhotosBatch();

    setPurOcrStatus(added > 1
      ? `📸 Đã thêm ${added} ảnh chứng từ. Có thể bấm "Quét" để đọc dữ liệu.`
      : '📸 Đã thêm ảnh chứng từ. Có thể bấm "Quét" để đọc dữ liệu.');
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
  window._currentPurchaseViewerPhoto = photo;
}

function openCurrentPurchasePhotoViewerFull() {
  const p = window._currentPurchaseViewerPhoto;
  if(!p) return;
  const modal = document.getElementById('purchase-photo-full-modal');
  const img = document.getElementById('purchase-photo-full-img');
  const wrap = document.getElementById('purchase-photo-full-wrap');
  const meta = document.getElementById('purchase-photo-full-meta');
  if(!modal || !img) return;

  ImgZoom.detach();
  img.src = p.dataUrl;
  if(meta) meta.textContent = p.takenAt ? `Thời gian chụp: ${fmtDateTime(p.takenAt)}` : '';
  modal.classList.add('active');
  img.onload = () => ImgZoom.attach(wrap || img.parentElement, img);
  if(img.complete && img.naturalWidth) ImgZoom.attach(wrap || img.parentElement, img);
}

async function persistCurrentPurchasePhotosBatch() {
  if(!currentPurchasePhotosBatchId) return;
  if(!currentPurchasePhotos || !currentPurchasePhotos.length) return;
  try {
    const map = purchasePhotoCache || {};
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
    purchasePhotoCache = map;
    await Store.setPurchasePhotosAsync(map);
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
  // Heuristic �?ơn giản: tìm s�? l�?n nhất làm price, s�? còn lại làm qty
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
    if(/[A-Za-z\u00C0-\u1EF9]/.test(l) && l.length > bestLine.length) bestLine = l;
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
  if(result.name) {
    // Tìm nguyên liệu gần giống nhất trong danh sách
    const inv = Store.getInventory();
    const match = inv.find(i => i.name.toLowerCase().includes(result.name.toLowerCase()) || result.name.toLowerCase().includes(i.name.toLowerCase()));
    if(match && !nameInp.value) {
      nameInp.value = match.id;
      onPurchaseItemSelect();
      filled.push('tên nguyên liệu');
    }
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
  const inv = _getInventory();
  const search = (document.getElementById('inv-search')||{}).value || '';
  const filtered = inv
    .filter(i => !i.hidden && (!search || i.name.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi')); // Sắp xếp theo alphabet tiếng Việt
  const {critical, low} = getInventoryAlerts();
  const critSet = new Set(critical.map(i=>i.id));
  const lowSet = new Set(low.map(i=>i.id));

  // Calculate total inventory value
  let totalValue = 0;
  filtered.forEach(i => {
    totalValue += (i.qty || 0) * (i.costPerUnit || 0);
  });
  
  const totalValEl = document.getElementById('total-inventory-value');
  if (totalValEl) {
    totalValEl.textContent = fmtFull(totalValue);
  }

  const html = filtered.map(i => {
    const pct = Math.min(100, (i.qty / (i.minQty * 3)) * 100);
    const level = critSet.has(i.id) ? 'low' : lowSet.has(i.id) ? 'mid' : 'ok';
    const barClass = level === 'low' ? 'red' : level === 'mid' ? 'yellow' : 'green';
    return `<div class="inv-item" onclick="viewItemLedger('${i.id}')" style="cursor:pointer;">
      <div style="flex:1">
        <div class="inv-name">${i.name} <span class="inv-unit">(${i.unit})</span> ${getInventoryTypeBadge(i.itemType)}</div>
        <div class="progress"><div class="progress-bar ${barClass}" style="width:${pct}%"></div></div>
        <div style="font-size:10px;color:var(--text3)">Tối thiểu: ${i.minQty} ${i.unit}</div>
      </div>
      <div style="text-align:right">
        <div class="inv-qty ${level}">${i.qty}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">Giá vốn: ${fmt(i.costPerUnit||0)}đ</div>
        ${i.supplierName ? `<div style="font-size:10px;color:var(--text3);margin-top:2px">NCC: ${i.supplierName}</div>` : ''}
        <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
          <span style="font-size:10px;color:var(--text3)">Xem thẻ kho để quản lý</span>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-text">Không có dữ liệu</div></div>';

  document.getElementById('stock-list').innerHTML = html;
  renderIngredientMergeBoard();

  // Alert summary
  const alertDiv = document.getElementById('inv-alerts');
  let alertHtml = '';
  if(critical.length > 0) alertHtml += `<div class="alert-card danger" style="cursor:pointer" onclick="openStockAlertPopup()"><div class="alert-icon">🚨</div><div class="alert-content"><div class="alert-title">Cần nhập gấp (${critical.length})</div><div class="alert-desc">${critical.map(i=>i.name).join(', ')}</div></div></div>`;
  if(low.length > 0) alertHtml += `<div class="alert-card warning" style="cursor:pointer" onclick="openStockAlertPopup()"><div class="alert-icon">⚠️</div><div class="alert-content"><div class="alert-title">Sắp hết (${low.length})</div><div class="alert-desc">${low.map(i=>i.name).join(', ')}</div></div></div>`;
  alertDiv.innerHTML = alertHtml;
}

function viewItemLedger(itemId) {
  // Switch to ledger tab
  switchInvTab('ledger', document.querySelector('.tab-btn:nth-child(3)'));

  // Select the clicked item in ledger dropdown then re-render
  setTimeout(() => {
    const ledgerSelect = document.getElementById('ledger-item-select');
    if (ledgerSelect) {
      ledgerSelect.value = itemId;
      renderLedger();
    }
  }, 100);
}

function quickAddStock(invId) {
  const inv = (window.appState && window.appState.inventory) || Store.getInventory();
  const item = inv.find(i => i.id === invId);
  if(!item) return;
  const amt = parseFloat(prompt(`Nhập thêm bao nhiêu ${item.unit}?`, '10'));
  if(isNaN(amt) || amt <= 0) return;
  const newQty = (item.qty || 0) + amt;
  // FIX 4: Ghi thẳng lên Firestore
  if (window.DB && window.DB.Inventory) {
    window.DB.Inventory.update(item.id, { qty: newQty })
      .then(() => {
        renderInventory();
        updateAlertBadge();
        showToast(`✅ Đã nhập thêm ${amt} ${item.unit} ${item.name}`);
      }).catch(e => showToast('Lỗi nhập kho: ' + e.message, 'danger'));
  } else {
    item.qty = newQty;
    Store.setInventory(inv);
    renderInventory();
    updateAlertBadge();
    showToast(`✅ Đã nhập thêm ${amt} ${item.unit} ${item.name}`);
  }
  // Log purchase (vẫn giữ track�??s purchase record)
  Store.addPurchase({ id:uid(), name:item.name, qty:amt, unit:item.unit, price:(item.costPerUnit||0)*amt, costPerUnit:item.costPerUnit||0, date:new Date().toISOString(), supplier:'Nhập thủ công' });
}

function openAddInvItemModal() {
  document.getElementById('inv-edit-id').value = '';
  document.getElementById('inv-edit-name').value = '';
  document.getElementById('inv-edit-unit').value = '';
  document.getElementById('inv-edit-type').value = ITEM_TYPES.RAW;
  document.getElementById('inv-edit-qty').value = '0';
  document.getElementById('inv-edit-min').value = '5';
  document.getElementById('inv-edit-cost').value = '0';
  document.getElementById('inv-edit-status').value = 'active';
  document.getElementById('inv-edit-supplier').value = '';
  document.getElementById('inv-edit-supplier-phone').value = '';
  document.getElementById('inv-edit-supplier-addr').value = '';
  document.getElementById('inv-edit-modal-title').textContent = '🧾 Tạo Nguyên Liệu Mới';
  document.getElementById('inv-edit-modal').classList.add('active');
}

function editInvItem(invId) {
  const inv = Store.getInventory();
  const item = inv.find(i => i.id === invId);
  if(!item) return;
  document.getElementById('inv-edit-id').value = item.id;
  document.getElementById('inv-edit-name').value = item.name;
  document.getElementById('inv-edit-unit').value = item.unit;
  document.getElementById('inv-edit-type').value = item.itemType || ITEM_TYPES.RAW;
  document.getElementById('inv-edit-qty').value = item.qty;
  document.getElementById('inv-edit-min').value = item.minQty;
  document.getElementById('inv-edit-cost').value = item.costPerUnit || 0;
  document.getElementById('inv-edit-status').value = item.hidden ? 'hidden' : 'active';
  document.getElementById('inv-edit-supplier').value = item.supplierName || '';
  document.getElementById('inv-edit-supplier-phone').value = item.supplierPhone || '';
  document.getElementById('inv-edit-supplier-addr').value = item.supplierAddress || '';
  document.getElementById('inv-edit-modal-title').textContent = '🧾 Cập nhật nguyên liệu';
  document.getElementById('inv-edit-modal').classList.add('active');
}

function submitInvEdit(e) {
  e.preventDefault();
  const id = document.getElementById('inv-edit-id').value;
  const name = document.getElementById('inv-edit-name').value.trim();
  const unit = document.getElementById('inv-edit-unit').value.trim();
  const itemType = document.getElementById('inv-edit-type').value;
  const minQty = parseFloat(document.getElementById('inv-edit-min').value);
  const cost = parseFloat(document.getElementById('inv-edit-cost').value);
  const status = document.getElementById('inv-edit-status').value;
  const supplierName = document.getElementById('inv-edit-supplier').value.trim();
  const supplierPhone = document.getElementById('inv-edit-supplier-phone').value.trim();
  const supplierAddress = document.getElementById('inv-edit-supplier-addr').value.trim();

  if(!name || !unit || isNaN(minQty) || isNaN(cost)) return;

  const hidden = (status === 'hidden');
  const existing = id ? Store.getInventory().find(i => i.id === id) : null;
  const updateData = { name, unit, itemType, minQty, costPerUnit: cost, hidden, supplierName, supplierPhone, supplierAddress };
  
  if (window.DB && window.DB.Inventory) {
    if (id) {
      window.DB.Inventory.update(id, updateData)
        .then(() => {
          if (window.appState?.inventory) {
            const idx = window.appState.inventory.findIndex(i => i.id === id);
            if (idx >= 0) window.appState.inventory[idx] = { ...window.appState.inventory[idx], ...updateData };
          }
          propagateInventoryReferenceRename(existing, { ...existing, ...updateData, id });
          syncInventoryReferenceRenameToCloud(existing, { ...existing, ...updateData, id });
          refreshIngredientDependentViews();
          document.getElementById('inv-edit-modal').classList.remove('active');
          showToast('✅ Đã cập nhật nguyên liệu');
        }).catch(e => showToast('Lỗi cập nhật kho: ' + e.message, 'danger'));
    } else {
      window.DB.Inventory.add({ id: uid(), qty: 0, ...updateData })
        .then(() => {
          refreshIngredientDependentViews();
          document.getElementById('inv-edit-modal').classList.remove('active');
          showToast('✅ Đã tạo nguyên liệu mới');
        }).catch(e => showToast('Lỗi tạo nguyên liệu: ' + e.message, 'danger'));
    }
  } else {
    const inv = Store.getInventory();
    if (id) {
      const idx = inv.findIndex(i => i.id === id);
      if(idx >= 0) {
        inv[idx] = { ...inv[idx], ...updateData };
      }
    } else {
      inv.push({ id: uid(), qty: 0, ...updateData });
    }
    Store.setInventory(inv);
    if (id) propagateInventoryReferenceRename(existing, { ...(existing || {}), ...updateData, id });
    refreshIngredientDependentViews();
    document.getElementById('inv-edit-modal').classList.remove('active');
    showToast(id ? '✅ Đã cập nhật nguyên liệu' : '✅ Đã tạo nguyên liệu mới');
  }
}

function getPurchasePhotoBatchEntries() {
  const map = purchasePhotoCache || {};
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
    return '<div class="card" style="padding:12px;margin-bottom:12px;"><div class="card-title" style="margin-bottom:6px">🖼️ Quản lý hình ảnh đã chụp</div><div class="card-sub" style="font-size:12px;color:var(--text3)">Chưa có ảnh chứng từ đã lưu</div></div>';
  }

  const html = entries.slice(0, 10).map(e => `
    <div class="list-item" style="flex-direction:row;align-items:flex-start;gap:10px;">
      <div class="list-item-icon" style="width:56px;height:56px;background:rgba(0,149,255,0.1);border-radius:14px;overflow:hidden;padding:0;">
        <img src="${e.photos[0].dataUrl}" alt="Ảnh" style="width:100%;height:100%;object-fit:cover;cursor:pointer;"
             onclick="openPurchasePhotoFullFromBatch('${e.batchId}', 0)">
      </div>
      <div class="list-item-content">
        <div class="list-item-title">🖼️ Batch chứng từ</div>
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
        <div class="card-title">🖼️ Quản lý hình ảnh đã chụp</div>
        <div class="card-sub" style="margin-left:auto;font-size:11px;color:var(--text3)">Xem lại & xóa thủ công</div>
      </div>
      ${html}
    </div>
  `;
}

function viewPurchasePhotoBatch(batchId) {
  const map = purchasePhotoCache || {};
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
  const map = purchasePhotoCache || {};
  const entry = map[batchId];
  const photos = Array.isArray(entry) ? entry : (entry && Array.isArray(entry.photos) ? entry.photos : []);
  const p = photos && photos.length ? photos[photoIdx] : null;
  if(!p) return;

  const modal = document.getElementById('purchase-photo-full-modal');
  const img = document.getElementById('purchase-photo-full-img');
  const wrap = document.getElementById('purchase-photo-full-wrap');
  const meta = document.getElementById('purchase-photo-full-meta');
  if(!modal || !img) return;

  ImgZoom.detach();
  img.src = p.dataUrl;
  if(meta) meta.textContent = p.takenAt ? `Thời gian chụp: ${fmtDateTime(p.takenAt)}` : `Batch: ${batchId}`;
  modal.classList.add('active');
  // Attach zoom after image loads
  img.onload = () => ImgZoom.attach(wrap || img.parentElement, img);
  if(img.complete && img.naturalWidth) ImgZoom.attach(wrap || img.parentElement, img);
}

function openPurchasePhotoBatchFull(photoIdx) {
  const photos = window._activePurchasePhotoBatchPhotos || [];
  const p = photos[photoIdx];
  if(!p) return;
  const modal = document.getElementById('purchase-photo-full-modal');
  const img = document.getElementById('purchase-photo-full-img');
  const wrap = document.getElementById('purchase-photo-full-wrap');
  const meta = document.getElementById('purchase-photo-full-meta');
  if(!modal || !img) return;

  ImgZoom.detach();
  img.src = p.dataUrl;
  if(meta) meta.textContent = p.takenAt ? `Thời gian chụp: ${fmtDateTime(p.takenAt)}` : '';
  modal.classList.add('active');
  img.onload = () => ImgZoom.attach(wrap || img.parentElement, img);
  if(img.complete && img.naturalWidth) ImgZoom.attach(wrap || img.parentElement, img);
}

async function deletePurchasePhotoBatch(batchId) {
  const map = purchasePhotoCache || {};
  if(!map[batchId]) {
    showToast('Không tìm thấy batch ảnh.', 'warning');
    return;
  }
  if(!confirm('Xóa toàn bộ ảnh chứng từ của batch này? Hành động này không thể hoàn tác.')) return;

  delete map[batchId];
  purchasePhotoCache = map;
  await Store.setPurchasePhotosAsync(map);

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

  // Nếu modal �?ang m�? batch �?ó thì reset
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
  const inv = _getInventory();

  const purchasesHtml = purchases.length ? purchases.map(p => {
    const invItem = inv.find(i => i.name === p.name);
    let subInfo = `${p.qty} ${p.unit} · ${p.supplier || 'Không rõ'} · ${fmtDate(p.date)}`;
    if (invItem) subInfo += `<br><small style="color:var(--text3)">${ITEM_TYPE_LABELS[invItem.itemType] || 'Nguyên liệu'}</small>`;
    if (p.note) {
      const safeNote = String(p.note).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      subInfo += `<br><small style="color:var(--text2)">${safeNote}</small>`;
    }
    if (p.photoBatchId) subInfo += `<br><small style="color:var(--text3)">🖼️ Batch: ${String(p.photoBatchId).slice(0,8)}...</small>`;
    if (p.supplierPhone) subInfo += `<br><small style="color:var(--text3)">ĐT: ${p.supplierPhone} ${p.supplierAddress ? '- ' + p.supplierAddress : ''}</small>`;
    return `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(0,149,255,0.1)">📥</div>
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
  }).join('') : '<div class="empty-state"><div class="empty-icon">📥</div><div class="empty-text">Chưa có lịch sử nhập hàng</div></div>';

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
  const inv = Store.getInventory();
  const item = inv.find(i => i.name === p.name);
  if(item) {
    document.getElementById('pur-name').value = item.id;
    onPurchaseItemSelect();
  }
  document.getElementById('pur-qty').value = p.qty;
  document.getElementById('pur-unit').value = p.unit || (p.qty ? 'phần' : '');
  document.getElementById('pur-price').value = p.price;
  calcPurUnitPrice();
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
      <div class="alert-icon">${n.urgent?'🚨':'📦'}</div>
      <div class="alert-content">
        <div class="alert-title">${n.name} <span class="badge ${n.urgent?'badge-danger':'badge-warning'}">${n.urgent?'KHẨN':'Dự báo'}</span></div>
        <div class="alert-desc">Tồn: ${n.currentQty} ${n.unit} | Trung bình/ngày: ${n.dailyAvg} ${n.unit}<br>Cần nhập thêm ~${n.need.toFixed(1)} ${n.unit} cho 3 ngày tới</div>
      </div>
    </div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Tồn kho đủ dùng!</div></div>';
}

function renderLedger() {
  const invItems = _getInventory();
  const select = document.getElementById('ledger-item-select');
  const monthInput = document.getElementById('ledger-month');
  
  if(!monthInput.value) {
    const d = new Date();
    monthInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  
  const currentVal = select.value;
  const sortedItems = invItems.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  select.innerHTML = '<option value="">-- Chọn Nguyên Liệu --</option>' + 
    sortedItems.map(i => `<option value="${i.id}">${i.hidden ? '🚫 ' : ''}${i.name} (${i.unit})</option>`).join('');
  select.value = currentVal;

  const itemId = select.value;
  const listEl = document.getElementById('ledger-list');
  const infoCardEl = document.getElementById('ledger-info-card');

  if(!itemId) {
    if(infoCardEl) infoCardEl.innerHTML = '';
    listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📒</div><div class="empty-text">Vui lòng chọn một nguyên liệu để xem thẻ kho</div></div>';
    return;
  }

  const inv = invItems.find(i => i.id === itemId);
  if(!inv) return;

  const itemName = inv.name;

  // Hi�?n th�? thông tin nguyên li�?u
  if(infoCardEl) {
    infoCardEl.innerHTML = `
      <div class="card" style="padding:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(0,149,255,0.05),rgba(0,149,255,0.15))">
        <div>
          <div style="font-weight:700;font-size:16px;color:var(--text)">${inv.hidden ? '🚫 ' : ''}${inv.name} ${inv.hidden ? '<span style="font-size:10px;padding:2px 4px;background:#ff4d4f;color:#fff;border-radius:4px;vertical-align:middle;margin-left:4px">Đã ẩn</span>' : ''}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">Tồn hiện tại: <strong style="color:var(--primary)">${fmt(inv.qty)} ${inv.unit}</strong></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" onclick="editInvItem('${inv.id}')">✏️ Sửa thông tin</button>
          <button class="btn btn-sm btn-danger" onclick="deleteInventoryItemFromLedger('${inv.id}')">🗑️ Xóa</button>
        </div>
      </div>
    `;
  }

  const [year, month] = monthInput.value.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 1).getTime();

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

  html += detailsHtml || '<div class="empty-state"><div class="empty-icon">📒</div><div class="empty-text">Không có giao dịch trong tháng</div></div>';

  document.getElementById('ledger-list').innerHTML = html;
}

async function deleteInventoryItemFromLedger(itemId) {
  if (!isAdminUser()) {
    showToast('Chỉ admin mới được xóa nguyên liệu.', 'danger');
    return;
  }

  const inventory = _getInventory();
  const item = inventory.find(i => i.id === itemId);
  if (!item) {
    showToast('Không tìm thấy nguyên liệu để xóa.', 'warning');
    return;
  }

  const menu = Store.getMenu();
  const unitConversions = Store.getUnitConversions();
  const relatedRetail = menu.filter(m => m.linkedInventoryId === item.id).length;
  const relatedRecipes = menu.reduce((sum, m) => sum + ((m.ingredients || []).filter(ing => ing.name === item.name).length), 0);
  const relatedConversions = unitConversions.filter(c => c.ingredientName === item.name).length;

  const msg = [
    `Xóa nguyên liệu "${item.name}" khỏi hệ thống?`,
    '',
    '- Nguyên liệu sẽ bị xóa khỏi Thẻ kho và Tồn kho',
    `- Liên kết menu bán thẳng bị ảnh hưởng: ${relatedRetail}`,
    `- Công thức có chứa nguyên liệu này: ${relatedRecipes}`,
    `- Quy đổi đơn vị liên quan: ${relatedConversions}`,
    '',
    'Hành động này không thể hoàn tác.'
  ].join('\n');
  if (!confirm(msg)) return;

  // 1) Xóa nguyên liệu trong kho
  const nextInventory = inventory.filter(i => i.id !== item.id);
  Store.setInventory(nextInventory);
  if (window.appState?.inventory) {
    window.appState.inventory = nextInventory.map(normalizeInventoryItemModel);
  }

  // 2) Dọn liên kết menu/công thức để tránh rác
  const nextMenu = menu.map(m => {
    const next = { ...m };
    if (next.linkedInventoryId === item.id) next.linkedInventoryId = null;
    if (Array.isArray(next.ingredients)) {
      next.ingredients = next.ingredients.filter(ing => ing.name !== item.name);
    }
    return next;
  });
  Store.setMenu(nextMenu);
  if (window.appState?.menu) window.appState.menu = nextMenu;

  // 3) Dọn quy đổi đơn vị liên quan
  const nextConversions = unitConversions.filter(c => c.ingredientName !== item.name);
  Store.setUnitConversions(nextConversions);

  // 4) Dọn request merge liên quan
  const nextRequests = Store.getItemMergeRequests().filter(r => r.sourceId !== item.id && r.targetId !== item.id);
  Store.setItemMergeRequests(nextRequests);

  // 5) Sync cloud (best effort)
  if (window.DB) {
    try {
      if (window.DB.Inventory?.delete) await window.DB.Inventory.delete(item.id);
      if (window.DB.Menu?.update) {
        for (const m of nextMenu) {
          await window.DB.Menu.update(m.id, {
            linkedInventoryId: m.linkedInventoryId || null,
            ingredients: m.ingredients || [],
            itemType: m.itemType,
            name: m.name,
          });
        }
      }
    } catch (e) {
      console.warn('[delete-inventory] cloud sync warning', e);
    }
  }

  const ledgerSelect = document.getElementById('ledger-item-select');
  if (ledgerSelect) ledgerSelect.value = '';
  refreshIngredientDependentViews();
  renderLedger();
  populateManualMergeDropdowns();
  showToast(`✅ Đã xóa nguyên liệu "${item.name}".`, 'success');
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
  // Reset session ảnh chứng từ cho lần nhập hi�?n tại
  currentPurchasePhotos = [];
  currentPurchasePhotosBatchId = null;
  const thumbs = document.getElementById('pur-photo-thumbs');
  if(thumbs) thumbs.innerHTML = '<div style="font-size:11px;color:var(--text3);">Chưa có ảnh chứng từ.</div>';
  const viewer = document.getElementById('pur-photo-viewer');
  if(viewer) viewer.style.display = 'none';
  setPurOcrStatus('');
  document.getElementById('purchase-modal-title').textContent = '📥 Nhập hàng mới';
  renderPurchaseSupplierDropdown(); // Load danh sách NCC
  
  // Render options for inventory select
  const inv = _getInventory().filter(i => !i.hidden && !i.mergedInto);
  const select = document.getElementById('pur-name');
  if(select) {
    select.innerHTML = '<option value="">-- Chọn nguyên liệu --</option>' + 
      inv.map(i => `<option value="${i.id}">${i.name} (${ITEM_TYPE_LABELS[i.itemType] || 'Nguyên liệu'})</option>`).join('');
  }
  document.getElementById('pur-last-price-hint').style.display = 'none';
  document.getElementById('pur-price-compare-hint').style.display = 'none';

  document.getElementById('purchase-modal').classList.add('active');
}

function calcPurUnitPrice() {
  const qtyStr = document.getElementById('pur-qty').value;
  const priceStr = document.getElementById('pur-price').value;
  const unit = document.getElementById('pur-unit')?.value || 'đvt';
  
  const unitLabel = document.getElementById('pur-unit-label');
  if (unitLabel) unitLabel.textContent = '/' + unit;

  const unitPriceEl = document.getElementById('pur-unit-price');
  const compareEl = document.getElementById('pur-price-compare-hint');
  if (unitPriceEl) {
    const qty = parseFloat(qtyStr);
    const price = parseFloat(priceStr);
    if (!isNaN(qty) && qty > 0 && !isNaN(price)) {
      const currentUnitPrice = Math.round(price / qty);
      unitPriceEl.value = currentUnitPrice.toLocaleString('vi-VN');
      const lastPrice = Number(unitPriceEl.dataset.lastPrice || 0);
      if (compareEl && lastPrice > 0) {
        const diff = currentUnitPrice - lastPrice;
        const pct = lastPrice > 0 ? Math.round((diff / lastPrice) * 100) : 0;
        const trend = diff > 0 ? '▲ tăng' : diff < 0 ? '▼ giảm' : '• bằng';
        const color = diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--success)' : 'var(--text3)';
        compareEl.innerHTML = `<span style="color:${color}">${trend} ${fmt(Math.abs(diff))}đ (${Math.abs(pct)}%) so với lần gần nhất</span>`;
        compareEl.style.display = '';
      } else if (compareEl) {
        compareEl.style.display = 'none';
      }
    } else {
      unitPriceEl.value = '';
      if (compareEl) compareEl.style.display = 'none';
    }
  }
}

function onPurchaseItemSelect() {
  const inv = Store.getInventory();
  const select = document.getElementById('pur-name');
  const itemId = select.value;
  const unitInp = document.getElementById('pur-unit');
  const hintEl = document.getElementById('pur-last-price-hint');

  if(!itemId) {
    unitInp.value = '';
    hintEl.style.display = 'none';
    return;
  }

  const item = inv.find(i => i.id === itemId);
  if(item) {
    unitInp.value = item.unit || '';
    
    // Tìm �?ơn giá nhập gần nhất
    const purchases = Store.getPurchases().filter(p => p.name === item.name);
    if(purchases.length > 0) {
      purchases.sort((a,b) => new Date(b.date) - new Date(a.date)); // M�?i nhất lên �?ầu
      const lastPur = purchases[0];
      const lastPrice = lastPur.qty > 0 ? lastPur.price / lastPur.qty : 0;
      hintEl.innerHTML = `Đơn giá nhập gần nhất: <strong>${fmt(lastPrice)}đ / ${item.unit}</strong>`;
      hintEl.style.display = 'block';
      const unitPriceEl = document.getElementById('pur-unit-price');
      if (unitPriceEl) unitPriceEl.dataset.lastPrice = String(Math.round(lastPrice));
    } else {
      hintEl.style.display = 'none';
      const unitPriceEl = document.getElementById('pur-unit-price');
      if (unitPriceEl) unitPriceEl.dataset.lastPrice = '';
    }
  }
  calcPurUnitPrice();
}

function submitPurchase(e) {
  e.preventDefault();
  const inv = Store.getInventory();
  const itemId = document.getElementById('pur-name').value;
  if(!itemId) return;
  let item = inv.find(i => i.id === itemId);
  if(!item) return;

  const name = item.name;
  const qty = parseFloat(document.getElementById('pur-qty').value);
  const price = parseFloat(document.getElementById('pur-price').value);
  const unit = document.getElementById('pur-unit')?.value.trim() || 'đvt';
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

  if(editId) {
    // EDIT MODE: update purchase record
    const purchases = Store.getPurchases();
    const pIdx = purchases.findIndex(p => p.id === editId);
    if(pIdx >= 0) {
      const oldQty = purchases[pIdx].qty;
      const oldPrice = purchases[pIdx].price;
      const oldName = purchases[pIdx].name;
      // Reverse old inventory change, apply new one
      let oldItem = inv.find(i => i.name.toLowerCase() === oldName.toLowerCase());
      if(oldItem) {
        const oldTotalValue = oldItem.qty * (oldItem.costPerUnit || 0);
        const revertedQty = Math.max(0, oldItem.qty - oldQty);
        const revertedTotalValue = Math.max(0, oldTotalValue - oldPrice);
        oldItem.qty = revertedQty;
        oldItem.costPerUnit = revertedQty > 0 ? revertedTotalValue / revertedQty : (oldItem.costPerUnit || 0);
      }

      if(item && item.name.toLowerCase() === name.toLowerCase()) {
        const currentQty = item.qty || 0;
        const currentCost = item.costPerUnit || 0;
        const newQty = currentQty + qty;
        const newCostPerUnit = newQty > 0 ? ((currentQty * currentCost) + price) / newQty : currentCost;
        item.qty = newQty;
        item.costPerUnit = newCostPerUnit;
        // Do not overwrite item.unit if it already exists, unless we want to? Let's just keep item.unit or update it.
        // Usually unit is set on creation. We will update it.
        item.unit = unit; 
      } else if(!item) {
        item = { id:uid(), name, qty, unit, minQty:5, costPerUnit:price/qty };
        inv.push(item);
      }

      // Gắn batch ảnh chứng từ (nếu có) cho lần ch�?nh sửa này
      if(currentPurchasePhotosBatchId && currentPurchasePhotos && currentPurchasePhotos.length) {
        persistCurrentPurchasePhotosBatch();
      }
      purchases[pIdx] = { ...purchases[pIdx], name, qty, price, unit:item.unit, itemType: item.itemType, inventoryItemId: item.id, costPerUnit:price/qty, supplier:supplierName, supplierId: supplierId || null, supplierPhone, supplierAddress:supplierAddr, note, photoBatchId: currentPurchasePhotosBatchId || purchases[pIdx].photoBatchId || null };
    Store.setPurchases(purchases);
    Store.setInventory(inv);
    delete form.dataset.editId;
    document.getElementById('purchase-modal-title').textContent = '📥 Nhập hàng mới';
    
    // Nếu chi phí �?i kèm, cũng cần update
    const expenses = Store.getExpenses();
    const expIdx = expenses.findIndex(e => e.name === `Nhập hàng: ${oldName}` && Math.abs(e.amount - oldPrice) < 0.1);
    if(expIdx >= 0) {
      expenses[expIdx] = { ...expenses[expIdx], name: `Nhập hàng: ${name}`, amount: price };
      Store.set(KEYS.expenses, expenses);
      if (window.DB && window.DB.Expenses && window.DB.Expenses.add) window.DB.Expenses.add(expenses[expIdx]);
    }
  }
  showToast('✅ Đã cập nhật nhập hàng!');
} else {
    // ADD MODE
    // Lưu batch ảnh chứng từ (nếu có) - ch�? lưu theo batch id �?�? tránh trùng lặp
    persistCurrentPurchasePhotosBatch();
    const purchaseId = uid();
    if(item) {
      const currentQty = item.qty || 0;
      const currentCost = item.costPerUnit || 0;
      const newQty = currentQty + qty;
      const newCostPerUnit = newQty > 0 ? ((currentQty * currentCost) + price) / newQty : currentCost;
      item.qty = newQty;
      item.costPerUnit = newCostPerUnit;
      item.unit = unit;
    } else {
      item = { id:uid(), name, qty, unit, itemType: ITEM_TYPES.RAW, minQty:5, costPerUnit:price/qty };
      inv.push(item);
    }
    Store.setInventory(inv);
    Store.addPurchase({ id:purchaseId, name, qty, unit:item.unit, itemType: item.itemType, inventoryItemId: item.id, price, costPerUnit:price/qty, date:new Date().toISOString(), supplier: supplierName, supplierId: supplierId || null, supplierPhone, supplierAddress: supplierAddr, note, photoBatchId: currentPurchasePhotosBatchId || null });
    // B�? Tạo bản ghi Expense tự �?�?ng, ch�? lưu Purchase
    // Store.addExpense({ id:uid(), name:`Nhập hàng: ${name}`, amount:price, category:'Nhập hàng', date:new Date().toISOString() });
    showToast('✅ Đã nhập hàng! Tiếp tục chọn nguyên liệu khác.', 'success');
  }

  // Sau khi bấm "Nhập hàng": giữ modal m�? �?�? tiếp tục nhập nguyên li�?u m�?i
  // - Reset các field nhập nguyên li�?u, giữ lại NCC + ảnh chứng từ
  if(editId) {
    document.getElementById('purchase-modal').classList.remove('active');
    document.getElementById('purchase-form').reset();
    renderInventory();
    updateAlertBadge();
    if (typeof renderPurchaseReport === 'function' && currentPage === 'reports') {
      renderPurchaseReport();
    }
    return;
  }

  // Clear only item fields
  document.getElementById('pur-name').value = '';
  document.getElementById('pur-qty').value = '';
  document.getElementById('pur-unit').value = '';
  document.getElementById('pur-price').value = '';
  calcPurUnitPrice();
  if(noteEl) noteEl.value = '';
  const nameInp = document.getElementById('pur-name');
  if(nameInp) nameInp.focus();
  renderInventory();
  updateAlertBadge();
}

// ============================================================
// STOCKTAKE (Ki�?m kê)
// ============================================================
function renderStocktakeHistory() {
  const expenses = Store.getExpenses().filter(e => ['Lãi/Lỗ do kiểm kê', 'Lãi/L�? do ki�?m kê'].includes(e.category));
  const listEl = document.getElementById('stocktake-history-list');
  if(!listEl) return;

  listEl.innerHTML = expenses.map(e => `
    <div class="list-item">
      <div class="list-item-icon" style="background:rgba(0,149,255,0.1)">📋</div>
      <div class="list-item-content">
        <div class="list-item-title">${e.name}</div>
        <div class="list-item-sub">${e.note || ''}</div>
        <div class="list-item-sub" style="font-size:10px;color:var(--text3)">${fmtDateTime(e.date)}</div>
      </div>
      <div class="list-item-right" style="flex-direction:row; gap:4px; align-items:center;">
        <div class="list-item-amount" style="color:${e.amount > 0 ? 'var(--danger)' : 'var(--success)'}">
          ${e.amount > 0 ? '-' : '+'}${fmt(Math.abs(e.amount))}đ
        </div>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Chưa có lịch sử kiểm kê</div></div>';
}

function openStocktakeModal() {
  const inv = Store.getInventory().filter(i => !i.hidden);
  const sortedInv = inv.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const listEl = document.getElementById('stocktake-list');
  if(!listEl) return;

  listEl.innerHTML = sortedInv.map(i => `
    <div class="list-item" style="padding:8px 12px; gap:8px">
      <div class="list-item-content">
        <div class="list-item-title">${i.name}</div>
        <div class="list-item-sub">Hệ thống: ${i.qty} ${i.unit}</div>
      </div>
      <div style="flex-shrink:0; width:100px">
        <input type="number" class="input input-sm stocktake-actual-qty" data-id="${i.id}" data-sys="${i.qty}" data-unit="${i.unit}" placeholder="Thực tế..." min="0" step="0.01">
      </div>
    </div>
  `).join('');

  document.getElementById('stocktake-modal').classList.add('active');
}

function submitStocktake() {
  const inv = Store.getInventory();
  const inputs = document.querySelectorAll('.stocktake-actual-qty');
  let changes = 0;

  const updates = [];

  inputs.forEach(inp => {
    const actualStr = inp.value.trim();
    if(actualStr === '') return;
    const actual = parseFloat(actualStr);
    const sys = parseFloat(inp.dataset.sys);
    const id = inp.dataset.id;
    const unit = inp.dataset.unit;
    
    if(!isNaN(actual) && actual !== sys) {
      const item = inv.find(i => i.id === id);
      if(item) {
        const diff = actual - sys; // dương = lãi (dư), âm = l�? (thiếu)
        const diffCost = diff * (item.costPerUnit || 0);

        updates.push({
          id: item.id,
          newQty: actual,
          diff,
          diffCost,
          name: item.name,
          unit
        });
      }
    }
  });

  if(updates.length === 0) {
    showToast('Không có thay đổi nào để lưu.');
    document.getElementById('stocktake-modal').classList.remove('active');
    return;
  }

  if(!confirm(`Lưu kết quả kiểm kê cho ${updates.length} nguyên liệu?`)) return;

  const now = new Date().toISOString();

  if (window.DB && window.DB.Inventory) {
    const promises = updates.map(u => {
      Store.addExpense({
        id: uid(),
        name: `Kiểm kê: Điều chỉnh ${u.diff > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(u.diff)} ${u.unit} ${u.name}`,
        amount: -u.diffCost, // Nếu dư -> diffCost > 0 -> amount < 0 (Lãi). Nếu thiếu -> diffCost < 0 -> amount > 0 (Chi phí)
        category: 'Lãi/Lỗ do kiểm kê',
        date: now,
        note: `Hệ thống: ${u.newQty - u.diff}, Thực tế: ${u.newQty}`
      });
      return window.DB.Inventory.update(u.id, { qty: u.newQty });
    });

    Promise.all(promises).then(() => {
      document.getElementById('stocktake-modal').classList.remove('active');
      renderInventory();
      showToast('✅ Đã lưu kết quả kiểm kê!', 'success');
    }).catch(err => showToast('Lỗi lưu kiểm kê: ' + err.message, 'danger'));
  } else {
    updates.forEach(u => {
      const item = inv.find(i => i.id === u.id);
      if(item) item.qty = u.newQty;
      Store.addExpense({
        id: uid(),
        name: `Kiểm kê: Điều chỉnh ${u.diff > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(u.diff)} ${u.unit} ${u.name}`,
        amount: -u.diffCost,
        category: 'Lãi/Lỗ do kiểm kê',
        date: now,
        note: `Hệ thống: ${u.newQty - u.diff}, Thực tế: ${u.newQty}`
      });
    });
    Store.setInventory(inv);
    document.getElementById('stocktake-modal').classList.remove('active');
    renderInventory();
    showToast('✅ Đã lưu kết quả kiểm kê!', 'success');
  }
}

// ============================================================
// CONVERSION (Quy đổi đơn vị)
// ============================================================
function renderConversionTab() {
  const conversions = Store.getUnitConversions();
  const listEl = document.getElementById('conversion-list');
  if(!listEl) return;

  listEl.innerHTML = conversions.map(c => `
    <div class="list-item">
      <div class="list-item-icon" style="background:rgba(139,92,246,0.1)">⚖️</div>
      <div class="list-item-content">
        <div class="list-item-title">${c.ingredientName}</div>
        <div class="list-item-sub">Công thức: ${c.purchaseQty} ${c.purchaseUnit} = ${c.recipeQty} ${c.recipeUnit}</div>
        ${c.note ? `<div class="list-item-sub" style="color:var(--text3);font-size:10px">Ghi chú: ${c.note}</div>` : ''}
      </div>
      <div class="list-item-right" style="flex-direction:row; gap:4px; align-items:center;">
        <button class="btn btn-xs btn-outline" onclick="editConversion('${c.id}')">✏️</button>
        <button class="btn btn-xs btn-danger" onclick="deleteConversion('${c.id}')">🗑️</button>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-text">Chưa có quy đổi đơn vị nào</div></div>';
}

function updateConvPreview() {
  const purQty = parseFloat(document.getElementById('conv-purchase-qty').value) || 0;
  const purUnit = document.getElementById('conv-purchase-unit').value || '...';
  const recQty = parseFloat(document.getElementById('conv-recipe-qty').value) || 0;
  const recUnit = document.getElementById('conv-recipe-unit').value || '...';
  const textEl = document.getElementById('conv-preview-text');
  
  if(purQty > 0 && purUnit !== '...' && recQty > 0 && recUnit !== '...') {
    textEl.innerHTML = `<span style="color:var(--success)">${purQty} ${purUnit}</span> = <span style="color:var(--primary)">${recQty} ${recUnit}</span>`;
  } else {
    textEl.innerHTML = `<span style="color:var(--primary)">Nhập thông tin bên dưới để xem trước</span>`;
  }
}

function resetConversionForm() {
  document.getElementById('conversion-form').reset();
  document.getElementById('conv-edit-id').value = '';
  document.getElementById('conv-purchase-qty').value = '1';
  document.getElementById('conv-recipe-qty').value = '1';
  updateConvPreview();
  // Set focus on first field
  const ingField = document.getElementById('conv-ingredient');
  if(ingField) {
    ingField.focus();
    // Cập nhật lại �?ơn v�? mua nếu có t�?n kho
    ingField.onchange = function() {
      const inv = Store.getInventory();
      const stock = inv.find(i => i.name.toLowerCase() === this.value.toLowerCase());
      if(stock && stock.unit) {
        document.getElementById('conv-purchase-unit').value = stock.unit;
        updateConvPreview();
      }
    };
  }
}

function submitConversion(e) {
  e.preventDefault();
  const idEl = document.getElementById('conv-edit-id');
  const id = idEl.value;
  const ingredientName = document.getElementById('conv-ingredient').value.trim();
  const purchaseQty = parseFloat(document.getElementById('conv-purchase-qty').value);
  const purchaseUnit = document.getElementById('conv-purchase-unit').value.trim();
  const recipeQty = parseFloat(document.getElementById('conv-recipe-qty').value);
  const recipeUnit = document.getElementById('conv-recipe-unit').value.trim();
  const note = document.getElementById('conv-note').value.trim();

  if(!ingredientName || !purchaseUnit || isNaN(purchaseQty) || purchaseQty<=0 || !recipeUnit || isNaN(recipeQty) || recipeQty<=0) {
    showToast('Vui lòng nhập đầy đủ và hợp lệ', 'warning');
    return;
  }

  const conversions = Store.getUnitConversions();
  if(id) {
    // Edit
    const idx = conversions.findIndex(c => c.id === id);
    if(idx >= 0) {
      conversions[idx] = { ...conversions[idx], ingredientName, purchaseQty, purchaseUnit, recipeQty, recipeUnit, note };
      Store.setUnitConversions(conversions);
      showToast('✅ Đã cập nhật quy đổi!');
    }
  } else {
    // Add (addUnitConversion takes care of duplicates for same ingredient + recipe unit)
    Store.addUnitConversion({ id:uid(), ingredientName, purchaseQty, purchaseUnit, recipeQty, recipeUnit, note });
    showToast('✅ Đã thêm quy đổi mới!', 'success');
  }
  
  resetConversionForm();
  renderConversionTab();
}

function editConversion(id) {
  const conversions = Store.getUnitConversions();
  const conv = conversions.find(c => c.id === id);
  if(!conv) return;

  document.getElementById('conv-edit-id').value = conv.id;
  document.getElementById('conv-ingredient').value = conv.ingredientName;
  document.getElementById('conv-purchase-qty').value = conv.purchaseQty;
  document.getElementById('conv-purchase-unit').value = conv.purchaseUnit;
  document.getElementById('conv-recipe-qty').value = conv.recipeQty;
  document.getElementById('conv-recipe-unit').value = conv.recipeUnit;
  document.getElementById('conv-note').value = conv.note || '';
  updateConvPreview();
  // Scroll form into view
  document.getElementById('conversion-form').scrollIntoView({ behavior: 'smooth' });
}

function deleteConversion(id) {
  if(!confirm('Xóa quy đổi này?')) return;
  Store.deleteUnitConversion(id);
  renderConversionTab();
  showToast('🗑️ Đã xóa quy đổi', 'success');
}

// ============================================================
// PAGE: FINANCE
// ============================================================
let financePeriod = 'month'; // Thay �?�?i mặc �?�?nh thành 'month'
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
  // Thay �?�?i cách hi�?n th�? các ch�? s�? tài chính
  document.getElementById('fin-revenue').textContent = fmtFull(s.netSales);
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
  const margin = s.netSales > 0 ? (s.gross/s.netSales*100).toFixed(1) : 0;
  document.getElementById('fin-margin').textContent = margin + '%';
  // VAT section
  const settings = Store.getSettings();
  const taxRate = settings.taxRate != null ? Number(settings.taxRate) : 0;
  const vatRow = document.getElementById('fin-vat-row');
  if(vatRow) {
    const vatTotal = s.vatTotal || 0;
    if(vatTotal > 0 || taxRate > 0) {
      vatRow.style.display = 'grid';
      const displayRate = taxRate > 0 ? taxRate : '?';
      const vatRateLabel = document.getElementById('fin-vat-rate-label');
      if(vatRateLabel) vatRateLabel.textContent = displayRate;
      const finVat = document.getElementById('fin-vat');
      if(finVat) finVat.textContent = fmtFull(vatTotal);
      const finRevAfterVat = document.getElementById('fin-revenue-after-vat');
      // T�?ng thực thu (có VAT và phí ship)
      if(finRevAfterVat) finRevAfterVat.textContent = fmtFull(s.revenue);
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

function editExpense(expenseId) {
  const expenses = Store.getExpenses();
  const e = expenses.find(x => x.id === expenseId);
  if(!e) return;
  
  if (e.category === 'Nhập hàng' || e.name.startsWith('Nhập hàng:')) {
    showToast('Chi phí nhập hàng được tạo tự động. Vui lòng chuyển sang mục Nhập hàng để chỉnh sửa phiếu nhập.', 'warning');
    return;
  }

  document.getElementById('exp-name').value = e.name;
  document.getElementById('exp-amount').value = e.amount;
  document.getElementById('exp-category').value = e.category || 'Chi phí khác';
  
  const form = document.getElementById('expense-form');
  form.dataset.editId = expenseId;
  document.getElementById('expense-modal').querySelector('.modal-title').textContent = '✏️ Sửa chi phí';
  document.getElementById('expense-modal').classList.add('active');
}

function openExpenseModal() {
  const form = document.getElementById('expense-form');
  delete form.dataset.editId;
  form.reset();
  document.getElementById('expense-modal').querySelector('.modal-title').textContent = '💸 Thêm chi phí';
  document.getElementById('expense-modal').classList.add('active');
}

function submitExpense(e) {
  e.preventDefault();
  const name = document.getElementById('exp-name').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const category = document.getElementById('exp-category').value;
  if(!name || isNaN(amount)) return;

  const form = document.getElementById('expense-form');
  const editId = form.dataset.editId;

  if (editId) {
    const expenses = Store.getExpenses();
    const idx = expenses.findIndex(x => x.id === editId);
    if (idx >= 0) {
      expenses[idx] = { ...expenses[idx], name, amount, category };
      Store.set(KEYS.expenses, expenses);
      if (window.DB && window.DB.Expenses && window.DB.Expenses.add) {
        // Technically update, but using add is fine if using setDoc with same id
        window.DB.Expenses.add(expenses[idx]).catch(console.error);
      }
    }
    showToast('✅ Đã cập nhật chi phí!');
  } else {
    Store.addExpense({ id:uid(), name, amount, category, date:new Date().toISOString() });
    showToast('✅ Đã thêm chi phí!');
  }
  
  document.getElementById('expense-modal').classList.remove('active');
  form.reset();
  delete form.dataset.editId;
  renderFinance();
  if (typeof renderPurchaseReport === 'function' && currentPage === 'reports') {
    renderPurchaseReport();
  }
}

// ---- Auto cleanup script for wrong expenses (Run once) ----
setTimeout(async () => {
  try {
    const expenses = Store.getExpenses() || [];
    const toDelete = expenses.filter(e => e.category === 'Nhập hàng' || (e.name && e.name.startsWith('Nhập hàng:')));
    if (toDelete.length > 0) {
      console.log('[Cleanup] Found wrong auto-generated expenses:', toDelete.length);
      const newExpenses = expenses.filter(e => !(e.category === 'Nhập hàng' || (e.name && e.name.startsWith('Nhập hàng:'))));
      Store.set(KEYS.expenses, newExpenses);
      
      if (window.DB && window.DB.Expenses && window.DB.Expenses.delete) {
        for (const exp of toDelete) {
          if (exp.id) await window.DB.Expenses.delete(exp.id).catch(console.warn);
        }
      }
      console.log('[Cleanup] Removed duplicate expenses successfully.');
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err);
  }
}, 3000);


function openDiscountDetails() {
  const orders = filterHistory(financePeriod).filter(o => o.discount && o.discount > 0);
  if (orders.length === 0) {
    showToast('Chưa có đơn nào được giảm giá trong thời gian này', 'warning');
    return;
  }
  
  document.getElementById('discount-detail-content').innerHTML = orders.map(o => `
    <div class="list-item" onclick="document.getElementById('discount-detail-modal').classList.remove('active'); viewOrderDetail('${o.id}')" style="cursor:pointer">
      <div class="list-item-icon" style="background:rgba(255,61,113,0.1)">🏷️</div>
      <div class="list-item-content">
        <div class="list-item-title">${o.tableName} • ${o.id}</div>
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
  const days = 7;
  const h = (window.appState && window.appState.history) ? window.appState.history : Store.getHistory();
  const e = (window.appState && window.appState.expenses) ? window.appState.expenses : Store.getExpenses();
  const p = (window.appState && window.appState.purchases) ? window.appState.purchases : Store.getPurchases();
  
  const data = [];
  for(let i = days-1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    
    const dayOrders = h.filter(o => new Date(o.paidAt).toDateString() === ds);
    
    // Doanh thu g�?p (chưa trừ chiết khấu)
    const dayGrossSales = dayOrders.reduce((s,o) => s + (o.items || []).reduce((sum, item) => sum + item.price * item.qty, 0), 0);
    
    // Tính lại chi phí nguyên li�?u (COGS) dựa trên từng món �?�? tránh dữ li�?u l�?i (cost quá cao) trong l�?ch sử cũ
    const dayCost = dayOrders.reduce((s,o) => s + (o.items || []).reduce((ss, i) => ss + (i.cost || 0) * (i.qty || 1), 0), 0);
    const dayDiscount = dayOrders.reduce((s,o) => s + (o.discount || 0), 0); // Chi phí giảm giá
    const dayVat = dayOrders.reduce((s,o) => s + (o.vatAmount || 0), 0); // VAT
    
    const dayExp = e.filter(x => new Date(x.date).toDateString() === ds).reduce((s,x) => s + Math.abs(x.amount), 0); // Nhân sự, marketing, etc.
    const dayPur = p.filter(x => new Date(x.date).toDateString() === ds).reduce((s,x) => s + Math.abs(x.price), 0); // Nhập hàng (giá tr�? price lưu t�?ng tiền bill nhập)
    
    // T�?ng CHI PHÍ (lấy tr�? tuy�?t �?�?i �?�? bi�?u �?�? luôn dương)
    const totalOut = dayCost + dayDiscount + dayVat + dayExp + dayPur;
    
    data.push({
      date: d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}),
      income: dayGrossSales,
      expense: totalOut
    });
  }

  const ctx = document.getElementById('revenue-chart');
  if(!ctx) return;
  if(chartInstances.revenue) chartInstances.revenue.destroy();
  
  chartInstances.revenue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'DOANH THU',
          data: data.map(d => d.income),
          backgroundColor: '#00E5FF', // Cyan
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        },
        {
          label: 'CHI PHÍ',
          data: data.map(d => d.expense),
          backgroundColor: '#FF3D71', // Pink
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true, 
      maintainAspectRatio: true,
      plugins: { 
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#A0A0B5',
            usePointStyle: true,
            boxWidth: 8
          }
        } 
      },
      scales: {
        y: { 
          ticks: { 
            color: '#A0A0B5', 
            callback: v => v >= 1000 ? `${(v/1000)}k` : v
          }, 
          grid: { color: 'rgba(255,255,255,0.05)' } 
        },
        x: { 
          ticks: { color: '#A0A0B5' }, 
          grid: { display: false } 
        }
      }
    }
  });
}

// ============================================================
// ============================================================
// CHỐT CA  �??  Ghi ShiftLogs lên Firestore
// ============================================================
// ============================================================
// SHIFT MANAGEMENT (Quản lý ca)
// ============================================================
function manageShift() {
  const shift = Store.getCurrentShift();
  if (!shift) {
    // Mở ca
    const floatStr = prompt("MỞ CA\n\nNhập số tiền lẻ đầu ca (VNĐ):", "0");
    if (floatStr === null) return;
    const floatCash = parseFloat(floatStr);
    if (isNaN(floatCash)) {
      showToast("Số tiền không hợp lệ", "danger");
      return;
    }
    const newShift = {
      id: uid(),
      openedAt: new Date().toISOString(),
      floatCash,
      payIn: 0,
      payOut: 0
    };
    Store.setCurrentShift(newShift);
    updateShiftBtnUI();
    showToast(`✅ Đã mở ca với ${fmt(floatCash)}đ tiền đầu ca.`, "success");
  } else {
    // Quản lý / Đóng ca
    openShiftModal(shift);
  }
}

function updateShiftBtnUI() {
  const shift = Store.getCurrentShift();
  const btn = document.getElementById('btn-ket-ca');
  const statusText = document.getElementById('shift-status-text');
  if (!btn) return;
  if (shift) {
    btn.innerHTML = '🔒 Đóng Ca';
    btn.style.background = 'linear-gradient(135deg, #f43f5e, #e11d48)';
    if(statusText) statusText.innerHTML = `<span style="color:var(--success)">Đang mở (${fmtDateTime(shift.openedAt).split(' ')[1]})</span>`;
  } else {
    btn.innerHTML = '🟢 Mở Ca';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    if(statusText) statusText.innerHTML = `<span style="color:var(--text2)">Chưa mở ca</span>`;
  }
}

function openShiftModal(shift) {
  // Lấy dữ liệu trong ca
  const history = (window.appState && window.appState.history) || Store.getHistory();
  
  // Các đơn trong ca
  const shiftOrders = history.filter(h => h.paidAt >= shift.openedAt);
  const cashOrders = shiftOrders.filter(h => h.payMethod !== 'bank');
  const bankOrders = shiftOrders.filter(h => h.payMethod === 'bank');
  
  const cashSales = cashOrders.reduce((sum, h) => sum + h.total, 0);
  const bankSales = bankOrders.reduce((sum, h) => sum + h.total, 0);
  const totalSales = cashSales + bankSales;

  const expectedCash = shift.floatCash + cashSales + shift.payIn - shift.payOut;

  let modalHtml = `
    <div class="modal-overlay active" id="shift-modal" onclick="if(event.target===this)this.classList.remove('active')">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title">⏰ Quản lý Ca Làm Việc</div>
          <button class="modal-close" onclick="document.getElementById('shift-modal').remove()">✕</button>
        </div>
        <div class="modal-body" style="padding-bottom: 20px;">
          <div style="font-size:13px; color:var(--text2); margin-bottom:12px;">Ca mở lúc: ${fmtDateTime(shift.openedAt)}</div>
          
          <div class="card" style="padding:12px; margin-bottom:12px; background:var(--bg3);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="font-weight:bold; color:var(--primary)">Tổng doanh thu ca:</span>
              <span style="font-weight:bold; color:var(--primary)">${fmt(totalSales)}đ</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px; color:var(--text2);">
              <span>- Tiền mặt:</span>
              <span>${fmt(cashSales)}đ</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:12px; color:var(--text2);">
              <span>- Chuyển khoản (CK):</span>
              <span>${fmt(bankSales)}đ</span>
            </div>
            <hr style="border:0; border-top:1px dashed var(--border); margin:8px 0;">
            
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Tiền lẻ đầu ca:</span>
              <span style="font-weight:bold;">${fmt(shift.floatCash)}đ</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Doanh thu tiền mặt (trong ca):</span>
              <span style="font-weight:bold; color:var(--success)">+ ${fmt(cashSales)}đ</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Tiền nộp vào (Pay in):</span>
              <span style="font-weight:bold; color:var(--info)">+ ${fmt(shift.payIn)}đ</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Tiền rút ra (Pay out):</span>
              <span style="font-weight:bold; color:var(--danger)">- ${fmt(shift.payOut)}đ</span>
            </div>
            <hr style="border:0; border-top:1px dashed var(--border); margin:8px 0;">
            <div style="display:flex; justify-content:space-between; font-size:16px;">
              <span>Tiền mặt dự kiến:</span>
              <span style="font-weight:900; color:var(--primary)">${fmt(expectedCash)}đ</span>
            </div>
          </div>

          <div style="display:flex; gap:8px; margin-bottom:16px;">
            <button class="btn btn-outline" style="flex:1" onclick="shiftPayInOut('in', ${expectedCash})">⬇️ Nộp tiền</button>
            <button class="btn btn-outline" style="flex:1" onclick="shiftPayInOut('out', ${expectedCash})">⬆️ Rút tiền</button>
          </div>

          <div class="input-group">
            <label class="input-label">Tiền mặt thực tế (khi đóng ca)</label>
            <input type="text" inputmode="numeric" class="input" id="shift-actual-cash" placeholder="Nhập số tiền đếm được..." style="font-size:18px; font-weight:bold;" oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\\B(?=(\\d{3})+(?!\\d))/g,',')">
          </div>
          <div class="input-group">
            <label class="input-label">Ghi chú đóng ca</label>
            <input type="text" class="input" id="shift-note" placeholder="Lý do chênh lệch (nếu có)...">
          </div>

          <button class="btn btn-danger btn-block" style="margin-top:16px;" onclick="closeShift(${expectedCash})">🔒 Xác nhận Đóng Ca</button>
        </div>
      </div>
    </div>
  `;

  const oldModal = document.getElementById('shift-modal');
  if(oldModal) oldModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function shiftPayInOut(type, expectedCash) {
  const shift = Store.getCurrentShift();
  if(!shift) return;

  const actionName = type === 'in' ? 'Nộp tiền (Pay in)' : 'Rút tiền (Pay out)';
  const amountStr = prompt(`${actionName}\n\nNhập số tiền (VNĐ):`, '0');
  if(amountStr === null) return;

  const amount = parseFloat(amountStr);
  if(isNaN(amount) || amount <= 0) {
    showToast('Số tiền không hợp lệ', 'danger');
    return;
  }

  const reason = prompt(`Lý do ${actionName.toLowerCase()}:`) || '';

  if(type === 'in') {
    shift.payIn += amount;
  } else {
    shift.payOut += amount;
  }

  Store.setCurrentShift(shift);
  
  // Ghi nhận vào chi phí/thu nhập (dùng Expense cho Pay Out, nhưng không tính vào OPEX P&L nếu là rút tiền �?i chợ, tùy thiết kế. 
  // �? �?ây ghi lại thành log Expense v�?i category "Rút tiền ca" �?�? tra cứu)
  if(type === 'out') {
    Store.addExpense({
      id: uid(),
      name: `Rút tiền ca: ${reason}`,
      amount: amount,
      category: 'Rút tiền ca',
      date: new Date().toISOString()
    });
  }

  showToast(`✅ Đã ghi nhận ${actionName}: ${fmt(amount)}đ`, 'success');
  openShiftModal(shift); // Re-render modal
}

async function closeShift(expectedCash) {
  const actualInput = document.getElementById('shift-actual-cash');
  const noteInput = document.getElementById('shift-note');
  if(!actualInput) return;

  const actualStr = actualInput.value.replace(/,/g, '');
  if(actualStr === '') {
    showToast('Vui lòng nhập số tiền mặt thực tế để đóng ca.', 'warning');
    return;
  }

  const actualCash = parseFloat(actualStr);
  if(isNaN(actualCash)) {
    showToast('Số tiền thực tế không hợp lệ.', 'danger');
    return;
  }

  const diff = actualCash - expectedCash;
  const note = noteInput ? noteInput.value.trim() : '';

  if(!confirm(`Xác nhận đóng ca?\nChênh lệch: ${diff >= 0 ? '+' : ''}${fmt(diff)}đ`)) return;

  const shift = Store.getCurrentShift();
  const ud = window.appState && window.appState.userDoc;

  const logData = {
    shiftId: shift.id,
    staffUid: ud ? ud.uid : 'unknown',
    staffName: ud ? (ud.displayName || ud.username || ud.email) : 'Không rõ',
    openedAt: shift.openedAt,
    closedAt: new Date().toISOString(),
    floatCash: shift.floatCash,
    payIn: shift.payIn,
    payOut: shift.payOut,
    expectedCash,
    actualCash,
    difference: diff,
    note
  };

  if (window.DB && window.DB.ShiftLogs) {
    try {
      await window.DB.ShiftLogs.add(logData);
      showToast(`✅ Đã đóng ca! Chênh lệch: ${fmt(diff)}đ`, 'success');
    } catch(e) {
      showToast('Lỗi lưu log ca: ' + e.message, 'danger');
    }
  } else {
    console.log('[ShiftLog offline]:', logData);
    showToast(`✅ Đã đóng ca (Offline)! Chênh lệch: ${fmt(diff)}đ`, 'success');
  }

  // Nếu thiếu/dư tiền mặt, có th�? ghi nhận vào Expense
  if(diff !== 0) {
    Store.addExpense({
      id: uid(),
      name: `Chênh lệch đóng ca: ${diff > 0 ? 'Dư' : 'Thiếu'} tiền mặt`,
      amount: -diff, // Nếu dư, diff > 0, amount âm -> Lãi. Nếu thiếu, diff < 0, amount dương -> L�? (Chi phí)
      category: 'Chênh lệch ca',
      date: new Date().toISOString(),
      note: `Dự kiến: ${expectedCash}, Thực tế: ${actualCash}. Ghi chú: ${note}`
    });
  }

  Store.setCurrentShift(null);
  document.getElementById('shift-modal').remove();
  updateShiftBtnUI();
  renderFinance(); // update reports if needed
}

// PAGE: REPORTS
// ============================================================
let reportPeriod = 'month'; // Thay �?�?i mặc �?�?nh thành 'month' �?�? hi�?n th�? �?ủ dữ li�?u từ các ngày trư�?c
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
  renderTrendChart();
  renderTopItems();
  renderCategoryChart();
  renderHourlyChart();
  renderOrderHistoryList();
  renderExpenseReport();
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

  const topProfit = getTopProfitableItems(reportPeriod, 8);
  document.getElementById('top-profit-items').innerHTML = topProfit.length ? topProfit.map((item, i) =>
    `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(16,185,129,0.1);color:var(--success);font-weight:800;font-size:16px">${i+1}</div>
      <div class="list-item-content">
        <div class="list-item-title">${item.name}</div>
        <div class="list-item-sub">Đã bán: ${item.qty} phần</div>
      </div>
      <div class="list-item-right">
        <div class="list-item-amount" style="color:var(--success)">Lãi: ${fmt(item.profit)}đ</div>
      </div>
    </div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-text">Chưa có dữ liệu</div></div>';
}

function renderTrendChart() {
  const ctx = document.getElementById('trend-chart');
  if(!ctx) return;
  if(chartInstances.trend) chartInstances.trend.destroy();

  const days = 7;
  const h = (window.appState && window.appState.history) ? window.appState.history : Store.getHistory();
  const e = (window.appState && window.appState.expenses) ? window.appState.expenses : Store.getExpenses();
  const p = (window.appState && window.appState.purchases) ? window.appState.purchases : Store.getPurchases();
  
  const data = [];
  for(let i = days-1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    
    const dayOrders = h.filter(o => new Date(o.paidAt).toDateString() === ds);
    
    // Tính doanh thu gộp
    const dayGrossSales = dayOrders.reduce((s,o) => s + (o.items || []).reduce((sum, item) => sum + item.price * item.qty, 0), 0);
    
    // Tính lại chi phí an toàn từ từng món
    const dayCost = dayOrders.reduce((s,o) => s + (o.items || []).reduce((ss, i) => ss + (i.cost || 0) * (i.qty || 1), 0), 0);
    const dayDiscount = dayOrders.reduce((s,o) => s + (o.discount || 0), 0);
    const dayVat = dayOrders.reduce((s,o) => s + (o.vatAmount || 0), 0);
    
    const dayExp = e.filter(x => new Date(x.date).toDateString() === ds).reduce((s,x) => s + Math.abs(x.amount), 0);
    const dayPur = p.filter(x => new Date(x.date).toDateString() === ds).reduce((s,x) => s + Math.abs(x.price), 0);
    
    const totalOut = dayCost + dayDiscount + dayVat + dayExp + dayPur;
    const profit = dayGrossSales - totalOut;

    data.push({
      date: d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}),
      label: d.getDate(), // just the day number for x-axis as shown in image
      revenue: dayGrossSales,
      profit: profit
    });
  }

  chartInstances.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'revenue',
          data: data.map(d => d.revenue),
          borderColor: '#00E5FF', // Cyan
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: '#00E5FF',
          pointBorderColor: '#fff',
          pointRadius: 4,
          tension: 0.4, // Curved line
          fill: false,
          yAxisID: 'y'
        },
        {
          label: 'profit',
          data: data.map(d => d.profit),
          borderColor: '#FFD700', // Yellow/Orange
          backgroundColor: 'rgba(255, 215, 0, 0.2)', // Gradient effect will be handled via config if needed, using simple fill for now
          borderWidth: 2,
          pointBackgroundColor: '#FFD700',
          pointBorderColor: '#fff',
          pointRadius: 4,
          tension: 0.4, // Curved line
          fill: true,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              return items[0].label;
            },
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ' : ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y;
              }
              return label;
            },
            labelColor: (context) => {
              return {
                borderColor: 'transparent',
                backgroundColor: 'transparent',
              };
            },
            labelTextColor: (context) => {
              return context.datasetIndex === 0 ? '#00E5FF' : '#FFD700';
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: {
            color: '#A0A0B5',
            callback: v => {
              if (v === 0) return '0';
              return v >= 1000 || v <= -1000 ? `${(v/1000)}k` : v;
            }
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#A0A0B5' },
          grid: { display: false }
        }
      }
    }
  });
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

function renderExpenseReport() {
  const ctx = document.getElementById('expense-chart');
  const listEl = document.getElementById('purchase-report-list');
  if (!ctx || !listEl) return;

  const now = new Date();
  const filterFn = (dateStr) => {
    const d = new Date(dateStr);
    if(reportPeriod === 'today') return d.toDateString() === now.toDateString();
    if(reportPeriod === 'day' && reportDateOpts && reportDateOpts.date) {
      return d.toDateString() === new Date(reportDateOpts.date).toDateString();
    }
    if(reportPeriod === 'range' && reportDateOpts && reportDateOpts.fromDate && reportDateOpts.toDate) {
      const from = new Date(reportDateOpts.fromDate); from.setHours(0,0,0,0);
      const to = new Date(reportDateOpts.toDate); to.setHours(23,59,59,999);
      return d >= from && d <= to;
    }
    if(reportPeriod === 'week') return (now - d) / 86400000 <= 7;
    if(reportPeriod === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const rawPurchases = Store.getPurchases().filter(p => filterFn(p.date));
  const rawExpenses = Store.getExpenses().filter(e => filterFn(e.date));

  const sums = {};
  rawPurchases.forEach(p => {
    sums['Chi phí nguyên liệu'] = (sums['Chi phí nguyên liệu'] || 0) + (p.price);
  });
  rawExpenses.forEach(e => {
    const cat = e.category || 'Chi phí khác';
    sums[cat] = (sums[cat] || 0) + e.amount;
  });

  const labels = Object.keys(sums);
  const data = labels.map(l => sums[l]);

  if(chartInstances.expense) chartInstances.expense.destroy();
  if(data.every(v => v === 0)) {
    // Hide or render empty?
    listEl.innerHTML = '<div class="empty-state"><div class="empty-text">Chưa có chi phí nào trong khoảng thời gian này.</div></div>';
    ctx.style.display = 'none';
  } else {
    ctx.style.display = 'block';
    const colors = ['#00D68F','#FF3D71','#A855F7','#0095FF','#FFD700','#FF6B35','#8F9BB3'];
    chartInstances.expense = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth:0, hoverOffset:8 }] },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position:'bottom', labels:{ color:'#A0A0B5', padding:10, font:{size:11} } } }
      }
    });

    // Render list
    const allItems = [
      ...rawPurchases.map(p => ({ type: 'purchase', id: p.id, name: `Nhập: ${p.name}`, amount: p.price, date: p.date, note: `${p.qty} ${p.unit} - ${p.supplier||''}` })),
      ...rawExpenses.map(e => ({ type: 'expense', id: e.id, name: e.name, amount: e.amount, date: e.date, note: e.category }))
    ].sort((a,b) => new Date(b.date) - new Date(a.date));

    listEl.innerHTML = allItems.map(item => `
      <div class="list-item" style="cursor:pointer;" onclick="${item.type === 'purchase' ? `editPurchase('${item.id}')` : `editExpense('${item.id}')`}">
        <div class="list-item-icon" style="background:${item.type==='purchase'?'rgba(0,214,143,0.1)':'rgba(255,61,113,0.1)'}">${item.type==='purchase'?'📥':'💸'}</div>
        <div class="list-item-content">
          <div class="list-item-title">${item.name}</div>
          <div class="list-item-sub">${fmtDate(item.date)} · ${item.note || ''}</div>
        </div>
        <div class="list-item-right" style="color:var(--danger);font-weight:bold;">
          ${fmt(item.amount)}đ
        </div>
      </div>
    `).join('');
  }
}

function renderOrderHistoryList() {
  cleanupOldOrderHistoryPhotos();
  const orders = filterHistory(reportPeriod, reportDateOpts).slice(0, 50);
  
  if(!orders.length) {
    document.getElementById('order-history-list').innerHTML = '<div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-text">Chưa có lịch sử</div></div>';
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
      const discountLabel = o.discount > 0 ? ` · 🏷️ -${fmt(o.discount)}đ` : '';
      const shippingLabel = o.shipping > 0 ? ` · 🚚 +${fmt(o.shipping)}đ` : '';
      const vatLabel = o.vatAmount > 0 ? ` · 🧾 VAT ${fmt(o.vatAmount)}đ` : '';
      const hasPhotos = Array.isArray(o.photos) && o.photos.length > 0;
      const photoIcon = hasPhotos ? '📸' : '';
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

async function viewOrderDetail(orderId) {
  const h = Store.getHistory();
  const o = h.find(x => (x.historyId || x.id) === orderId);
  if(!o) return;

  // Lấy ảnh từ indexeddb hoặc fallback (old data)
  let photos = o.photos || [];
  if (!photos.length && o.historyId) {
     const dbPhotos = await PhotoDB.get('history_' + o.historyId);
     if (Array.isArray(dbPhotos)) photos = dbPhotos;
  }

  window._activeOrderDetailPhotos = photos;
  const payIcon = o.payMethod === 'bank' ? '🏦' : '💵';
  const payLabel = o.payMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
  const itemsHtml = (o.items||[]).map(i =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${i.name} <span style="color:var(--text3)">x${i.qty}</span></span>
      <span style="font-size:13px;font-weight:700;color:var(--primary)">${fmt(i.price*i.qty)}đ</span>
    </div>`
  ).join('');
  const subTotal = (o.items||[]).reduce((s, i) => s + i.price * i.qty, 0);
  const photosHtml = (photos && photos.length)
    ? `<div style="margin-top:12px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">📸 Ảnh ghi nhận đơn</div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
          ${photos.map((p, idx) => `
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
    ${o.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--danger)"><span>🏷️ Giảm giá ${o.discountNote ? `(${o.discountNote})` : ''}</span><span>-${fmtFull(o.discount)}</span></div>` : ''}
    ${o.shipping > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--info)"><span>🚚 Phí giao hàng</span><span>+${fmtFull(o.shipping)}</span></div>` : ''}
    ${o.vatAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--primary)"><span>🧾 Thuế VAT (${o.taxRate || 0}%)</span><span>+${fmtFull(o.vatAmount)}</span></div>` : ''}
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
  const wrap = document.getElementById('order-detail-photo-full-wrap');
  if(!modal || !img) return;
  ImgZoom.detach();
  img.src = p.dataUrl;
  const meta = document.getElementById('order-detail-photo-full-meta');
  if(meta) meta.textContent = p.takenAt ? `Thời gian: ${fmtDateTime(p.takenAt)}` : '';
  modal.classList.add('active');
  img.onload = () => ImgZoom.attach(wrap || img.parentElement, img);
  if(img.complete && img.naturalWidth) ImgZoom.attach(wrap || img.parentElement, img);
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
    ? `<div class="alert-card danger"><div class="alert-icon">🚨</div><div class="alert-content"><div class="alert-title">Cảnh báo doanh thu</div><div class="alert-desc">Hôm nay thấp hơn ${((1-today.revenue/avgWeekly)*100).toFixed(0)}% so với trung bình tuần (${fmt(avgWeekly)}đ/ngày)</div></div></div>`
    : `<div class="alert-card success"><div class="alert-icon">✅</div><div class="alert-content"><div class="alert-title">Doanh thu ổn định</div><div class="alert-desc">Hôm nay: ${fmtFull(today.revenue)} - trong mức bình thường</div></div></div>`;
  document.getElementById('revenue-warning').innerHTML = warnHtml;
}

// ============================================================
// PAGE: MENU ADMIN
// ============================================================
function renderMenuAdmin() {
  const menu = _getMenu();
  const inv = _getInventory();
  const search = (document.getElementById('menu-admin-search')||{}).value || '';
  const filtered = menu.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  document.getElementById('menu-admin-list').innerHTML = filtered.map(m => {
    let computedCost = m.cost || 0;
    if (m.itemType === ITEM_TYPES.RETAIL) {
      const linked = inv.find(i => i.id === m.linkedInventoryId) || inv.find(i => normalizeViKey(i.name) === normalizeViKey(m.name));
      computedCost = linked ? linked.costPerUnit || 0 : 0;
    } else if (m.ingredients && m.ingredients.length > 0) {
      computedCost = m.ingredients.reduce((s, ing) => {
        const stock = inv.find(i => i.name === ing.name);
        return s + (ing.qty * (stock ? stock.costPerUnit : 0));
      }, 0);
    }
    return `<div class="list-item">
      <div class="list-item-icon" style="background:rgba(255,107,53,0.1)">🍽️</div>
      <div class="list-item-content">
        <div class="list-item-title">${m.name} <span style="font-size:11px;color:var(--text3);font-weight:normal">(${m.unit || 'phần'})</span></div>
        <div class="list-item-sub">${m.category} · ${ITEM_TYPE_LABELS[m.itemType] || 'Món'} · Giá vốn: ${fmt(computedCost)}đ ${m.itemType === ITEM_TYPES.FINISHED && m.ingredients?.length ? `· 🧂 ${m.ingredients.length} NL` : ''}</div>
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
  const menu = _getMenu();
  const inventory = _getInventory().filter(i => !i.hidden);
  const dish = id ? menu.find(m => m.id === id) : null;
  document.getElementById('menu-modal-title').textContent = dish ? 'Sửa món ăn' : 'Thêm món mới';
  document.getElementById('menu-item-id').value = dish?.id || '';
  document.getElementById('menu-item-name').value = dish?.name || '';
  document.getElementById('menu-item-unit').value = dish?.unit || 'phần';
  document.getElementById('menu-item-price').value = dish?.price || '';
  document.getElementById('menu-item-category').value = dish?.category || CATEGORIES[0];
  document.getElementById('menu-item-type').value = dish?.itemType || ITEM_TYPES.FINISHED;
  const linkedSel = document.getElementById('menu-linked-inventory-id');
  if (linkedSel) {
    linkedSel.innerHTML = '<option value="">-- Chọn hàng tồn kho --</option>' + inventory
      .map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');
    linkedSel.value = dish?.linkedInventoryId || '';
  }
  
  const list = document.getElementById('menu-ingredients-list');
  list.innerHTML = '';
  if (dish && dish.ingredients && dish.ingredients.length > 0) {
    dish.ingredients.forEach(ing => addIngredientRow(ing.name, ing.qty, ing.unit));
  } else {
    // addIngredientRow(); // Add an empty row by default
  }
  toggleMenuItemTypeUI();
  
  document.getElementById('menu-modal').classList.add('active');
}

function editMenuItem(id) { openAddMenuModal(id); }

function deleteMenuItem(id) {
  if(!confirm('Xoá món này?')) return;
  // FIX 4: Xoá trực tiếp trên Firestore
  if (window.DB && window.DB.Menu) {
    window.DB.Menu.delete(id)
      .then(() => { renderMenuAdmin(); showToast('🗑️ Đã xoá món'); })
      .catch(e => showToast('Lỗi xoá món: ' + e.message, 'danger'));
  } else {
    const menu = Store.getMenu().filter(m => m.id !== id);
    Store.setMenu(menu);
    renderMenuAdmin();
    showToast('🗑️ Đã xoá món');
  }
}

function submitMenuItem(e) {
  e.preventDefault();
  const id = document.getElementById('menu-item-id').value;
  const name = document.getElementById('menu-item-name').value.trim();
  const price = parseFloat(document.getElementById('menu-item-price').value);
  const category = document.getElementById('menu-item-category').value;
  const unit = document.getElementById('menu-item-unit').value.trim() || 'phần';
  const itemType = document.getElementById('menu-item-type').value || ITEM_TYPES.FINISHED;
  const linkedInventoryId = document.getElementById('menu-linked-inventory-id').value || null;
  if(!name || isNaN(price)) return;

  const ingredients = [];
  const inv = _getInventory();
  document.querySelectorAll('#menu-ingredients-list > .ingredient-row').forEach(row => {
    const ingName = row.querySelector('.ing-name-sel').value;
    const qty = parseFloat(row.querySelector('.ing-qty-val').value);
    const unit = row.querySelector('.ing-unit-sel').value;
    if (ingName && qty > 0) {
      const stock = inv.find(i => i.name === ingName);
      ingredients.push({ name: ingName, qty, unit: unit || (stock ? stock.unit : '') });
    }
  });

  if (itemType === ITEM_TYPES.FINISHED && ingredients.length === 0) {
    showToast('Thành phẩm / món ăn bắt buộc phải có công thức.', 'warning');
    return;
  }
  if (itemType === ITEM_TYPES.RETAIL && !linkedInventoryId) {
    showToast('Hàng bán thẳng phải liên kết với một hàng tồn kho.', 'warning');
    return;
  }

  const payload = { name, unit, price, cost: 0, category, itemType, linkedInventoryId, ingredients: itemType === ITEM_TYPES.FINISHED ? ingredients : [] };

  // FIX 4: Ghi thẳng lên Firestore
  if (window.DB && window.DB.Menu) {
    const fn = id
      ? window.DB.Menu.update(id, payload)
      : window.DB.Menu.add({ id: uid(), ...payload });
    fn.then(() => {
      document.getElementById('menu-modal').classList.remove('active');
      renderMenuAdmin();
      showToast('✅ Đã lưu món ăn!');
    }).catch(e => showToast('Lỗi lưu món: ' + e.message, 'danger'));
  } else {
    const menu = Store.getMenu();
    if(id) {
      const idx = menu.findIndex(m => m.id === id);
      if(idx >= 0) { menu[idx] = {...menu[idx], ...payload, cost: menu[idx].cost || 0}; }
    } else {
      menu.push({ id:uid(), ...payload });
    }
    Store.setMenu(menu);
    document.getElementById('menu-modal').classList.remove('active');
    renderMenuAdmin();
    showToast('✅ Đã lưu món ăn!');
  }
}

function toggleMenuItemTypeUI() {
  const type = document.getElementById('menu-item-type')?.value || ITEM_TYPES.FINISHED;
  const linkWrap = document.getElementById('menu-linked-inventory-wrap');
  const title = document.getElementById('menu-ingredients-title');
  const list = document.getElementById('menu-ingredients-list');
  if (linkWrap) linkWrap.style.display = type === ITEM_TYPES.RETAIL ? '' : 'none';
  if (title) title.textContent = type === ITEM_TYPES.RETAIL ? 'Công thức (không bắt buộc cho bán thẳng)' : 'Công thức (Nguyên liệu)';
  if (list && type === ITEM_TYPES.RETAIL && !list.children.length) list.innerHTML = '';
}


function addIngredientRow(name='', qty='', unit='') {
  const inv = Store.getInventory();
  // Filter inventory list to generate options (include hidden if already selected)
  const options = inv.filter(i => !i.hidden || i.name === name).map(i => `<option value="${i.name}" data-cost="${i.costPerUnit}">${i.name} (${i.unit})${i.hidden ? ' 🚫(Đã ẩn)' : ''}</option>`).join('');
  
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.className = 'ingredient-row';
  div.style.alignItems = 'center';
  div.innerHTML = `
    <select class="select ing-name-sel" style="flex:2" onchange="updateIngUnitDropdown(this)">
      <option value="">-- Chọn NL --</option>
      ${options}
    </select>
    <select class="select ing-unit-sel" style="flex:1.5">
      <option value="">-- Tính theo --</option>
    </select>
    <input type="number" class="input ing-qty-val" placeholder="SL" value="${qty}" style="flex:1" step="0.01">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove();">✕</button>
  `;
  document.getElementById('menu-ingredients-list').appendChild(div);
  
  const nameSel = div.querySelector('.ing-name-sel');
  if (name) {
    nameSel.value = name;
    updateIngUnitDropdown(nameSel, unit);
  }
}

window.updateIngUnitDropdown = function(selectEl, selectedUnit = '') {
  const row = selectEl.closest('.ingredient-row');
  if(!row) return;
  const unitSel = row.querySelector('.ing-unit-sel');
  const ingName = selectEl.value;
  
  unitSel.innerHTML = '<option value="">-- Tính theo --</option>';
  if(!ingName) return;

  const inv = Store.getInventory();
  const convs = Store.getUnitConversions();
  
  const stock = inv.find(i => i.name === ingName);
  if(!stock) return;

  // Add default unit (stock unit)
  let html = `<option value="${stock.unit}">${stock.unit} (tồn kho)</option>`;

  // Add conversion units
  const matches = convs.filter(c => c.ingredientName === ingName && c.purchaseUnit === stock.unit);
  matches.forEach(c => {
    html += `<option value="${c.recipeUnit}">${c.recipeUnit} (quy đổi)</option>`;
  });

  unitSel.innerHTML = html;
  if(selectedUnit) {
    unitSel.value = selectedUnit;
  } else {
    // default to stock unit
    unitSel.value = stock.unit;
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
        <span style="color:var(--text2);font-size:12px;white-space:nowrap">đến</span>
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
    renderExpenseReport(); // NEW!
  }
}


// ============================================================
// TOAST

// ============================================================
function showToast(msg, type, duration) {
  let toast = document.getElementById('toast');
  if(!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:calc(var(--nav-height,70px) + env(safe-area-inset-bottom,0px) + 16px);left:50%;transform:translateX(-50%) translateY(20px);background:var(--card);color:var(--text);padding:10px 14px;border-radius:14px;font-size:13px;font-weight:600;z-index:999;opacity:0;transition:all 0.3s;white-space:normal;word-break:break-word;line-height:1.45;max-width:min(92vw,420px);text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid var(--border);';
    document.body.appendChild(toast);
  }
  // Clear previous auto-hide timer
  if(toast._hideTimer) clearTimeout(toast._hideTimer);
  toast.textContent = msg;
  toast.style.borderColor = type === 'success' ? 'var(--success)' : type === 'danger' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--border)';
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  const ms = (typeof duration === 'number' && duration > 0) ? duration : 2500;
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, ms);
}

// ============================================================
// RESET DATA
// ============================================================
function resetAllData() {
  document.getElementById('reset-modal').classList.add('active');
}

async function confirmResetData(keepMenu, keepInventory) {
  // 1. Reset Local Storage
  Store.resetAll(keepMenu, keepInventory);
  orderItems = {};
  
  // 2. Reset Cloud Firestore (nếu có kết nối và là Admin)
  if (window.DB && window.appState && window.appState.userDoc?.role === 'admin') {
    showToast('⏳ Đang xóa dữ liệu trên Cloud...', 'info');
    try {
      await window.DB.resetCloudData(keepMenu, keepInventory);
      showToast('✅ Đã reset dữ liệu thành công!', 'success');
    } catch(e) {
      showToast('❌ Lỗi khi xóa dữ liệu Cloud: ' + e.message, 'danger');
    }
  } else if (window.appState) {
    // Chế �?�? Offline: Cập nhật lại window.appState r�?ng
    const fieldsToReset = ['history', 'orders', 'expenses', 'purchases', 'aiHistory'];
    if(!keepMenu) fieldsToReset.push('menu');
    if(!keepInventory) fieldsToReset.push('inventory', 'unitConversions');
    
    fieldsToReset.forEach(f => {
      if(Array.isArray(window.appState[f])) window.appState[f] = [];
      else if(typeof window.appState[f] === 'object') window.appState[f] = {};
    });
    showToast('�??? Đã reset dữ li�?u cục b�?! Sẵn sàng hoạt �?�?ng.', 'success');
  }

  document.getElementById('reset-modal').classList.remove('active');
  applyStoreSettings();
  navigate('tables');
  updateAlertBadge();
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
    ['set-gemmaEndpoint',s.gemmaEndpoint || 'http://127.0.0.1:11434/v1/chat/completions'],
    ['set-gemmaModel',   s.gemmaModel    || 'gemma2:9b'],
    ['set-gemmaApiKey',  s.gemmaApiKey   || ''],
    ['set-tableCount',   s.tableCount    || 20],
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
  const ocrModeEl = document.getElementById('set-ocrMode');
  const photoRetentionEl = document.getElementById('set-photoRetentionDays');
  if(autoWeeklyEl)  autoWeeklyEl.checked  = !!s.autoExportWeekly;
  if(autoMonthlyEl) autoMonthlyEl.checked = !!s.autoExportMonthly;
  if(autoPushWeeklyDriveEl) {
    autoPushWeeklyDriveEl.checked = !!s.autoPushWeeklyReportToGoogleDrive;
    autoPushWeeklyDriveEl.disabled = !s.autoExportWeekly;
  }
  if(ocrModeEl) ocrModeEl.value = s.ocrMode || 'auto';
  if(photoRetentionEl) photoRetentionEl.value = String(Number(s.photoRetentionDays || 0));

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

  // Hi�?n th�?/ẩn phần chọn ngày báo cáo theo kỳ
  try { toggleReportExportDate(); } catch(_) {}
  try { toggleWeeklyDriveCheckbox(); } catch(_) {}

  // Payment watcher fields
  const sepayTokenEl = document.getElementById('set-sepayToken');
  if (sepayTokenEl) sepayTokenEl.value = s.sepayToken || '';
  const autoPayEl = document.getElementById('set-autoPayDetect');
  if (autoPayEl) autoPayEl.checked = !!s.autoPayDetect;
  const paySoundEl = document.getElementById('set-paySound');
  const paySoundValEl = document.getElementById('set-paySound-val');
  if (paySoundEl) {
    paySoundEl.value = s.paySoundVolume ?? 80;
    if (paySoundValEl) paySoundValEl.textContent = (s.paySoundVolume ?? 80) + '%';
    paySoundEl.oninput = () => { if (paySoundValEl) paySoundValEl.textContent = paySoundEl.value + '%'; };
  }

  // Theme radio buttons
  const themeInput = document.querySelector(`input[name="appTheme"][value="${s.appTheme || 'hien-dai'}"]`);
  if (themeInput) themeInput.checked = true;

  const logoPreview = document.getElementById('set-logo-preview');
  const removeBtn = document.getElementById('set-logo-remove');
  if (logoPreview) {
    if (s.storeLogo) {
      logoPreview.innerHTML = `<img src="${s.storeLogo}" style="width:100%;height:100%;object-fit:cover;">`;
      if(removeBtn) removeBtn.style.display = 'inline-block';
    } else {
      logoPreview.innerHTML = '<span style="font-size:20px;">�?��</span>';
      if(removeBtn) removeBtn.style.display = 'none';
    }
  }

  renderBackupList();

  // Last backup info
  const last = Store.getLastBackupTime();
  const lastEl = document.getElementById('last-backup-time');
  if(lastEl) lastEl.textContent = last ? fmtDateTime(last) : 'Chưa có backup';
  updateStorageQuotaInfo();
  
  // Hi�?n th�? danh sách user nếu là admin
  try { renderUserManagement(); } catch(e){}
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
  const gemmaEndpointEl = document.getElementById('set-gemmaEndpoint');
  const gemmaModelEl    = document.getElementById('set-gemmaModel');
  const gemmaApiKeyEl   = document.getElementById('set-gemmaApiKey');
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
  const ocrModeEl            = document.getElementById('set-ocrMode');
  const photoRetentionEl     = document.getElementById('set-photoRetentionDays');
  
  // Theme value
  const themeInput = document.querySelector('input[name="appTheme"]:checked');
  const selectedTheme = themeInput ? themeInput.value : (s.appTheme || 'hien-dai');

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
    gemmaEndpoint:(gemmaEndpointEl&& gemmaEndpointEl.value.trim())|| 'http://127.0.0.1:11434/v1/chat/completions',
    gemmaModel:   (gemmaModelEl  && gemmaModelEl.value.trim())    || 'gemma2:9b',
    gemmaApiKey:  (gemmaApiKeyEl && gemmaApiKeyEl.value.trim())   || '',
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
    ocrMode: (ocrModeEl && ['auto', 'offline', 'online'].includes(ocrModeEl.value)) ? ocrModeEl.value : (s.ocrMode || 'auto'),
    photoRetentionDays: photoRetentionEl ? Math.max(0, parseInt(photoRetentionEl.value, 10) || 0) : Number(s.photoRetentionDays || 0),
    activeAIEngine: (s.activeAIEngine === 'gemma') ? 'gemma' : 'gemini',
    forceOffline: !!s.forceOffline,
    appTheme: selectedTheme,
    // Payment watcher
    sepayToken:     (() => { const el = document.getElementById('set-sepayToken'); return el ? el.value.trim() : (s.sepayToken || ''); })(),
    autoPayDetect:  (() => { const el = document.getElementById('set-autoPayDetect'); return el ? el.checked : (s.autoPayDetect || false); })(),
    paySoundVolume: (() => { const el = document.getElementById('set-paySound'); return el ? Number(el.value) : (s.paySoundVolume ?? 80); })(),
  };
  
  // Apply theme immediately
  applyTheme(selectedTheme);
  
  // FIX 4: Ghi settings lên Firestore (�?�?ng b�? �?a thiết b�?)
  if (window.DB && window.DB.Settings) {
    window.DB.Settings.save(updated).catch(e => console.warn('[Settings] Cloud save error:', e));
  }
  Store.setSettings(updated); // Giữ LocalStorage fallback offline
  // Update VAT display after save
  const vatDisplay = document.getElementById('vat-current-display');
  if(vatDisplay) vatDisplay.textContent = newTaxRate + '%';

  // Nếu s�? bàn thay �?�?i �?? rebuild danh sách bàn và reset active orders
  if(newTableCount !== oldTableCount) {
    Store.rebuildTables(newTableCount);
    // Cloud sync: kh�?i tạo bàn tr�?ng lên Firestore
    if (window.DB && window.DB.Tables && window.DB.Tables.initTables) {
      window.DB.Tables.initTables(newTableCount).catch(e => console.warn('[Tables] Cloud init error:', e));
    }
    // Xoá các order của bàn vượt s�? lượng m�?i (Local)
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
  showToast('�?? Đã lưu cài �?ặt!' + (newTableCount !== oldTableCount ? ` Sơ �?�? bàn cập nhật: ${newTableCount} bàn.` : ''), 'success');
}

function getLocalStorageUsageBytes() {
  try {
    let total = 0;
    for(let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      const val = localStorage.getItem(key) || '';
      total += (key.length + val.length) * 2; // UTF-16 (ư�?c lượng)
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
  const status = usedBytes > quotaBytes ? '�?�️ Vượt quota' : (usedPercent >= 85 ? '�?�️ Sắp �?ầy' : '�?? Bình thường');
  // iOS Safari / WKWebView gi�?i hạn localStorage khoảng 5-10 MB thực tế
  const BROWSER_LIMIT_NOTE = '�??� Lưu ý: Trình duy�?t iPhone/Safari gi�?i hạn localStorage khoảng <b>5�??10 MB</b>. Quota cài �?ặt ch�? dùng �?�? cảnh báo trư�?c trong app.';
  infoEl.innerHTML = `Đang dùng: <b>${formatBytes(usedBytes)}</b> / ${quotaMb} MB (${usedPercent.toFixed(1)}%) · ${status}<br><span style="font-size:10px;color:var(--text3);line-height:1.6">${BROWSER_LIMIT_NOTE}</span>`;
  infoEl.style.color = usedBytes > quotaBytes ? 'var(--danger)' : (usedPercent >= 85 ? 'var(--warning)' : 'var(--text2)');
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('�? Ảnh quá l�?n. Chọn ảnh < 2MB', 'danger');
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
    showToast('�?? Đã cập nhật logo!', 'success');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  const s = Store.getSettings();
  s.storeLogo = null;
  Store.setSettings(s);
  applyStoreSettings();
  renderSettings();
  showToast('�???️ Đã xoá logo!', 'success');
}

// ============================================================
// PAYMENT WATCHER �?? Tự �?�?ng nhận tiền QR Banking
// ============================================================

/**
 * Phát âm thanh nhận tiền (coin/chime) bằng Web Audio API.
 * Không cần file âm thanh nào �?? t�?ng hợp ngay trên thiết b�?.
 * @param {number} vol - 0..1
 */
function playPaymentSound(vol = 0.8) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const notes = [
      { freq: 523.25, start: 0,    dur: 0.18 },  // C5
      { freq: 659.25, start: 0.12, dur: 0.18 },  // E5
      { freq: 783.99, start: 0.24, dur: 0.18 },  // G5
      { freq: 1046.5, start: 0.36, dur: 0.36 },  // C6
    ];

    notes.forEach(({ freq, start, dur }) => {
      // Sine oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);

      // Harmonics (overtone for coin feel)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2.75;
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(vol * 0.15, t + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
      osc2.start(t);
      osc2.stop(t + dur);
    });

    // Auto-close context sau 2 giây
    setTimeout(() => { try { ctx.close(); } catch(_) {} }, 2000);
  } catch (e) {
    console.warn('[PaySound] Web Audio failed:', e.message);
  }
}

function testPaySound() {
  const s = Store.getSettings();
  const vol = (Number(s.paySoundVolume ?? 80)) / 100;
  playPaymentSound(vol);
  showToast('�??? �?m thanh nhận tiền!', 'success');
}

// ------- Watcher state -------
let _payWatchTimer    = null;
let _payWatchAmount   = 0;
let _payWatchStart    = 0;   // Timestamp khi bắt �?ầu watch (ms)
let _payWatchSeenTxIds = new Set(); // IDs �?ã xử lý �?�? tránh double-trigger
let _payWatchConfirmed = false;

/**
 * Gọi API �?�? lấy 20 giao d�?ch gần nhất.
 */
async function fetchRecentTransactions(token) {
  if (!token) return [];

  // SePay: https://my.sepay.vn/userapi/transactions/list
  const res = await fetch('https://my.sepay.vn/userapi/transactions/list?limit=20', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`SePay HTTP ${res.status}`);
  const data = await res.json();
  // data.transactions[].amount_in, .id, .transaction_date, .description
  const records = (data.transactions || []).map(t => ({
    id:     String(t.id),
    amount: Number(t.amount_in || 0),
    desc:   t.description || '',
    when:   t.transaction_date || '',
  }));
  return records;
}

/**
 * Bắt �?ầu polling khi bill �?ược hi�?n th�?.
 * @param {number} expectedAmount - S�? tiền cần nhận
 * @param {string} billNo        - Mã bill �?�? tham chiếu
 */
function startPaymentWatcher(expectedAmount, billNo) {
  const s = Store.getSettings();
  if (!s.autoPayDetect || !s.sepayToken) return;

  stopPaymentWatcher(); // Dừng watcher cũ nếu có

  _payWatchAmount    = expectedAmount;
  _payWatchStart     = Date.now();
  _payWatchSeenTxIds = new Set();
  _payWatchConfirmed = false;

  // Hi�?n th�? trạng thái �?ang chờ
  _payWatchUpdateStatus('⏳ Đang chờ thanh toán (SePay)...', 'var(--text3)');

  const token = s.sepayToken;
  const vol   = (Number(s.paySoundVolume ?? 80)) / 100;

  const poll = async () => {
    if (_payWatchConfirmed) return;

    // Dừng sau 30 phút �?�? không poll mãi
    if (Date.now() - _payWatchStart > 30 * 60 * 1000) {
      stopPaymentWatcher();
      _payWatchUpdateStatus('�?? Đã hết thời gian chờ (30 phút)', 'var(--text3)');
      return;
    }

    try {
      const txns = await fetchRecentTransactions(token);

      // Tìm giao d�?ch kh�?p: �?úng s�? tiền + trong vòng 5 phút k�? từ khi m�? bill
      const match = txns.find(t => {
        if (_payWatchSeenTxIds.has(t.id)) return false;
        if (t.amount !== _payWatchAmount) return false;
        if (!t.when) return true; // Nếu không có time, chấp nhận
        const txTime = new Date(t.when).getTime();
        return (txTime >= _payWatchStart - 5 * 60 * 1000); // ±5 phút
      });

      if (match) {
        _payWatchConfirmed = true;
        _payWatchSeenTxIds.add(match.id);
        stopPaymentWatcher();
        onPaymentReceived(match, billNo, vol);
      }
    } catch (err) {
      // L�?i mạng thì lặng im, tiếp tục poll
      console.warn('[PayWatcher] poll error:', err.message);
      _payWatchUpdateStatus('�?�️ Đang ki�?m tra qua SePay... (l�?i kết n�?i tạm thời)', 'var(--warning)');
    }

    // Đặt l�?ch poll tiếp (5 giây)
    if (!_payWatchConfirmed) {
      _payWatchTimer = setTimeout(poll, 5000);
    }
  };

  // Bắt �?ầu poll ngay sau 1 giây (cho QR hi�?n th�? xong)
  _payWatchTimer = setTimeout(poll, 1000);
}

/** Dừng polling */
function stopPaymentWatcher() {
  if (_payWatchTimer) { clearTimeout(_payWatchTimer); _payWatchTimer = null; }
}

/** Cập nhật dòng trạng thái trong bill modal */
function _payWatchUpdateStatus(text, color) {
  const el = document.getElementById('pay-watch-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = color || 'var(--text3)';
}

/**
 * Được gọi khi phát hi�?n giao d�?ch kh�?p.
 * Phát âm �?? hi�?n thông báo l�?n �?? tự �?iền phương thức "bank" vào xác nhận.
 */
function onPaymentReceived(tx, billNo, vol) {
  // 1) �?m thanh
  playPaymentSound(vol);

  // 2) Cập nhật trạng thái trong bill
  _payWatchUpdateStatus(
    `�?? Đã nhận ${fmtFull(tx.amount)} �?? ${tx.when ? fmtDateTime(tx.when) : 'vừa xong'}`,
    'var(--success)'
  );

  // 3) Nút thanh toán chuy�?n sang màu xanh n�?i bật
  const payBtn = document.getElementById('bill-pay-btn');
  if (payBtn) {
    payBtn.textContent = '�??? Xác nhận �?ã nhận tiền';
    payBtn.classList.remove('btn-success');
    payBtn.classList.add('btn-success');
    payBtn.style.animation = 'pulse-pay 0.8s ease 3';
  }

  // 4) Hi�?n toast toàn màn hình
  showPaymentBanner(tx.amount, tx.desc);

  // 5) Haptic (nếu có)
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
}

/**
 * Hi�?n th�? banner l�?n "Đã nhận tiền" phủ lên màn hình ngắn.
 */
function showPaymentBanner(amount, desc) {
  let banner = document.getElementById('pay-received-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pay-received-banner';
    banner.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.82)',
      'backdrop-filter:blur(8px)',
      'animation:fadeInPay 0.35s ease',
      'cursor:pointer',
    ].join(';');
    banner.onclick = () => {
      banner.style.opacity = '0';
      setTimeout(() => { try { banner.remove(); } catch(_){} }, 300);
    };
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div style="text-align:center;padding:32px;max-width:320px">
      <div style="font-size:72px;line-height:1;margin-bottom:16px;animation:bounceIn 0.5s ease">�??�</div>
      <div style="font-size:22px;font-weight:800;color:#00D68F;margin-bottom:8px">Đ�? NHẬN TI�?N!</div>
      <div style="font-size:32px;font-weight:900;color:#fff;margin-bottom:12px">${fmtFull(amount)}</div>
      ${desc ? `<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:20px;line-height:1.4">${desc}</div>` : ''}
      <div style="font-size:12px;color:rgba(255,255,255,0.5)">Chạm �?�? �?óng</div>
    </div>
  `;
  banner.style.opacity = '1';
  banner.style.display = 'flex';

  // Tự tắt sau 6 giây
  setTimeout(() => {
    if (banner && banner.parentNode) {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity 0.4s';
      setTimeout(() => { try { banner.remove(); } catch(_){} }, 400);
    }
  }, 6000);
}

// ============================================================
// BACKUP
// ============================================================

/**
 * Tự d�?n nhẹ dữ li�?u nặng trong localStorage (không xóa hản) �?�? giảm dỡng lượng trư�?c khi backup.
 * - Bỏ photos khỏi l�?ch sử �?ơn (nếu còn lưu sau khi clean job)
 * - Gi�?i hạn AI history xu�?ng 60 entry
 * Trả về s�? bytes tiết ki�?m �?ược.
 */
function pruneBeforeBackup() {
  let freed = 0;
  try {
    // Trim AI history -> 60 entries
    const ai = Store.getAIHistory() || [];
    if(ai.length > 60) {
      const before = JSON.stringify(ai).length;
      Store.setAIHistory(ai.slice(-60));
      freed += before - JSON.stringify(Store.getAIHistory()).length;
    }
    // Strip large photos still embedded in history entries
    const hist = Store.getHistory() || [];
    let histChanged = false;
    const cleanHist = hist.map(o => {
      if(!o || !Array.isArray(o.photos) || !o.photos.length) return o;
      histChanged = true;
      return { ...o, photos: [] };
    });
    if(histChanged) {
      const before = JSON.stringify(hist).length;
      Store.set('gkhl_history', cleanHist);
      freed += before - JSON.stringify(cleanHist).length;
    }
  } catch(_) {}
  return freed;
}

function manualBackup() {
  try {
    // Bư�?c 1: Tự d�?n data nặng (silent) trư�?c khi lưu
    pruneBeforeBackup();

    // Bư�?c 2: C�? lưu local backup
    const snapshot = Store.saveLocalBackup();
    renderBackupList();
    const last = Store.getLastBackupTime();
    const lastEl = document.getElementById('last-backup-time');
    if(lastEl) lastEl.textContent = last ? fmtDateTime(last) : '';
    updateStorageQuotaInfo();

    if(!snapshot) {
      // Trường hợp localStorage browser �?ầy (iOS Safari gi�?i hạn ~5-10 MB thực tế)
      // Không tự �?�?ng xuất file (gây b�?i r�?i) �?? hỏi người dùng thảy.
      showToast(
        '�?�️ B�? nh�? trình duy�?t �?ầy (iOS/Safari gi�?i hạn ~5�??10 MB). ' +
        'Hãy bấm "�??� Xuất file" �?�? lưu backup ra máy.',
        'warning',
        6000
      );
      return;
    }
    showToast('�??� Đã backup thành công!', 'success');
  } catch(err) {
    // Catch l�?i QuotaExceededError bất kỳ cấp �?�? nào
    if(err.name === 'QuotaExceededError' || /quota/i.test(err.message || '')) {
      updateStorageQuotaInfo();
      showToast(
        '�?�️ B�? nh�? trình duy�?t b�? �?ầy. Hãy bấm "�??� Xuất file" hoặc "�?�� Dọn dữ li�?u nặng" r�?i thử lại.',
        'warning',
        6000
      );
    } else {
      showToast('�? Backup thất bại: ' + (err.message || err), 'danger');
    }
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
    showToast('�??� Đã xuất file backup!', 'success');
  } catch(err) {
    showToast('�? Xuất thất bại: ' + err.message, 'danger');
  }
}

/** Xuất ch�? mục cài �?ặt �?ã lưu trong b�? nh�? (sau khi bấm Lưu cài �?ặt), không g�?m menu/�?ơn hàng/... */
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
    showToast('�??? Đã xuất file cài �?ặt �?ã lưu.', 'success');
  } catch(err) {
    showToast('�? Xuất cài �?ặt thất bại: ' + (err.message || err), 'danger');
  }
}

async function cleanupHeavyData() {
  if(!confirm('Dọn dữ li�?u nặng sẽ xóa ảnh order, ảnh chứng từ nhập hàng và giữ lại 120 tin nhắn AI m�?i nhất. Tiếp tục?')) return;
  try {
    const history = Store.getHistory() || [];
    let removedOrderPhotos = 0;
    
    // Xóa ảnh của các �?ơn v�? l�?ch sử khỏi b�? nh�? PhotoDB
    for(const o of history) {
      if(o && o.historyId) {
         await PhotoDB.remove('history_' + o.historyId);
         removedOrderPhotos++; // Chấp nhận �?ếm vo vì không tải dataUrl ra nữa
      }
    }
    // Vẫn cập nhật lại mảng history cho chắc �?n không còn base64 lọt nào
    const nextHistory = history.map(o => {
      if(!o || typeof o !== 'object') return o;
      const photos = Array.isArray(o.photos) ? o.photos : [];
      return photos.length ? { ...o, photos: [] } : o;
    });
    Store.set('gkhl_history', nextHistory);

    const purchaseMap = purchasePhotoCache || {};
    let removedPurchasePhotos = Object.keys(purchaseMap).length;
    
    purchasePhotoCache = {};
    orderPhotoCache = {};
    await Store.setPurchasePhotosAsync({});
    await Store.setOrderPhotosAsync({});

    const aiHistory = Store.getAIHistory() || [];
    const trimmedAiHistory = aiHistory.slice(-120);
    const removedAiMessages = Math.max(0, aiHistory.length - trimmedAiHistory.length);
    Store.setAIHistory(trimmedAiHistory);

    renderBackupList();
    renderOrderHistoryList();
    updateStorageQuotaInfo();
    showToast(`�?�� Đã dọn dữ li�?u nặng: ${removedOrderPhotos + removedPurchasePhotos} ảnh, ${removedAiMessages} tin AI cũ.`, 'success');
  } catch(err) {
    showToast('�? Dọn dữ li�?u thất bại: ' + (err.message || err), 'danger');
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
    showToast('Không tải �?ược thư vi�?n Excel. Vui lòng tải lại trang.', 'danger');
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
      return Number.isNaN(d.getTime()) ? 'Ngày cụ th�?' : `Ngày ${d.toLocaleDateString('vi-VN')}`;
    }
    if(period === 'day') return 'Ngày cụ th�?';
    if(period === 'week') return '7 ngày gần nhất';
    if(period === 'month') return 'Tháng hi�?n tại';
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
      'TT', 'Ngày bán', 'Mã sản phẩm', 'Tên sản phẩm', 'S�? lượng bán',
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
    tr.getCell(1).value = 'T�?NG';
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

  // Sheet �?ầy �?ủ l�?ch sử �?ơn hàng (theo �?ơn, không theo từng món)
  const fillOrdersSheet = ws => {
    const lastCol = 14;
    applyReportTitleBlock(ws, {
      title: 'L�?CH SỬ ĐƠN H�?NG (ĐẦY ĐỦ)',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const vatLabel = vatRate > 0 ? `VAT (${vatRate}%)` : 'VAT';
    const headers = [
      'TT', 'Mã �?ơn', 'Thời gian', 'Bàn/Kênh', 'Danh sách món',
      'Tiền hàng (VND)', 'Giảm giá (VND)', 'Phí ship (VND)', vatLabel,
      'T�?ng c�?ng (VND)', 'Giá v�?n (VND)', 'Lãi g�?p (VND)', 'PT Thanh toán', 'Ghi chú',
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
      const payLabel = o.payMethod === 'bank' ? 'Chuy�?n khoản' : 'Tiền mặt';
      const itemsText = (o.items||[]).map(i => `${i.name} x${i.qty} (${excelFmtVnInt(i.price*i.qty)}�?)`).join('; ');

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
    tr.getCell(1).value = `T�?NG (${orders.length} �?ơn)`;
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
    const headers = ['TT', 'Ngày chi', 'Mã chi phí', 'N�?i dung', 'Danh mục', 'S�? tiền (VND)'];
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
    tr.getCell(1).value = 'T�?NG';
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
      title: 'BÁO CÁO NHẬP H�?NG',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = [
      'TT', 'Ngày nhập', 'Mã phiếu', 'Nguyên li�?u', 'S�? lượng', 'Đơn v�?',
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
    tr.getCell(1).value = 'T�?NG';
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
      title: 'BÁO CÁO T�?N KHO',
      periodLabel,
      exportDateStr,
      lastCol,
    });
    const headers = [
      'TT', 'Mã hàng', 'Tên nguyên li�?u', 'Đơn v�?', 'T�?n hi�?n tại', 'T�?n t�?i thi�?u',
      'Giá v�?n (VND)', 'Giá tr�? t�?n (VND)', 'Trạng thái',
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
    tr.getCell(1).value = 'T�?NG';
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
        showToast('�?�️ Bật tự �?ẩy sau xuất nhưng thiếu URL hoặc ID thư mục Google Drive.', 'warning');
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
          showToast('�?�️ Đẩy lên Google Drive thất bại: ' + (err.message || err), 'warning');
          return false;
        }
        showToast('�?�️ Upload Google Drive thất bại: ' + (err.message || err), 'warning');
      }
    }
  }

  if(!skipLocalDownload) {
    if(uploadOk === true && s.autoUploadToGoogleDrive) {
      showToast(uploadDriveOpaque
        ? 'Đã xuất Excel. Đã gửi bản sao lên Drive �?? vui lòng ki�?m tra thư mục (trình duy�?t có th�? không �?ọc �?ược phản h�?i).'
        : 'Đã xuất file báo cáo Excel và �?ẩy bản .xlsx lên Google Drive.', 'success');
    } else {
      showToast('Đã xuất file báo cáo Excel.', 'success');
    }
  } else if(uploadOk === true) {
    showToast(uploadDriveOpaque
      ? '�?�️ Đã gửi file .xlsx lên Drive. M�? thư mục �?ã chọn �?�? xác nhận (chế �?�? tương thích CORS: không �?ọc �?ược phản h�?i chi tiết).'
      : '�?�️ Đã �?ẩy file báo cáo (.xlsx) lên thư mục Google Drive �?ã chọn.', 'success');
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
    reader.onerror = () => reject(new Error('Không �?ọc �?ược file �?�? upload.'));
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
 * Gửi body là JSON nhưng Content-Type: text/plain �?�? tránh preflight �?? doPost vẫn JSON.parse(postData.contents).
 * Nếu vẫn Failed to fetch: thử mode no-cors (không �?ọc �?ược phản h�?i, coi như �?ã gửi).
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
    throw new Error('Không dùng URL /dev. Hãy tri�?n khai Web App và dùng URL kết thúc /exec (hoặc URL tri�?n khai �?ầy �?ủ Google cung cấp).');
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
      throw new Error(data.message || data.error || 'Google Drive từ ch�?i lưu file.');
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
    throw new Error('Không gửi �?ược t�?i Web App (ki�?m tra mạng hoặc URL).');
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
      console.warn('[Drive] L�?i mạng/CORS v�?i Content-Type', ct, err);
    }
  }

  if(!isGoogleAppsScriptWebAppUrl(url)) {
    throw new Error('Failed to fetch �?? URL phải là Web App Google (dạng script.google.com/.../exec). Ki�?m tra HTTPS, mạng, hoặc tắt extension chặn script.google.com.');
  }

  console.warn('[Drive] Chuy�?n sang no-cors (ch�? phù hợp v�?i Web App Google):', lastNet);
  return tryNoCorsPlain();
}

function getWeekStartKey(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  // getDay: 0=Sun..6=Sat �?? chuy�?n về Monday start
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
    reader.onload = async ev => {
      try {
        const backup = JSON.parse(ev.target.result);
        
        // Khôi phục vào localStorage trư�?c (fallback)
        Store.restoreFromBackup(backup);
        
        // Nếu �?ang kết n�?i Cloud và là admin, �?�?ng b�? thẳng lên Cloud
        if (window.DB && window.appState && window.appState.userDoc?.role === 'admin') {
           showToast('⏳ Đang �?�?ng b�? backup lên Cloud...', 'info');
           await window.DB.migrateJson(backup, false);
           showToast('�?? Đã �?�?ng b�? backup lên Cloud thành công!', 'success');
        } else if (window.appState) {
           // Nạp tạm vào appState �?�? UI có th�? �?ọc ngay (chế �?�? offline hoặc local)
           Object.entries(backup.data).forEach(([k, v]) => {
             if (Array.isArray(window.appState[k])) window.appState[k] = v;
             else if (k === 'settings') window.appState.settings = v;
           });
        }
        
        orderItems = {};
        applyStoreSettings();
        renderPage(currentPage);
        updateAlertBadge();
        showToast(`�?? Đã khôi phục từ backup ${backup.exportedAt ? fmtDate(backup.exportedAt) : ''}!`, 'success');
      } catch(err) {
        showToast('�? File không hợp l�?: ' + err.message, 'danger');
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
      <div class="list-item-icon" style="background:rgba(0,149,255,0.1)">�??�</div>
      <div class="list-item-content">
        <div class="list-item-title">${i === 0 ? '⭐ ' : ''}Backup ${i+1}</div>
        <div class="list-item-sub">${b.label || fmtDate(b.date)} · ${(b.size/1024).toFixed(1)} KB</div>
      </div>
      <div style="display:flex;gap:4px">
        ${i === 0 ? `<button class="btn btn-xs btn-secondary" onclick="restoreLatestBackup()">�?�️</button>` : ''}
        <button class="btn btn-xs btn-danger" onclick="deleteBackup(${i})" title="Xóa backup này">�???️</button>
      </div>
    </div>`
  ).join('') : '<div style="padding:12px;color:var(--text2);font-size:12px;text-align:center">Chưa có backup nào</div>';
}

function deleteBackup(index) {
  if(!confirm(`Xóa backup ${index+1}? Hành �?�?ng này không th�? hoàn tác.`)) return;
  Store.deleteLocalBackup(index);
  renderBackupList();
  showToast('�???️ Đã xóa backup', 'success');
}

function restoreLatestBackup() {
  if(!confirm('Khôi phục backup gần nhất? Dữ li�?u hi�?n tại sẽ b�? ghi �?è.')) return;
  const raw = localStorage.getItem('gkhl_backup_latest');
  if(!raw) { showToast('�? Không tìm thấy backup', 'danger'); return; }
  try {
    const backup = JSON.parse(raw);
    
    Store.restoreFromBackup(backup);
    
    if (window.DB && window.appState && window.appState.userDoc?.role === 'admin') {
       showToast('⏳ Đang �?�?ng b�? backup lên Cloud...', 'info');
       window.DB.migrateJson(backup, false).then(() => {
         showToast('�?? Đã �?�?ng b�? backup lên Cloud thành công!', 'success');
       }).catch(err => {
         showToast('�? L�?i �?�?ng b�?: ' + err.message, 'danger');
       });
    } else if (window.appState) {
       Object.entries(backup.data).forEach(([k, v]) => {
         if (Array.isArray(window.appState[k])) window.appState[k] = v;
         else if (k === 'settings') window.appState.settings = v;
       });
    }

    orderItems = {};
    applyStoreSettings();
    renderPage(currentPage);
    updateAlertBadge();
    showToast('�?? Đã khôi phục backup!', 'success');
  } catch(err) {
    showToast('�? Khôi phục thất bại', 'danger');
  }
}


// ============================================================
// PAGE: NCC (NH�? CUNG CẤP)
// ============================================================
function renderNCC() {
  const suppliers = Store.getSuppliers();
  const purchases = Store.getPurchases();
  const el = document.getElementById('ncc-list');
  if (!el) return;

  if (suppliers.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">�?��</div><div class="empty-text">Chưa có nhà cung cấp nào<br><small>Nhấn "+ Thêm NCC" �?�? bắt �?ầu</small></div></div>`;
    return;
  }

  el.innerHTML = suppliers.map(s => {
    // Tính doanh s�? nhập theo từng NCC
    const myPurchases = purchases.filter(p => p.supplierId === s.id || p.supplier === s.name);
    const totalAmount = myPurchases.reduce((sum, p) => sum + p.price, 0);
    const thisMonth = myPurchases.filter(p => {
      const d = new Date(p.date); const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + p.price, 0);

    const debtLabels = { immediate: 'Tiền ngay', weekly: 'G�?i tuần', monthly: 'G�?i tháng', credit: 'Công nợ dài hạn' };
    const debtLabel = debtLabels[s.debtPolicy] || s.debtPolicy || 'Chưa rõ';

    return `<div class="list-item" style="flex-direction:column;align-items:flex-start;gap:6px;cursor:pointer" onclick="openNCCDetail('${s.id}')">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <div>
          <div class="list-item-title" style="font-size:15px">${s.name}</div>
          ${s.phone ? `<div class="list-item-sub">�??? ${s.phone}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs btn-outline" onclick="event.stopPropagation();editNCC('${s.id}')">�?�️</button>
          <button class="btn btn-xs btn-danger" onclick="event.stopPropagation();deleteNCC('${s.id}')">�???️</button>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--text2)">
        ${s.address ? `<span>�??� ${s.address}</span>` : ''}
        <span>�??� ${debtLabel}</span>
        <span>�??� Tháng này: <b style="color:var(--primary)">${fmt(thisMonth)}�?</b></span>
        <span>�??? T�?ng: ${fmt(totalAmount)}�?</span>
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
  document.getElementById('ncc-modal-title').textContent = '�?�� Thêm Nhà Cung Cấp';
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
  document.getElementById('ncc-modal-title').textContent = '�?�️ Sửa Nhà Cung Cấp';
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
    showToast('�?? Đã cập nhật nhà cung cấp!', 'success');
  } else {
    Store.addSupplier({ id: uid(), name, phone, address, debtPolicy, products, notes });
    showToast('�?? Đã thêm nhà cung cấp!', 'success');
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
  showToast('�???️ Đã xoá nhà cung cấp', 'success');
}

function openNCCDetail(id) {
  const s = Store.getSuppliers().find(x => x.id === id);
  if (!s) return;
  const purchases = Store.getPurchases().filter(p => p.supplierId === id || p.supplier === s.name);
  const debtLabels = { immediate: 'Tiền ngay', weekly: 'G�?i �?ầu theo tuần', monthly: 'G�?i �?ầu theo tháng', credit: 'Công nợ dài hạn' };

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
      ${s.phone ? `<div style="color:var(--text2);margin-top:4px">�??? ${s.phone}</div>` : ''}
      ${s.address ? `<div style="color:var(--text2)">�??� ${s.address}</div>` : ''}
      <div style="color:var(--text2)">�??� Chính sách: ${debtLabels[s.debtPolicy] || s.debtPolicy || 'Chưa rõ'}</div>
      ${s.products?.length ? `<div style="color:var(--text3);font-size:12px;margin-top:6px">Hàng cung cấp: ${s.products.join(', ')}</div>` : ''}
      ${s.notes ? `<div style="color:var(--text3);font-size:12px;margin-top:4px;border-left:2px solid var(--border);padding-left:8px">${s.notes}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
      <div class="stat-card" style="padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text3)">Tuần này</div>
        <div style="font-size:15px;font-weight:700;color:var(--primary)">${fmt(weekAmt)}�?</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text3)">Tháng này</div>
        <div style="font-size:15px;font-weight:700;color:var(--info)">${fmt(monthAmt)}�?</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text3)">T�?ng c�?ng</div>
        <div style="font-size:15px;font-weight:700;color:var(--success)">${fmt(total)}�?</div>
      </div>
    </div>
    <div style="font-weight:600;margin-bottom:8px">�??? L�?ch sử nhập hàng (${purchases.length} lần)</div>
    ${purchases.slice(0,10).map(p => `
      <div class="list-item" style="padding:8px 0">
        <div class="list-item-content">
          <div class="list-item-title">${p.name}</div>
          <div class="list-item-sub">${p.qty} ${p.unit||'phần'} · ${fmtDate(p.date)}</div>
        </div>
        <div class="list-item-right"><div class="list-item-amount">${fmt(p.price)}�?</div></div>
      </div>`).join('') || '<div style="color:var(--text3);text-align:center;padding:12px">Chưa có l�?ch sử nhập hàng</div>'}
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

// Legacy duplicate AI block removed for maintainability.
