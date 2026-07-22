function _repairAIActionText(input) {
  if (typeof _repairAIText === 'function') return _repairAIText(input);
  const str = String(input ?? '');
  if (!/[ÃÂâðáÄÆ]/.test(str)) return str;
  try {
    return decodeURIComponent(escape(str));
  } catch (_) {}
  try {
    const bytes = Uint8Array.from(str, ch => ch.charCodeAt(0) & 0xFF);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (_) {}
  return str;
}

function _resolveMenuIdFromItemRef(itemRef, menuFull) {
  if (!itemRef || !Array.isArray(menuFull) || menuFull.length === 0) return null;
  if (itemRef.id) {
    const byId = menuFull.find(m => String(m.id) === String(itemRef.id));
    if (byId) return byId.id;
  }
  const name = _normalizeAIText(itemRef.name || itemRef.itemName || '');
  if (!name) return null;
  const exact = menuFull.find(m => _normalizeAIText(m.name) === name);
  if (exact) return exact.id;
  const fuzzy = menuFull.find(m => {
    const mn = _normalizeAIText(m.name);
    return mn.includes(name) || name.includes(mn);
  });
  return fuzzy ? fuzzy.id : null;
}

function normalizeAIResponse(parsed, menuFull) {
  if (!parsed || typeof parsed !== 'object') return { actions: [], reply: '' };

  const normalized = {
    actions: [],
    reply: _repairAIActionText(String(parsed.reply || parsed.message || '').trim())
  };

  const toSafeQty = (v, fallback = 1) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  const normalizeTableId = (v) => {
    const raw = String(v ?? '').trim().toLowerCase();
    if (!raw || raw === 'null' || raw === 'undefined') return null;
    if (raw === 'takeaway') return 'takeaway';
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? String(Math.floor(num)) : null;
  };

  const sourceActions = Array.isArray(parsed.actions)
    ? parsed.actions
    : (parsed.type ? [parsed] : []);

  sourceActions.forEach((a) => {
    if (!a || typeof a !== 'object') return;
    const type = _normalizeAIActionType(a.type);
    const tableId = normalizeTableId(a.tableId);

    if (type === 'order') {
      const srcItems = Array.isArray(a.items) ? a.items : [];
      const items = srcItems.map((it) => {
        const id = _resolveMenuIdFromItemRef(it, menuFull);
        if (!id) return null;
        return { id, qty: toSafeQty(it.qty, 1) };
      }).filter(Boolean);
      if (tableId && items.length > 0) normalized.actions.push({ type: 'order', tableId, items });
      return;
    }

    if (type === 'remove') {
      const srcItems = Array.isArray(a.items) ? a.items : (a.itemId || a.name ? [a] : []);
      const mapped = srcItems.map((it) => {
        const itemId = it.itemId || _resolveMenuIdFromItemRef(it, menuFull);
        if (!itemId) return null;
        return { type: 'remove', tableId, itemId, qty: toSafeQty(it.qty, 1) };
      }).filter(Boolean);
      mapped.forEach(x => { if (tableId) normalized.actions.push(x); });
      return;
    }

    if (type === 'restock') {
      const srcItems = Array.isArray(a.items) ? a.items : [];
      const items = srcItems.map((it) => {
        const id = _resolveMenuIdFromItemRef(it, menuFull) || null;
        const name = String(it.name || '').trim();
        const qty = toSafeQty(it.qty, 1);
        if (!id && !name) return null;
        return { id, name, qty };
      }).filter(Boolean);
      if (items.length > 0) normalized.actions.push({ type: 'restock', items });
      return;
    }

    if (type === 'pay' || type === 'view' || type === 'unknown') {
      if (tableId) normalized.actions.push({ type, tableId });
      return;
    }

    if (type === 'report') {
      const date = a.date ? String(a.date).trim() : '';
      normalized.actions.push(date ? { type: 'report', date } : { type: 'report' });
    }
  });

  return normalized;
}

function validateAIActions(parsed, menuFull) {
  const allowed = new Set(['order', 'remove', 'pay', 'view', 'report', 'restock', 'unknown']);
  const validTableIds = new Set(
    (Store.getTables() || []).map(t => String(t.id)).concat(['takeaway'])
  );
  const menuIds = new Set((menuFull || []).map(m => String(m.id)));
  const isStaff = !!(currentUser && currentUser.role === 'staff');

  const warnings = [];
  const safeActions = [];
  const rawActions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 20) : [];
  if ((parsed.actions || []).length > 20) {
    warnings.push('Đã bỏ bớt action vượt giới hạn an toàn.');
  }

  for (const a of rawActions) {
    if (!a || typeof a !== 'object' || !allowed.has(a.type)) continue;

    if ((a.type === 'restock' || a.type === 'report') && isStaff) {
      warnings.push('Tài khoản Staff không có quyền chạy lệnh kho/báo cáo qua AI.');
      continue;
    }

    if (['order', 'remove', 'pay', 'view', 'unknown'].includes(a.type)) {
      const tid = String(a.tableId || '');
      if (!validTableIds.has(tid)) {
        warnings.push(`Bỏ action ${a.type}: bàn ${tid || '?'} không hợp lệ.`);
        continue;
      }
    }

    if (a.type === 'order') {
      const items = (a.items || []).map(it => ({
        id: String(it.id || ''),
        qty: Math.max(1, Math.min(50, Number(it.qty) || 1))
      })).filter(it => menuIds.has(it.id));
      if (items.length === 0) {
        warnings.push('Bỏ action order: không có món hợp lệ.');
        continue;
      }
      safeActions.push({ type: 'order', tableId: String(a.tableId), items });
      continue;
    }

    if (a.type === 'remove') {
      const itemId = String(a.itemId || '');
      if (!menuIds.has(itemId)) {
        warnings.push('Bỏ action remove: món không hợp lệ.');
        continue;
      }
      safeActions.push({
        type: 'remove',
        tableId: String(a.tableId),
        itemId,
        qty: Math.max(1, Math.min(50, Number(a.qty) || 1))
      });
      continue;
    }

    if (a.type === 'restock') {
      const items = (a.items || []).map(it => ({
        id: it.id ? String(it.id) : null,
        name: String(it.name || '').trim(),
        qty: Math.max(1, Math.min(500, Number(it.qty) || 1))
      })).filter(it => it.id || it.name);
      if (items.length === 0) {
        warnings.push('Bỏ action restock: không có nguyên liệu hợp lệ.');
        continue;
      }
      safeActions.push({ type: 'restock', items });
      continue;
    }

    if (a.type === 'report') {
      const date = a.date ? String(a.date).trim() : undefined;
      safeActions.push(date ? { type: 'report', date } : { type: 'report' });
      continue;
    }

    if (a.type === 'pay' || a.type === 'view' || a.type === 'unknown') {
      safeActions.push({ type: a.type, tableId: String(a.tableId) });
    }
  }

  return {
    actions: safeActions,
    warnings
  };
}

function _needsAIActionConfirm(action) {
  if (!action || !action.type) return false;
  if (action.type === 'pay' || action.type === 'restock') return true;
  if (action.type === 'order') {
    const totalQty = (action.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
    return totalQty >= 10;
  }
  if (action.type === 'remove') {
    return (Number(action.qty) || 0) >= 10;
  }
  return false;
}

function _buildAIActionConfirmText(action, menuFull) {
  if (!action || !action.type) return _repairAIActionText('Xác nhận thực thi lệnh AI này?');
  if (action.type === 'pay') {
    return _repairAIActionText(`AI yêu cầu tính tiền bàn ${action.tableId}. Xác nhận thực hiện?`);
  }
  if (action.type === 'restock') {
    const preview = (action.items || [])
      .slice(0, 3)
      .map(it => `${it.qty} ${it.name || it.id}`)
      .join(', ');
    return _repairAIActionText(`AI yêu cầu nhập kho (${(action.items || []).length} mục). ${preview ? `Ví dụ: ${preview}. ` : ''}Xác nhận?`);
  }
  if (action.type === 'order') {
    const totalQty = (action.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
    return _repairAIActionText(`AI yêu cầu lên tổng ${totalQty} món cho bàn ${action.tableId}. Xác nhận?`);
  }
  if (action.type === 'remove') {
    const item = (menuFull || []).find(m => String(m.id) === String(action.itemId));
    return _repairAIActionText(`AI yêu cầu bớt ${action.qty} ${item ? item.name : 'món'} ở bàn ${action.tableId}. Xác nhận?`);
  }
  return _repairAIActionText('Xác nhận thực thi lệnh AI này?');
}

// --- Execute parsed actions (shared between Gemini and Local NLP) ---
function executeAIActions(parsed, menuFull, userText = '', options = {}) {
  if (!parsed) return _repairAIActionText('Không nhận ra lệnh này ạ.');
  parsed = normalizeAIResponse(parsed, menuFull);
  const validated = validateAIActions(parsed, menuFull);
  parsed.actions = validated.actions;
  if (!parsed.actions.length && validated.warnings.length && !parsed.reply) {
    return _repairAIActionText(`⚠️ ${validated.warnings[0]}`);
  }

  if (parsed.actions?.length) {
    for (const a of parsed.actions) {
      if (_needsAIActionConfirm(a)) {
        const ok = options.skipAutoConfirm ? true : confirm(_buildAIActionConfirmText(a, menuFull));
        if (!ok) {
          if (!parsed.reply || parsed.reply.length < 5) parsed.reply = _repairAIActionText('Đã hủy thao tác theo yêu cầu.');
          continue;
        }
      }
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
            parsed.reply = _repairAIActionText(`Dạ em đã nhập thêm ${addedNames.join(', ')} vào kho rồi ạ!`);
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

  return _repairAIActionText(parsed.reply || 'Xong rồi ạ!');
}
