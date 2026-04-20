const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { NLPEngine, normalizeVi } = require('./NLPEngine');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = 3123;

// Keep track of connected POS clients
let clients = [];

function loadServiceAccount() {
  const directPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(directPath)) return require(directPath);
  const fallback = fs.readdirSync(__dirname).find(name =>
    /^.+-firebase-adminsdk-[^.]+\.json$/i.test(name)
  );
  if (!fallback) return null;
  return require(path.join(__dirname, fallback));
}

const serviceAccount = loadServiceAccount();
if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const firestore = admin.apps.length ? admin.firestore() : null;

const nlp = new NLPEngine({
  trainingPath: path.join(__dirname, 'POS_NLU_Training.json'),
  masterDataPath: path.join(__dirname, 'GanhKho_MasterData.json'),
});
let nlpReady = false;
nlp.trainModel().then(() => { nlpReady = true; }).catch(() => { nlpReady = false; });

function findMenuItemByName(menuDocs, name) {
  const key = normalizeVi(name);
  if (!key) return null;
  const exact = menuDocs.find(m => normalizeVi(m.name) === key);
  if (exact) return exact;
  const partial = menuDocs.find(m => normalizeVi(m.name).includes(key) || key.includes(normalizeVi(m.name)));
  return partial || null;
}

async function ensureOpenOrder(tableId) {
  if (!firestore) throw new Error('Firestore chưa được cấu hình trên server.');
  const tid = String(tableId);
  const tableRef = firestore.collection('tables').doc(tid);
  const tableSnap = await tableRef.get();
  const table = tableSnap.exists ? tableSnap.data() : null;
  const existingOrderId = table?.orderId ? String(table.orderId) : null;
  if (existingOrderId) {
    const orderSnap = await firestore.collection('orders').doc(existingOrderId).get();
    if (orderSnap.exists) return { orderId: existingOrderId, tableName: table?.name || `Bàn ${tid}` };
  }

  const orderId = `ORD-${tid}-${Date.now()}`;
  const orderRef = firestore.collection('orders').doc(orderId);
  const tableName = table?.name || `Bàn ${tid}`;
  await firestore.runTransaction(async tx => {
    tx.set(orderRef, {
      id: orderId,
      tableId: tid,
      tableName,
      staffUid: null,
      items: [],
      discount: 0,
      discountType: 'vnd',
      shipping: 0,
      vatAmount: 0,
      note: '',
      status: 'open',
      openedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(tableRef, {
      status: 'occupied',
      orderId,
      openTime: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return { orderId, tableName };
}

async function addItemsToOrder(orderId, items) {
  if (!firestore) throw new Error('Firestore chưa được cấu hình trên server.');
  const orderRef = firestore.collection('orders').doc(orderId);
  await firestore.runTransaction(async tx => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error('Đơn không tồn tại: ' + orderId);
    const current = snap.data() || {};
    const list = Array.isArray(current.items) ? current.items.map(i => ({ ...i })) : [];
    items.forEach(it => {
      const idx = list.findIndex(x => x.id === it.id && String(x.note || '') === String(it.note || ''));
      if (idx >= 0) list[idx].qty = (Number(list[idx].qty) || 1) + (Number(it.qty) || 1);
      else list.push({ ...it, qty: Number(it.qty) || 1 });
    });
    tx.update(orderRef, { items: list });
  });
}

async function getMenuDocs() {
  if (!firestore) return [];
  const snap = await firestore.collection('menu').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getInventoryByName(name) {
  if (!firestore) throw new Error('Firestore chưa được cấu hình trên server.');
  const snap = await firestore.collection('inventory').get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const key = normalizeVi(name);
  const exact = list.find(i => normalizeVi(i.name) === key);
  if (exact) return exact;
  return list.find(i => normalizeVi(i.name).includes(key) || key.includes(normalizeVi(i.name))) || null;
}

async function queryHistoryRevenue(timeRange) {
  if (!firestore) throw new Error('Firestore chưa được cấu hình trên server.');
  const fromTs = admin.firestore.Timestamp.fromDate(timeRange.from);
  const toTs = admin.firestore.Timestamp.fromDate(timeRange.to);
  const snap = await firestore.collection('history')
    .where('paidAt', '>=', fromTs)
    .where('paidAt', '<=', toTs)
    .get();
  const list = snap.docs.map(d => d.data() || {});
  const revenue = list.reduce((s, h) => s + (Number(h.total) || 0), 0);
  const orders = list.length;
  return { revenue, orders };
}

async function queryPurchases(timeRange, itemName) {
  if (!firestore) throw new Error('Firestore chưa được cấu hình trên server.');
  const snap = await firestore.collection('purchases').get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const from = timeRange.from;
  const to = timeRange.to;
  const filtered = list.filter(p => {
    const d = p.date ? new Date(p.date) : null;
    if (!d || isNaN(d.getTime())) return false;
    return d >= from && d <= to;
  }).filter(p => {
    if (!itemName) return true;
    return normalizeVi(p.name).includes(normalizeVi(itemName)) || normalizeVi(itemName).includes(normalizeVi(p.name));
  });
  const total = filtered.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const qty = filtered.reduce((s, p) => s + (Number(p.qty) || 0), 0);
  const unit = filtered.find(p => p.unit)?.unit || '';
  return { total, qty, unit, count: filtered.length };
}

io.on('connection', (socket) => {
  console.log('🔗 POS Client connected:', socket.id);
  clients.push(socket);

  socket.on('disconnect', () => {
    console.log('❌ POS Client disconnected:', socket.id);
    clients = clients.filter(c => c.id !== socket.id);
  });
});

// Endpoint for iOS Shortcuts or other APIs to send voice text
app.post('/api/voice', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  console.log(`🎙️ Voice command received: "${text}"`);

  let nlpResult = null;
  try {
    if (!nlpReady) await nlp.trainModel();
    nlpResult = await nlp.process(text);
  } catch (e) {
    console.error('[NLP] process error:', e);
    return res.json({ reply: 'Không xử lý được lệnh NLP. Vui lòng thử lại.' });
  }

  const intent = nlpResult.intent;
  const entities = nlpResult.entities || {};

  try {
    if (intent === 'pos_order') {
      const tableId = entities.table;
      const items = Array.isArray(entities.items) ? entities.items : [];
      if (!tableId) return res.json({ reply: 'Bạn muốn gọi món cho bàn nào ạ? Ví dụ: "Bàn 5 gọi 3 tiger bạc"' });
      if (!items.length) return res.json({ reply: `Dạ em chưa nghe rõ tên món. Mời anh chị nói lại tên món cho bàn ${tableId} ạ!` });

      if (!firestore) return res.json({ reply: 'Server chưa cấu hình Firestore để ghi đơn hàng.' });
      const menuDocs = await getMenuDocs();
      const resolved = items.map(it => {
        const m = findMenuItemByName(menuDocs, it.name);
        if (!m) return null;
        return { id: m.id, name: m.name, price: Number(m.price) || 0, qty: Number(it.qty) || 1, note: '' };
      }).filter(Boolean);
      if (!resolved.length) return res.json({ reply: `Dạ em chưa khớp được món trong menu. Anh chị vui lòng chọn thủ công cho bàn ${tableId} ạ!` });

      const { orderId } = await ensureOpenOrder(tableId);
      await addItemsToOrder(orderId, resolved);
      const names = resolved.map(x => `${x.qty} ${x.name}`).join(', ');
      return res.json({ reply: `Dạ em đã lên ${names} cho bàn ${tableId} rồi ạ!` });
    }

    if (intent === 'pos_checkout') {
      const tableId = entities.table;
      if (!tableId) return res.json({ reply: 'Bạn muốn tính tiền bàn nào ạ? Ví dụ: "Tính tiền bàn 5"' });
      return res.json({ reply: `Dạ em đã nhận lệnh tính tiền bàn ${tableId}.` });
    }

    if (intent === 'query_inventory') {
      const items = Array.isArray(entities.items) ? entities.items : [];
      const first = items[0]?.name || null;
      if (!first) return res.json({ reply: 'Bạn muốn kiểm tra tồn kho món/nguyên liệu nào ạ?' });
      const inv = await getInventoryByName(first);
      if (!inv) return res.json({ reply: `Không tìm thấy "${first}" trong kho.` });
      return res.json({ reply: `Tồn kho ${inv.name}: ${Number(inv.qty) || 0} ${inv.unit || ''}`.trim() });
    }

    if (intent === 'query_sales') {
      const { revenue, orders } = await queryHistoryRevenue(entities.timeRange);
      const label = entities.time?.label || 'hôm nay';
      return res.json({ reply: `Doanh thu ${label}: ${revenue.toLocaleString('vi-VN')}đ (${orders} đơn).` });
    }

    if (intent === 'query_import') {
      const items = Array.isArray(entities.items) ? entities.items : [];
      const first = items[0]?.name || null;
      const label = entities.time?.label || 'hôm nay';
      const s = await queryPurchases(entities.timeRange, first);
      const itemLabel = first ? ` ${first}` : '';
      return res.json({ reply: `Nhập hàng${itemLabel} ${label}: ${s.total.toLocaleString('vi-VN')}đ (${s.count} lần).` });
    }
  } catch (e) {
    console.error('[api/voice] handler error:', e);
    return res.json({ reply: 'Có lỗi khi xử lý lệnh. Vui lòng thử lại.' });
  }

  if (clients.length === 0) {
    console.log('⚠️ No POS clients connected.');
    return res.json({ reply: "POS chưa được mở trên máy tính hoặc mất kết nối." });
  }

  // We forward the text to the POS web app
  const posSocket = clients[0];
  
  // Timeout in case POS is frozen or takes too long
  let replied = false;
  const timeout = setTimeout(() => {
    if (!replied) {
      replied = true;
      res.json({ reply: "Giao dịch đang được xử lý hoặc POS phản hồi chậm." });
    }
  }, 10000); // 10s wait maximum

  posSocket.emit('voice_command', text, (replyText) => {
    if (!replied) {
      replied = true;
      clearTimeout(timeout);
      console.log(`🤖 POS replied: "${replyText}"`);
      res.json({ reply: replyText });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================`);
  console.log(`🚀 POS Bridge Server IS RUNNING!`);
  console.log(`🔗 Cổng kết nối (Port): ${PORT}`);
  console.log(`📱 Cấu hình iOS Shortcut POST tới: http://<ĐỊA_CHỈ_IP_CỦA_MÁY>:${PORT}/api/voice`);
  console.log(`=============================================`);
});
