// ============================================================
// AI ASSISTANT - Full-featured Chatbot
// Voice + Camera + Gemini + Google Cloud TTS
// ============================================================
let aiRecognition = null;
let aiIsListening  = false;
let aiOutputMode = 'voice'; // 'voice' or 'text'
let aiConfirmResolver = null;
let aiServerOnline = null;

// ------ UI helpers ------
let aiChatHistoryLoaded = false;

function repairVietnameseMojibake(input) {
  let str = String(input ?? '');
  if (!str) return str;
  const badTokens = ['\uFFFD', 'Ã', 'Â', 'Ä‘', 'Æ°', 'â€™', 'â€œ', 'â€', 'ðŸ', 'áº', 'á»'];
  const hasControlChars = /[\u0080-\u009f]/.test(str);
  const suspect = hasControlChars || badTokens.some(t => str.includes(t));
  if (!suspect) return str;
  try {
    str = decodeURIComponent(escape(str));
  } catch (_) {}
  try {
    const bytes = Uint8Array.from(str, ch => ch.charCodeAt(0) & 0xFF);
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    str = fixed || str;
  } catch (_) {}
  str = str.replace(/[\u0080-\u009f]/g, '');

  // Heuristic fixes for common broken fragments in chat replies.
  const dictionary = [
    [/hôm/gi, 'hôm'],
    [/hôm nay/gi, 'hôm nay'],
    [/hôm qua/gi, 'hôm qua'],
    [/với/gi, 'với'],
    [/giảm/gi, 'giảm'],
    [/doanh thu/gi, 'doanh thu'],
    [/đ\s*ồng/gi, 'đồng'],
    [/\((\d+)\s*đơn\)/gi, '($1 đơn)'],
    [/không/gi, 'không'],
    [/dữ liệu/gi, 'dữ liệu'],
  ];
  dictionary.forEach(([re, val]) => { str = str.replace(re, val); });
  return str;
}

function repairVietnameseMojibakeV2(input) {
  let str = repairVietnameseMojibake(input);
  if (!str) return str;
  const suspect = /[\uFFFD\u0080-\u009f]|Ã|Â|Ä|Æ|áº|á»|â€|ðŸ|�/.test(str);
  if (!suspect) return str;

  const decodeUtf8Bytes = (value) => {
    try {
      const bytes = Uint8Array.from(String(value || ''), ch => ch.charCodeAt(0) & 0xFF);
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      return String(value || '');
    }
  };

  const candidates = [str];
  let iterative = str;
  for (let i = 0; i < 3; i += 1) {
    const next = decodeUtf8Bytes(iterative);
    if (!next || next === iterative) break;
    candidates.push(next);
    iterative = next;
  }

  const score = (value) => {
    const text = String(value || '');
    const bad = (text.match(/[\uFFFD\u0080-\u009f]|Ã|Â|Ä|Æ|áº|á»|â€|ðŸ|�/g) || []).length;
    const good = (text.match(/[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/gi) || []).length;
    return (bad * 3) - good;
  };

  str = candidates.sort((a, b) => score(a) - score(b))[0] || str;
  str = str.replace(/[\u0080-\u009f]/g, '').replace(/�/g, '');

  const dictionary = [
    ['hÃ´m nay', 'hôm nay'],
    ['hÃ´m qua', 'hôm qua'],
    ['tuáº§n nÃ y', 'tuần này'],
    ['thÃ¡ng nÃ y', 'tháng này'],
    ['bÃ¡n Ä‘Æ°á»£c', 'bán được'],
    ['Ä‘Æ¡n vá»‹', 'đơn vị'],
    ['lÃ£i gÃ´p', 'lãi gộp'],
    ['nháº­p', 'nhập'],
    ['Táº¡m tÃ­nh', 'Tạm tính'],
    ['hiá»‡n táº¡i', 'hiện tại'],
    ['Ä‘Ã£', 'đã'],
    ['chÆ°a', 'chưa'],
    ['khÃ´ng', 'không'],
    ['bÃ n', 'bàn'],
    ['máº·t hÃ ng', 'mặt hàng'],
  ];
  dictionary.forEach(([bad, good]) => {
    str = str.split(bad).join(good);
  });

  return str.trim();
}

function repairVietnameseMojibakeV3(input) {
  let str = String(input ?? '');
  if (!str) return str;
  const suspect = /[\uFFFD\u0080-\u009f]|Ã|Â|Ä|Æ|áº|á»|â€|ðŸ|�/.test(str);
  if (!suspect) return str;

  const hasGoodVietnamese = /[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/i.test(str);
  if (!hasGoodVietnamese) {
    try {
      const bytes = Uint8Array.from(String(str || ''), ch => ch.charCodeAt(0) & 0xFF);
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded && !/[\u0000-\u001f]/.test(decoded)) str = decoded;
    } catch (_) {}
  }

  str = str.replace(/[\u0080-\u009f]/g, '').replace(/ï¿½|�/g, '');

  const dictionary = [
    ['bÃ¡n', 'bán'],
    ['Ä‘Æ°á»£c', 'được'],
    ['Ä‘Æ¡n', 'đơn'],
    ['vá»‹', 'vị'],
    ['lÃ£i', 'lãi'],
    ['gÃ´p', 'gộp'],
    ['nháº­p', 'nhập'],
    ['tá»•ng', 'tổng'],
    ['chá»‘t', 'chốt'],
    ['hiá»‡n', 'hiện'],
    ['máº·t hÃ ng', 'mặt hàng'],
    ['mÃ³n', 'món'],
    ['nhiá»u nháº¥t', 'nhiều nhất'],
    ['hÃ´m nay', 'hôm nay'],
    ['hÃ´m qua', 'hôm qua'],
    ['tuáº§n nÃ y', 'tuần này'],
    ['thÃ¡ng nÃ y', 'tháng này'],
    ['Táº¡m tÃ­nh', 'Tạm tính'],
    ['hiá»‡n táº¡i', 'hiện tại'],
    ['chÆ°a', 'chưa'],
    ['khÃ´ng', 'không'],
    ['bÃ n', 'bàn'],
    ['Ä‘Ã£', 'đã'],
    ['Ä‘á»ƒ', 'để'],
    ['Ä‘', 'đ'],
    ['Ã¡', 'á'],
    ['Ã ', 'à'],
    ['Ã£', 'ã'],
    ['Ã¢', 'â'],
    ['Ãª', 'ê'],
    ['Ã´', 'ô'],
    ['Æ°', 'ư'],
    ['Æ¡', 'ơ'],
    ['Ã¹', 'ù'],
    ['Ãº', 'ú'],
    ['Ã²', 'ò'],
    ['Ã³', 'ó'],
    ['Ã¨', 'è'],
    ['Ã©', 'é'],
    ['Ã¬', 'ì'],
    ['Ã­', 'í'],
  ];
  dictionary.forEach(([bad, good]) => {
    str = str.split(bad).join(good);
  });

  return str.trim();
}

function toggleAIEngineLegacy() {
  const s = Store.getSettings();
  s.activeAIEngine = (s.activeAIEngine === 'gemma') ? 'gemini' : 'gemma';
  Store.setSettings(s);
  updateAIModeUILegacy();
  
  const engineBtn = document.getElementById('ai-engine-toggle');
  if(engineBtn) {
    if(s.activeAIEngine === 'gemma') {
      engineBtn.textContent = '🧠 Local AI';
      engineBtn.className = 'badge badge-info';
    } else {
      engineBtn.textContent = '⚡ Gemini';
      engineBtn.className = 'badge badge-primary';
    }
  }
}

function openAIAssistantLegacy() {
  const modal = document.getElementById('ai-modal');
  if(!modal) return;
  modal.classList.add('active');
  refreshAIServerStatus().then(() => {
    try { updateAIModeUILegacy(); } catch (_) {}
  });
  const s = Store.getSettings();
  const engineBtn = document.getElementById('ai-engine-toggle');
  if(engineBtn) {
    if(s.activeAIEngine === 'gemma') {
      engineBtn.textContent = '🧠 Local AI';
      engineBtn.className = 'badge badge-info';
    } else {
      engineBtn.textContent = '⚡ Gemini';
      engineBtn.className = 'badge badge-primary';
    }
  }

  updateAIModeUILegacy();
  updateAIOutputToggleUI();
  updateAIActiveDot(s.forceOffline ? 'offline' : 'idle');

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
        div.innerHTML = sanitizeAIHtml(repairVietnameseMojibakeV3(msg.content));
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
  updateAIModeUILegacy();
}

function updateAIModeUILegacy() {
  const s = Store.getSettings();
  const el = document.getElementById('ai-status-text');
  if(!el) return;
  const isGemma = (s.activeAIEngine === 'gemma');

  if (s.forceOffline) {
    el.innerHTML = '📴 Chế độ Offline (Nhanh)';
    el.style.background = 'var(--bg2)';
    el.style.color = 'var(--text2)';
    el.style.border = '1px solid var(--border)';
  } else {
    if(isGemma) {
      const hasUrl = !!s.gemmaEndpoint;
      el.innerHTML = hasUrl ? '🔌 Kết nối: Local DB' : '⚠️ Thiếu Endpoint Local';
      el.style.background = hasUrl ? 'rgba(0,149,255,0.1)' : 'rgba(239,68,68,0.1)';
      el.style.color = hasUrl ? 'var(--info)' : 'var(--danger)';
      el.style.border = hasUrl ? '1px solid rgba(0,149,255,0.3)' : '1px solid rgba(239,68,68,0.3)';
    } else {
      const onlineReady = navigator.onLine && aiServerOnline === true;
      el.innerHTML = onlineReady ? '🌐 Chế độ Online (AI Server)' : '📴 Offline NLP';
      el.style.background = onlineReady ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
      el.style.color = onlineReady ? 'var(--success)' : 'var(--danger)';
      el.style.border = onlineReady ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
    }
  }
}

function getAIServerBaseUrl() {
  const projectId = 'pos-v2-909ff';
  const region = 'asia-southeast1';
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

async function refreshAIServerStatus() {
  try {
    const res = await fetch(`${getAIServerBaseUrl()}/aiStatus`, { cache: 'no-store' });
    const data = await res.json();
    aiServerOnline = !!(res.ok && data?.ok);
  } catch (_) {
    aiServerOnline = false;
  }
  return aiServerOnline;
}

function updateAIActiveDot(state = 'idle') {
  const dot = document.getElementById('ai-active-dot');
  if (!dot) return;
  dot.style.display = 'block';
  if (state === 'processing') {
    dot.style.background = 'var(--warning)';
    dot.title = 'AI đang xử lý';
  } else if (state === 'offline') {
    dot.style.background = '#777';
    dot.title = 'AI offline';
  } else if (state === 'error') {
    dot.style.background = 'var(--danger)';
    dot.title = 'AI lỗi';
  } else {
    dot.style.background = 'var(--success)';
    dot.title = 'AI sẵn sàng';
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

function openAIConfirmModal(message) {
  const modal = document.getElementById('ai-confirm-modal');
  const body = document.getElementById('ai-confirm-message');
  if (!modal || !body) return Promise.resolve(confirm(String(message || 'Xác nhận thực thi lệnh AI?')));
  body.innerHTML = sanitizeAIHtml(repairVietnameseMojibakeV3(String(message || 'Xác nhận thực thi lệnh AI?')).replace(/\n/g, '<br>'));
  modal.classList.add('active');
  return new Promise(resolve => {
    aiConfirmResolver = resolve;
  });
}

function closeAIConfirmModal(confirmed) {
  const modal = document.getElementById('ai-confirm-modal');
  if (modal) modal.classList.remove('active');
  const resolver = aiConfirmResolver;
  aiConfirmResolver = null;
  if (resolver) resolver(!!confirmed);
}

function openFullAIHistory() {
  const history = Store.getAIHistory();
  const list = document.getElementById('ai-history-list');
  if(!list) return;
  
  list.innerHTML = history.length ? history.map(msg => `
    <div class="history-item">
      <div class="history-role ${msg.role}">${msg.role === 'user' ? '👤 Bạn' : '🤖 Trợ lý'}</div>
      <div class="history-content">${sanitizeAIHtml(repairVietnameseMojibakeV3(msg.content))}</div>
      <div class="history-time">${msg.time ? fmtDateTime(msg.time) : ''}</div>
    </div>
  `).reverse().join('') : '<div style="text-align:center;color:var(--text3);padding:20px">Chưa có lịch sử trò chuyện</div>';
  
  document.getElementById('ai-history-modal').classList.add('active');
}

function preprocessAIText(text) {
  let t = text.toLowerCase().trim();
  
  // === Fix Vietnamese speech recognition errors ===
  // "bàn" is frequently misrecognized as bà, bàng, bằng, bản, bận, bạn, ban
  // Pattern: misheard-word + number -> "bàn" + number
  t = t.replace(/\b(?:bà|bàng|bằng|bản|bận|bạn|ban)\s*((?:số\s*)?\d+)/gi, 'bàn $1');
  // "bà năm" -> "bàn 5", "bà ba" -> "bàn 3" etc.
  const wordToNum = {'một':1,'mốt':1,'hai':2,'ba':3,'bốn':4,'bón':4,'tư':4,'năm':5,'lăm':5,'sáu':6,'bảy':7,'bẩy':7,'tám':8,'chín':9,'mười':10,
    'mươi':10,'mười một':11,'mười hai':12,'mười ba':13,'mười bốn':14,'mười lăm':15,'mười sáu':16,'mười bảy':17,'mười tám':18,'mười chín':19,
    'hai mươi':20,'hai mốt':21,'hai hai':22,'hai ba':23,'hai tư':24,'hai lăm':25,'hai sáu':26,'hai bảy':27,'hai tám':28,'hai chín':29,'ba mươi':30,
    'ba mốt':31,'ba hai':32,'ba ba':33,'ba tư':34,'ba lăm':35,'ba sáu':36,'ba bảy':37,'ba tám':38,'ba chín':39,'bốn mươi':40,
    'bốn mốt':41,'bốn hai':42,'bốn ba':43,'bốn tư':44,'bốn lăm':45,'bốn sáu':46,'bốn bảy':47,'bốn tám':48,'bốn chín':49,'năm mươi':50};
  const wordNumEntries = Object.entries(wordToNum).sort((a, b) => b[0].length - a[0].length);
  for (const [word, num] of wordNumEntries) {
    // "bà năm" -> "bàn 5"
    t = t.replace(new RegExp(`\\b(?:bà|bàng|bằng|bản|bạn|ban)\\s+${word}\\b`, 'gi'), `bàn ${num}`);
  }
  // "bàn số năm" -> "bàn số 5" (after the above fix)
  for (const [word, num] of wordNumEntries) {
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
    'ngọt': 'sting',
    'sài gòn xanh': 'bia sài gòn special',
    'sài gòn đỏ': 'bia sài gòn export',
    'trà chanh': 'trà chanh sả',
    'nước suối': 'aquafina',
    'bò húc': 'redbull',
    'khoai tây': 'khoai tây chiên',
    'khoai lang': 'khoai lang kén',
    'hướng dương': 'hạt hướng dương',
    'khô gà': 'khô gà lá chanh',
    'khô bò': 'khô bò vắt chanh'
  };
  
  for (const [alias, realName] of Object.entries(aliases)) {
    const regex = new RegExp(`(^|\\s)${alias}(?=\\s|$)`, 'gi');
    t = t.replace(regex, `$1${realName}`);
  }
  return t;
}

function sanitizeAIHtml(input) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(input || '');

  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'SPAN', 'IMG']);

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode('');
    }

    const tag = (node.tagName || '').toUpperCase();
    if (!allowed.has(tag)) {
      return document.createTextNode(node.textContent || '');
    }

    if (tag === 'BR') return document.createElement('br');

    if (tag === 'IMG') {
      const src = String(node.getAttribute('src') || '').trim();
      const safeSrc = /^(data:image\/|https:\/\/)/i.test(src);
      if (!safeSrc) return document.createTextNode('');
      const img = document.createElement('img');
      img.setAttribute('src', src);
      img.setAttribute('alt', 'AI image');
      img.style.maxWidth = '200px';
      img.style.maxHeight = '150px';
      img.style.borderRadius = '8px';
      img.style.marginTop = '6px';
      img.style.display = 'block';
      return img;
    }

    const out = document.createElement(tag.toLowerCase());
    Array.from(node.childNodes).forEach((child) => out.appendChild(cleanNode(child)));
    return out;
  };

  const frag = document.createDocumentFragment();
  Array.from(tpl.content.childNodes).forEach((child) => frag.appendChild(cleanNode(child)));
  const wrap = document.createElement('div');
  wrap.appendChild(frag);
  return wrap.innerHTML;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { preprocessAIText };
}

function addAIBubble(text, role = 'bot') {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-bubble ai-bubble-${role}`;
  const normalizedText = role === 'user'
    ? String(text || '')
    : repairVietnameseMojibakeV3(text);
  div.innerHTML = sanitizeAIHtml(normalizedText);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  
  if (role !== 'thinking') {
    const history = Store.getAIHistory();
    history.push({ role, content: sanitizeAIHtml(normalizedText), time: new Date().toISOString() });
    if (history.length > 200) history.shift();
    Store.setAIHistory(history);
  }
  
  return div;
}

function addAIPendingActionBubble(pendingAction) {
  const container = document.getElementById('ai-chat-messages');
  if (!container || !pendingAction) return null;
  const div = document.createElement('div');
  div.className = 'ai-bubble ai-bubble-bot ai-pending-action';
  const message = repairVietnameseMojibakeV3(pendingAction.message || 'Cần xác nhận trước khi thực hiện thao tác này.');
  div.innerHTML = `
    <div>${sanitizeAIHtml(message)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button type="button" class="btn btn-success btn-sm ai-pending-confirm">✅ Xác nhận</button>
      <button type="button" class="btn btn-outline btn-sm ai-pending-cancel">❌ Hủy</button>
    </div>
  `;
  const confirmBtn = div.querySelector('.ai-pending-confirm');
  const cancelBtn = div.querySelector('.ai-pending-cancel');
  const setDisabled = (disabled) => {
    if (confirmBtn) confirmBtn.disabled = disabled;
    if (cancelBtn) cancelBtn.disabled = disabled;
  };
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      setDisabled(true);
      confirmBtn.textContent = 'Đang thực hiện...';
      try {
        if (typeof window.executePendingAIAction !== 'function') throw new Error('POS chưa nạp hàm xác nhận AI.');
        const result = await window.executePendingAIAction(pendingAction.action_type, pendingAction.payload || {});
        addAIBubble(result?.message || (result?.ok ? 'Đã thực hiện xong.' : 'Không thực hiện được.'), result?.ok ? 'bot' : 'error');
      } catch (err) {
        addAIBubble(`❌ Lỗi xác nhận: ${err.message || 'Không xác định'}`, 'error');
        setDisabled(false);
        confirmBtn.textContent = '✅ Xác nhận';
      }
    };
  }
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      setDisabled(true);
      addAIBubble('Đã hủy thao tác AI.', 'bot');
    };
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
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
    document.getElementById('ai-text-input').value = repairVietnameseMojibakeV3(text);
    sendAIText(true);
  };

  aiRecognition.onerror = (e) => {
    stopAIListening();
    const msgs = {
      'not-allowed': '🔒 Bạn chưa cho phép truy cập micro. Vào Cài đặt iPhone -> Safari -> Micro.',
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

// ------ Camera Capture legacy -> Vertex AI Server ------
async function handleAICameraCaptureLegacy(event) {
  const file = event.target.files[0];
  if(!file) return;

  // Show preview
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = String(e.target.result || '');
    const mimeType = file.type || 'image/jpeg';

    addAIBubble(`📷 <img src="${e.target.result}" style="max-width:200px;max-height:150px;border-radius:8px;margin-top:6px;display:block">`, 'user');

    const thinking = addAIBubble('⏳ Đang gửi ảnh lên Vertex AI Server...', 'thinking');
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

      const routed = await processAICommand(prompt, {
        imageBase64: dataUrl,
        mimeType,
      });
      removeThinkingBubble();

      const reply = typeof routed === 'string' ? routed : routed.reply;
      const intent = typeof routed === 'string' ? 'unknown' : (routed.intent || 'unknown');
      addAIBubble(reply || 'Không nhận diện được ảnh.', 'bot');
      recordAIMetric({ ok: true, engine: 'vertex-server', intent, latencyMs: 0 });
      if(aiOutputMode === 'voice') speakText(reply);
    } catch(err) {
      removeThinkingBubble();
      addAIBubble(`❌ Lỗi xử lý ảnh: ${err.message}`, 'error');
      recordAIMetric({ ok: false, engine: 'vertex-server', intent: 'error', latencyMs: 0 });
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function recordAIMetric(data) {
  try {
    const key = 'gkhl_ai_metrics_v1';
    const raw = localStorage.getItem(key);
    const m = raw ? JSON.parse(raw) : {
      total: 0,
      ok: 0,
      fail: 0,
      avgLatencyMs: 0,
      byEngine: { gemini: 0, deepseek: 0, gemma: 0, offline: 0 },
      byIntent: {},
      lastUpdatedAt: null
    };

    const latency = Math.max(0, Number(data.latencyMs) || 0);
    const ok = !!data.ok;
    const engine = ['gemini', 'deepseek', 'gemma', 'offline'].includes(data.engine) ? data.engine : 'offline';
    const intent = data.intent || 'unknown';
    const nextTotal = (m.total || 0) + 1;

    m.avgLatencyMs = Math.round((((m.avgLatencyMs || 0) * (nextTotal - 1)) + latency) / nextTotal);
    m.total = nextTotal;
    m.ok = (m.ok || 0) + (ok ? 1 : 0);
    m.fail = (m.fail || 0) + (ok ? 0 : 1);
    m.byEngine = m.byEngine || { gemini: 0, deepseek: 0, gemma: 0, offline: 0 };
    m.byEngine[engine] = (m.byEngine[engine] || 0) + 1;
    m.byIntent = m.byIntent || {};
    m.byIntent[intent] = (m.byIntent[intent] || 0) + 1;
    m.lastUpdatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(m));
    console.log('[Telemetry] AI Metrics Updated:', m);
  } catch (_) {}
}

function _isLowConfidenceAIReply(reply) {
  const t = String(reply || '').toLowerCase();
  if (!t) return true;
  return (
    t.includes('em chua hieu') ||
    t.includes('khong nhan ra lenh') ||
    t.includes('khong xac dinh') ||
    t.includes('khong tim thay') ||
    t.includes('thu noi ro hon')
  );
}

function recordAILearningEvent(payload) {
  try {
    if (!window.DB?.logAction) return;
    const input = String(payload?.input || '').slice(0, 240);
    const output = String(payload?.output || '').replace(/<[^>]+>/g, '').slice(0, 400);
    const data = {
      channel: 'ai_chat',
      stage: payload?.stage || 'reply',
      ok: !!payload?.ok,
      lowConfidence: !!payload?.lowConfidence,
      engine: String(payload?.engine || 'unknown'),
      intent: String(payload?.intent || 'unknown'),
      latencyMs: Number(payload?.latencyMs || 0),
      input,
      output,
      ts: new Date().toISOString(),
    };
    Promise.resolve(window.DB.logAction('ai_learning_event', data)).catch(() => {});
  } catch (_) {}
}

// ------ Text send ------
function sendAITextGeminiLegacy(isVoice = false) {
  const inp = document.getElementById('ai-text-input');
  const rawText = inp ? repairVietnameseMojibakeV3(inp.value.trim()) : '';
  if (!rawText) return;
  if (inp) inp.value = '';
  
  addAIBubble(rawText, 'user');
  const text = preprocessAIText(rawText);

  const isOnline = navigator.onLine;
  const s = Store.getSettings();
  const hasDeepSeek = !!s.deepseekApiKey;
  const hasVertexServer = isOnline;
  const hasAnyCloud = hasVertexServer || hasDeepSeek;
  const startTs = Date.now();
  const activeEngine = s.forceOffline
    ? 'offline'
    : (s.activeAIEngine === 'gemma'
      ? 'gemma'
      : ((isOnline && hasAnyCloud) ? (hasVertexServer ? 'vertex-server' : 'deepseek') : 'offline'));

  const modeLabel = (!s.forceOffline && isOnline && hasAnyCloud)
    ? `🌐 ${hasVertexServer ? 'Vertex' : 'DeepSeek'} AI`
    : '📱 Offline Engine';
  const thinking = addAIBubble(`⏳ Đang xử lý... <span style="font-size:11px;opacity:0.7">${modeLabel}</span>`, 'thinking');
  if (thinking) thinking.id = 'ai-thinking-bubble';
  updateAIActiveDot('processing');

  processAICommand(text).then(result => {
    const reply = typeof result === 'string' ? result : result.reply;
    const intent = typeof result === 'string' ? 'unknown' : result.intent;
    removeThinkingBubble();
    addAIBubble(reply, 'bot');
    if (result && result.pendingAction) addAIPendingActionBubble(result.pendingAction);
    const latencyMs = Date.now() - startTs;
    recordAIMetric({ ok: true, engine: activeEngine, intent: intent, latencyMs: latencyMs });
    recordAILearningEvent({
      stage: 'reply',
      ok: true,
      lowConfidence: _isLowConfidenceAIReply(reply),
      engine: activeEngine,
      intent,
      latencyMs,
      input: rawText,
      output: reply,
    });
    updateAIActiveDot(activeEngine === 'offline' ? 'offline' : 'idle');
    const latEl = document.getElementById('ai-latency-text');
    if (latEl) latEl.textContent = `⏱️ ${(latencyMs/1000).toFixed(2)}s - Engine: ${activeEngine}`;
    // Auto speak if voice input OR output mode is voice
    if (isVoice || aiOutputMode === 'voice') speakText(reply);
  }).catch(err => {
    removeThinkingBubble();
    const latencyMs = Date.now() - startTs;
    addAIBubble(`❌ Lỗi: ${err.message || 'Không xác định'}`, 'error');
    recordAIMetric({ ok: false, engine: activeEngine, intent: 'error', latencyMs: latencyMs });
    recordAILearningEvent({
      stage: 'error',
      ok: false,
      lowConfidence: true,
      engine: activeEngine,
      intent: 'error',
      latencyMs,
      input: rawText,
      output: err?.message || 'unknown_error',
    });
    updateAIActiveDot('error');
    const latEl = document.getElementById('ai-latency-text');
    if (latEl) latEl.textContent = `❌ ${(latencyMs/1000).toFixed(2)}s - Engine: ${activeEngine}`;
  });
}

// ------ TTS: Google Cloud TTS (premium) + SpeechSynthesis (fallback) ------
async function speakText(text) {
  if (!text) return;
  const plain = repairVietnameseMojibakeV3(text).replace(/<[^>]+>/g, '').replace(/[🎤🤖👋✅⚠️❌📉🛵🏦💵📷📅📆🔊📝]/gu, '').trim();
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

if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.getVoices();

// Chatbot policy override: only Offline NLP + Vertex AI Server.
function toggleAIEngine() {
  const s = Store.getSettings();
  s.activeAIEngine = 'vertex';
  Store.setSettings(s);
  const engineBtn = document.getElementById('ai-engine-toggle');
  if (engineBtn) {
    engineBtn.textContent = 'Offline NLP + Vertex AI Server';
    engineBtn.className = 'badge badge-info';
  }
  updateAIModeUI();
}

function updateAIModeUI() {
  const s = Store.getSettings();
  const el = document.getElementById('ai-status-text');
  if (!el) return;

  if (s.forceOffline) {
    el.innerHTML = '📴 Offline NLP';
    el.style.background = 'var(--bg2)';
    el.style.color = 'var(--text2)';
    el.style.border = '1px solid var(--border)';
    return;
  }

  const onlineReady = navigator.onLine && aiServerOnline === true;
  el.innerHTML = onlineReady ? '🌐 AI Server Online' : '📴 Offline NLP';
  el.style.background = onlineReady ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
  el.style.color = onlineReady ? 'var(--success)' : 'var(--danger)';
  el.style.border = onlineReady ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
}

function readAIFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Không đọc được file.'));
    reader.readAsDataURL(file);
  });
}

async function handleAICameraCapture(event) {
  const input = event && event.target;
  const file = input?.files?.[0] || null;
  if (!file) {
    const picker = document.getElementById('ai-camera-input');
    if (picker) picker.click();
    return;
  }

  const startTs = Date.now();
  try {
    const dataUrl = await readAIFileAsDataUrl(file);
    const isAudio = /^audio\//i.test(file.type || '');
    const isImage = /^image\//i.test(file.type || '');
    addAIBubble(isImage
      ? `📎 Ảnh đính kèm <img src="${dataUrl}" style="max-width:200px;max-height:150px;border-radius:8px;margin-top:6px;display:block">`
      : `📎 File âm thanh: ${sanitizeAIHtml(file.name || 'audio')}`, 'user');

    const thinking = addAIBubble('⏳ Đang gửi file lên Vertex AI Server...', 'thinking');
    if (thinking) thinking.id = 'ai-thinking-bubble';
    updateAIActiveDot('processing');

    const result = await processAICommand('Hãy phân tích file đính kèm này và dùng tool phù hợp nếu cần.', {
      imageBase64: isImage ? dataUrl : '',
      audioBase64: isAudio ? dataUrl : '',
      mimeType: file.type || (isAudio ? 'audio/webm' : 'image/jpeg'),
    });
    removeThinkingBubble();
    const reply = typeof result === 'string' ? result : result.reply;
    addAIBubble(reply, 'bot');
    if (result?.pendingAction) addAIPendingActionBubble(result.pendingAction);
    recordAIMetric({ ok: true, engine: result?.engine || 'vertex-server', intent: result?.intent || 'media', latencyMs: Date.now() - startTs });
    updateAIActiveDot('idle');
  } catch (err) {
    removeThinkingBubble();
    addAIBubble(`❌ Lỗi xử lý file: ${err.message || 'Không xác định'}`, 'error');
    updateAIActiveDot('error');
  } finally {
    if (input) input.value = '';
  }
}

function openAIAssistant() {
  const modal = document.getElementById('ai-modal');
  if (!modal) return;
  modal.classList.add('active');

  const engineBtn = document.getElementById('ai-engine-toggle');
  if (engineBtn) {
    engineBtn.textContent = 'Offline NLP + Vertex AI Server';
    engineBtn.className = 'badge badge-info';
  }

  updateAIModeUI();
  updateAIOutputToggleUI();
  const s = Store.getSettings();
  updateAIActiveDot(s.forceOffline ? 'offline' : 'idle');

  if (!aiChatHistoryLoaded) {
    const history = Store.getAIHistory();
    const container = document.getElementById('ai-chat-messages');
    const welcomeMsg = document.getElementById('ai-welcome-msg');

    if (history.length > 0 && container) {
      container.innerHTML = '';
      if (welcomeMsg) container.appendChild(welcomeMsg);
      history.slice(-10).forEach(msg => {
        const div = document.createElement('div');
        div.className = `ai-bubble ai-bubble-${msg.role}`;
        div.innerHTML = sanitizeAIHtml(repairVietnameseMojibakeV3(msg.content));
        container.appendChild(div);
      });
      container.scrollTop = container.scrollHeight;
    }
    aiChatHistoryLoaded = true;
  }
}

function sendAIText(isVoice = false) {
  const inp = document.getElementById('ai-text-input');
  const rawText = inp ? repairVietnameseMojibakeV3(inp.value.trim()) : '';
  if (!rawText) return;
  if (inp) inp.value = '';

  addAIBubble(rawText, 'user');
  const text = preprocessAIText(rawText);

  const isOnline = navigator.onLine;
  const s = Store.getSettings();
  const startTs = Date.now();
  const activeEngine = s.forceOffline ? 'offline' : (isOnline ? 'vertex-server' : 'offline');
  const modeLabel = (!s.forceOffline && isOnline) ? '🌐 Vertex AI Server' : '📱 Offline NLP';

  const thinking = addAIBubble(`⏳ Đang xử lý... <span style="font-size:11px;opacity:0.7">${modeLabel}</span>`, 'thinking');
  if (thinking) thinking.id = 'ai-thinking-bubble';
  updateAIActiveDot('processing');

  processAICommand(text).then(result => {
    const reply = typeof result === 'string' ? result : result.reply;
    const intent = typeof result === 'string' ? 'unknown' : result.intent;
    const resultEngine = typeof result === 'string' ? activeEngine : (result.engine || activeEngine);
    removeThinkingBubble();
    addAIBubble(reply, 'bot');
    if (result && result.pendingAction) addAIPendingActionBubble(result.pendingAction);
    const latencyMs = Date.now() - startTs;
    recordAIMetric({ ok: true, engine: resultEngine, intent, latencyMs });
    updateAIActiveDot(resultEngine === 'offline' ? 'offline' : 'idle');
    const latEl = document.getElementById('ai-latency-text');
    if (latEl) latEl.textContent = `⏱️ ${(latencyMs / 1000).toFixed(2)}s - Engine: ${resultEngine}`;
    if (isVoice || aiOutputMode === 'voice') speakText(reply);
  }).catch(err => {
    removeThinkingBubble();
    const latencyMs = Date.now() - startTs;
    addAIBubble(`❌ Lỗi: ${err.message || 'Không xác định'}`, 'error');
    recordAIMetric({ ok: false, engine: activeEngine, intent: 'error', latencyMs });
    updateAIActiveDot('error');
    const latEl = document.getElementById('ai-latency-text');
    if (latEl) latEl.textContent = `❌ ${(latencyMs / 1000).toFixed(2)}s - Engine: ${activeEngine}`;
  });
}
