const fs = require('fs');

let appJs = fs.readFileSync('d:/APP POS/app.js', 'utf8');

// 1. Update build purchase view
appJs = appJs.replace(
  `let subInfo = \`\${p.qty} \${p.unit} · \${p.supplier} · \${fmtDate(p.date)}\`;`,
  `let subInfo = \`\${p.qty} \${p.unit} · \${p.supplier} · \${fmtDate(p.date)}\`;
    if (p.supplierPhone) subInfo += \`<br><small style="color:var(--text3)">ĐT: \${p.supplierPhone} \${p.supplierAddress ? '- ' + p.supplierAddress : ''}</small>\`;`
);

appJs = appJs.replace(
  `        <div class="list-item-sub">\${p.qty} \${p.unit} · \${p.supplier} · \${fmtDate(p.date)}</div>`,
  `        <div class="list-item-sub">\${subInfo}</div>`
);

appJs = appJs.replace(
  `        <div class="list-item-sub">\${p.qty} \${p.unit} · \${p.supplier} · \${fmtDate(p.date)}</div>`, 
  `        <div class="list-item-sub">\${subInfo}</div>`
);


// 2. Update submitPurchase
appJs = appJs.replace(
  /const supplier = document.getElementById\('pur-supplier'\).value.trim\(\) \|\| 'Không rõ';/,
  `const supplierName = document.getElementById('pur-supplier').value.trim() || 'Không rõ';
  const supplierPhone = document.getElementById('pur-supplier-phone').value.trim() || '';
  const supplierAddr = document.getElementById('pur-supplier-addr').value.trim() || '';`
);

appJs = appJs.replace(
  /let item = inv.find\(i => i\.name\.toLowerCase\(\) === name\.toLowerCase\(\)\);\n  if\(item\) {\n    item\.qty \+= qty;\n    item\.costPerUnit = price\/qty;\n  } else {\n    inv\.push\({ id:uid\(\), name, qty, unit:'phần', minQty:5, costPerUnit:price\/qty }\);\n  }\n  Store\.setInventory\(inv\);\n\n  Store\.addPurchase\({ id:uid\(\), name, qty, unit:item\?\.unit\|\|'phần', price, costPerUnit:price\/qty, date:new Date\(\)\.toISOString\(\), supplier }\);/,
  `let item = inv.find(i => i.name.toLowerCase() === name.toLowerCase());
  if(item) {
    item.qty += qty;
    item.costPerUnit = price/qty;
  } else {
    item = { id:uid(), name, qty, unit:'phần', minQty:5, costPerUnit:price/qty };
    inv.push(item);
  }
  Store.setInventory(inv);

  Store.addPurchase({ id:uid(), name, qty, unit:item.unit, price, costPerUnit:price/qty, date:new Date().toISOString(), supplier: supplierName, supplierPhone, supplierAddress: supplierAddr });`
);


// 3. Update Inventory display & edit logic
appJs = appJs.replace(
  `<div style="display:flex;gap:4px;margin-top:4px">
          <button class="btn btn-xs btn-outline" onclick="quickAddStock('\${i.id}')">+</button>`,
  `<div style="font-size:11px;color:var(--text2);margin-top:2px">Giá vốn: \${fmt(i.costPerUnit||0)}đ</div>
        <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
          <button class="btn btn-xs btn-outline" onclick="quickAddStock('\${i.id}')">+</button>`
);


appJs = appJs.replace(
  /function editInvItem\(invId\) {\n  const inv = Store\.getInventory\(\);\n  const item = inv\.find\(i => i\.id === invId\);\n  if\(!item\) return;\n  const newQty = parseFloat\(prompt\(`Sửa tồn kho "\\\${item\.name}" \(hiện: \\\${item\.qty} \\\${item\.unit}\)`, item\.qty\)\);\n  if\(isNaN\(newQty\) \|\| newQty < 0\) return;\n  item\.qty = newQty;\n  Store\.setInventory\(inv\);\n  renderInventory\(\);\n  showToast\('✅ Đã cập nhật tồn kho'\);\n}/,
  `function editInvItem(invId) {
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
}`
);


// 4. Update order cost calculation in bill modal
appJs = appJs.replace(
  /const cost  = items.reduce\(\(s,i\) => s \+ \(i\.cost\|\|0\)\*i\.qty, 0\);/,
  `// Dynamically calculate cost based on current inventory
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
  });`
);

// 5. Menu Admin logic
appJs = appJs.replace(
  /<div class="list-item-title">\${m\.name}<\/div>/,
  `<div class="list-item-title">\${m.name} <span style="font-size:11px;color:var(--text3);font-weight:normal">(\${m.unit || 'phần'})</span></div>`
);
appJs = appJs.replace(
  /<div class="list-item-sub">\${m\.category} · Giá vốn: \${fmt\(m\.cost\|\|0\)}đ<\/div>/,
  `<div class="list-item-sub">\${m.category} · Giá vốn: \${fmt(m.cost||0)}đ \${m.ingredients?.length ? \`· 🧪 \${m.ingredients.length} NL\` : ''}</div>`
);

appJs = appJs.replace(
  /document\.getElementById\('menu-item-name'\)\.value = dish\?\.name \|\| '';\n  document\.getElementById\('menu-item-price'\)\.value = dish\?\.price \|\| '';/,
  `document.getElementById('menu-item-name').value = dish?.name || '';
  document.getElementById('menu-item-unit').value = dish?.unit || 'phần';
  document.getElementById('menu-item-price').value = dish?.price || '';`
);

appJs = appJs.replace(
  /document\.getElementById\('menu-item-category'\)\.value = dish\?\.category \|\| CATEGORIES\[0\];\n  document\.getElementById\('menu-modal'\)\.classList\.add\('active'\);/,
  `document.getElementById('menu-item-category').value = dish?.category || CATEGORIES[0];
  
  const list = document.getElementById('menu-ingredients-list');
  list.innerHTML = '';
  if (dish && dish.ingredients && dish.ingredients.length > 0) {
    dish.ingredients.forEach(ing => addIngredientRow(ing.name, ing.qty));
  } else {
    // addIngredientRow(); // Add an empty row by default
  }
  
  document.getElementById('menu-modal').classList.add('active');`
);


appJs = appJs.replace(
  /const category = document\.getElementById\('menu-item-category'\)\.value;\n  if\(!name \|\| isNaN\(price\)\) return;\n\n  if\(id\) {\n    const idx = menu\.findIndex\(m => m\.id === id\);\n    if\(idx >= 0\) { menu\[idx\] = {\.\.\.menu\[idx\], name, price, cost, category}; }\n  } else {\n    menu\.push\(\{ id:uid\(\), name, price, cost, category, unit:'phần', ingredients:\[\] \}\);\n  }/,
  `const category = document.getElementById('menu-item-category').value;
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
    if(idx >= 0) { menu[idx] = {...menu[idx], name, unit, price, cost, category, ingredients}; }
  } else {
    menu.push({ id:uid(), name, unit, price, cost, category, ingredients });
  }`
);

const newIngredientCode = `
function addIngredientRow(name='', qty='') {
  const inv = Store.getInventory();
  // Filter inventory list to generate options
  const options = inv.map(i => \`<option value="\${i.name}" data-cost="\${i.costPerUnit}">\${i.name} (\${i.unit})\</option>\`).join('');
  
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.innerHTML = \`
    <select class="select ing-name-sel" style="flex:2" onchange="recalcMenuCost()">
      <option value="">-- Chọn NL --</option>
      \${options}
    </select>
    <input type="number" class="input ing-qty-val" placeholder="SL" value="\${qty}" style="flex:1" step="0.01" oninput="recalcMenuCost()">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove(); recalcMenuCost()">✕</button>
  \`;
  document.getElementById('menu-ingredients-list').appendChild(div);
  
  if (name) {
    const sel = div.querySelector('.ing-name-sel');
    sel.value = name;
  }
}

function recalcMenuCost() {
  const inv = Store.getInventory();
  let totalCost = 0;
  document.querySelectorAll('#menu-ingredients-list > div').forEach(row => {
    const name = row.querySelector('.ing-name-sel').value;
    const qty = parseFloat(row.querySelector('.ing-qty-val').value) || 0;
    if (name && qty > 0) {
      const stock = inv.find(i => i.name === name);
      if (stock) totalCost += stock.costPerUnit * qty;
    }
  });
  if (totalCost > 0) {
    document.getElementById('menu-item-cost').value = Math.round(totalCost);
  }
}

// ============================================================
// TOAST
`
appJs = appJs.replace(`// ============================================================
// TOAST`, newIngredientCode);

fs.writeFileSync('d:/APP POS/app.js', appJs);
console.log('patched successfully');
