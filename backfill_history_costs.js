const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { loadServiceAccount } = require('./loadServiceAccount');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) process.env[key] = value;
  });
}

function getTimeZoneDateKey(date = new Date(), timeZone = 'Asia/Ho_Chi_Minh') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function slugVi(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeUnitLabel(unit) {
  const raw = String(unit || '').trim();
  if (!raw) return 'Phan';
  const key = slugVi(raw);
  if (key.includes('ph') && key.includes('n')) return 'Phan';
  if (key.includes('mi') && key.includes('ng')) return 'Mieng';
  const map = {
    phan: 'Phan',
    portion: 'Phan',
    lon: 'Lon',
    chai: 'Chai',
    ly: 'Ly',
    kg: 'Kg',
    kilogram: 'Kg',
    gram: 'Gram',
    gam: 'Gram',
    mieng: 'Mieng',
    piece: 'Mieng',
    con: 'Con',
  };
  return map[key] || raw;
}

function inferMenuItemType(item = {}) {
  if (item.itemType === 'retail_item' || item.itemType === 'finished_good') return item.itemType;
  return Array.isArray(item.ingredients) && item.ingredients.length > 0 ? 'finished_good' : 'retail_item';
}

function normalizeInventoryItem(row = {}) {
  return {
    id: String(row.inv_id || row.id || row._docId || '').trim(),
    name: String(row.material_name || row.name || row.id || '').trim(),
    unit: normalizeUnitLabel(row.base_unit || row.unit),
    itemType: String(row.itemType || row.inv_type || '').toLowerCase() === 'retail' ? 'retail_item' : 'raw_material',
    qty: Number(row.current_stock ?? row.qty ?? 0) || 0,
    minQty: Number(row.min_alert ?? row.minQty ?? 0) || 0,
    costPerUnit: Number(row.costPerUnit ?? row.cost_per_unit ?? 0) || 0,
    hidden: !!row.hidden,
  };
}

function buildInventoryViewFromMaster(rows = []) {
  return rows
    .map(normalizeInventoryItem)
    .filter((item) => item.id);
}

function buildMenuViewFromMaster(products = [], inventoryRows = [], recipes = []) {
  const inventoryById = new Map(inventoryRows.map((item) => [String(item.id), item]));
  const recipeMap = new Map();

  recipes.forEach((recipe) => {
    const parentId = String(recipe.parent_item_id || '').trim();
    if (!parentId) return;
    if (!recipeMap.has(parentId)) recipeMap.set(parentId, []);
    recipeMap.get(parentId).push(recipe);
  });

  return products
    .map((product) => {
      const id = String(product.item_id || product.id || product._docId || '').trim();
      if (!id) return null;

      const itemType = String(product.itemType || '').trim()
        || (String(product.item_type || '').toLowerCase() === 'retail' ? 'retail_item' : 'finished_good');
      const bomLines = recipeMap.get(id) || [];
      const ingredients = itemType === 'finished_good'
        ? bomLines.map((line) => {
            const inventoryItem = inventoryById.get(String(line.ingredient_inv_id || ''));
            if (!inventoryItem) return null;
            return {
              name: inventoryItem.name,
              qty: Number(line.quantity_needed ?? line.qty ?? 0) || 0,
              unit: inventoryItem.unit || normalizeUnitLabel(line.unit),
            };
          }).filter(Boolean)
        : [];
      const linkedInventory = itemType === 'retail_item'
        ? inventoryById.get(String(product.linkedInventoryId || bomLines[0]?.ingredient_inv_id || '')) || null
        : null;

      return {
        id,
        name: String(product.display_name || product.name || id).trim(),
        category: String(product.category || 'Khac').trim(),
        price: Number(product.sell_price ?? product.price ?? 0) || 0,
        unit: normalizeUnitLabel(product.unit || (linkedInventory ? linkedInventory.unit : 'phan')),
        cost: Number(product.cost ?? 0) || 0,
        itemType: inferMenuItemType({
          itemType,
          ingredients,
        }),
        linkedInventoryId: itemType === 'retail_item' ? (linkedInventory?.id || null) : null,
        ingredients,
      };
    })
    .filter(Boolean);
}

function resolveDishCostPerUnit(dish, inventoryList) {
  if (!dish) return 0;
  const inventory = Array.isArray(inventoryList) ? inventoryList : [];
  let dishCost = Number(dish.cost || 0) || 0;

  if (dish.itemType === 'retail_item') {
    const linked = inventory.find((item) => item.id === dish.linkedInventoryId)
      || inventory.find((item) => slugVi(item.name) === slugVi(dish.name));
    return Number(linked?.costPerUnit || dishCost || 0);
  }

  if (Array.isArray(dish.ingredients) && dish.ingredients.length > 0) {
    dishCost = dish.ingredients.reduce((sum, ingredient) => {
      const stock = inventory.find((item) => item.name === ingredient.name);
      return sum + ((Number(stock?.costPerUnit || 0) || 0) * (Number(ingredient.qty || 0) || 0));
    }, 0);
  }

  return Number(dishCost || 0);
}

function stripKnownMenuPrefixes(key) {
  return String(key || '')
    .replace(/^(bia|ruou)\s+/i, '')
    .trim();
}

function findCurrentMenuMatch(item = {}, menuById, menuByName, menuList = []) {
  const itemId = String(item?.id || '').trim();
  const itemName = String(item?.name || '').trim();
  const itemKey = slugVi(itemName);
  if (itemId && menuById.get(itemId)) return menuById.get(itemId);
  if (itemKey && menuByName.get(itemKey)) return menuByName.get(itemKey);
  if (!itemKey) return null;

  const strippedItemKey = stripKnownMenuPrefixes(itemKey);
  const fuzzy = menuList.find((menuItem) => {
    const menuKey = slugVi(menuItem?.name || '');
    if (!menuKey) return false;
    if (menuKey.startsWith(`${itemKey} `)) return true;
    const strippedMenuKey = stripKnownMenuPrefixes(menuKey);
    if (strippedMenuKey === itemKey) return true;
    if (strippedMenuKey === strippedItemKey) return true;
    if (menuKey.startsWith(`${strippedItemKey} `) && strippedItemKey) return true;
    return false;
  });
  return fuzzy || null;
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value._seconds === 'number') return (value._seconds * 1000) + Math.floor((value._nanoseconds || 0) / 1e6);
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function getDateKey(value) {
  const millis = toMillis(value);
  if (!millis) return '';
  return new Date(millis).toISOString().slice(0, 10);
}

function roundMoney(value) {
  const num = Number(value || 0) || 0;
  return Math.round(num * 1000) / 1000;
}

function formatMoney(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}d`;
}

function parseArgs(argv = []) {
  const options = {
    write: false,
    before: getTimeZoneDateKey(new Date()),
    limit: 0,
    verbose: false,
    adc: false,
    projectId: 'pos-v2-909ff',
  };

  argv.forEach((arg) => {
    if (arg === '--write') options.write = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--adc') options.adc = true;
    else if (arg.startsWith('--before=')) options.before = arg.slice('--before='.length).trim();
    else if (arg.startsWith('--limit=')) options.limit = Math.max(0, Number(arg.slice('--limit='.length)) || 0);
    else if (arg.startsWith('--project=')) options.projectId = arg.slice('--project='.length).trim();
  });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.before)) {
    throw new Error(`Invalid --before date: ${options.before}`);
  }

  return options;
}

function buildOrderPatch(order, menuById, menuByName, menuList, inventory, fallbackAverageCost) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const fallbackItems = [];
  let changed = false;

  const nextItems = items.map((item) => {
    const menuItem = findCurrentMenuMatch(item, menuById, menuByName, menuList);
    let nextUnitCost = 0;
    let costSource = 'menu_current';
    if (menuItem) {
      nextUnitCost = roundMoney(resolveDishCostPerUnit(menuItem, inventory));
    } else {
      nextUnitCost = roundMoney(fallbackAverageCost);
      costSource = 'menu_average_fallback';
      fallbackItems.push(String(item?.name || item?.id || 'unknown'));
    }

    const prevUnitCost = roundMoney(Number(item?.cost || 0) || 0);
    if (Math.abs(nextUnitCost - prevUnitCost) > 0.0001) changed = true;
    return {
      ...item,
      cost: nextUnitCost,
      costBackfillSource: costSource,
    };
  });

  const nextOrderCost = roundMoney(nextItems.reduce((sum, item) => {
    return sum + ((Number(item?.cost || 0) || 0) * (Number(item?.qty || 0) || 0));
  }, 0));
  const prevOrderCost = roundMoney(Number(order?.cost || 0) || 0);
  if (Math.abs(nextOrderCost - prevOrderCost) > 0.0001) changed = true;

  return {
    changed,
    fallbackItems,
    nextItems,
    prevOrderCost,
    nextOrderCost,
  };
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  const serviceAccount = loadServiceAccount(__dirname);
  const shouldUseServiceAccount = !!serviceAccount
    && !options.adc
    && (!options.projectId || String(serviceAccount.project_id || '').trim() === options.projectId);
  const credential = shouldUseServiceAccount
    ? admin.credential.cert(serviceAccount)
    : admin.credential.applicationDefault();

  if (!serviceAccount && !options.adc) {
    console.warn('No local service account found. Falling back to Application Default Credentials.');
  }
  if (serviceAccount && !shouldUseServiceAccount) {
    console.warn(`Local service account project (${serviceAccount.project_id || 'unknown'}) does not match target project (${options.projectId}). Using Application Default Credentials instead.`);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential,
      projectId: options.projectId,
    });
  }
  const db = admin.firestore();

  console.log(`Mode: ${options.write ? 'WRITE' : 'DRY-RUN'}`);
  console.log(`Rewrite all history before: ${options.before}`);
  if (options.limit > 0) console.log(`Limit: ${options.limit} docs`);

  const [productSnap, inventorySnap, recipeSnap, historySnap] = await Promise.all([
    db.collection('Product_Catalog').get(),
    db.collection('Inventory_Items').get(),
    db.collection('Recipes_BOM').get(),
    db.collection('history').get(),
  ]);

  const inventory = buildInventoryViewFromMaster(inventorySnap.docs.map((doc) => ({ _docId: doc.id, ...doc.data() })));
  const menu = buildMenuViewFromMaster(
    productSnap.docs.map((doc) => ({ _docId: doc.id, ...doc.data() })),
    inventory,
    recipeSnap.docs.map((doc) => ({ _docId: doc.id, ...doc.data() })),
  );
  const activeMenu = menu.filter((item) => !item.hidden);
  const menuById = new Map(activeMenu.map((item) => [String(item.id), item]));
  const menuByName = new Map(activeMenu.map((item) => [slugVi(item.name), item]));
  const activeMenuCosts = activeMenu
    .map((item) => roundMoney(resolveDishCostPerUnit(item, inventory)))
    .filter((cost) => cost > 0);
  const fallbackAverageCost = activeMenuCosts.length
    ? roundMoney(activeMenuCosts.reduce((sum, cost) => sum + cost, 0) / activeMenuCosts.length)
    : 0;

  const historyDocs = historySnap.docs
    .filter((doc) => {
      const data = doc.data() || {};
      const paidDate = getDateKey(data.paidAt);
      if (!paidDate || paidDate >= options.before) return false;
      if (String(data.status || '').trim().toLowerCase() === 'cancelled') return false;
      return Array.isArray(data.items) && data.items.length > 0;
    })
    .sort((a, b) => {
      const aTime = toMillis((a.data() || {}).paidAt) || 0;
      const bTime = toMillis((b.data() || {}).paidAt) || 0;
      return aTime - bTime;
    });

  const scopedDocs = options.limit > 0 ? historyDocs.slice(0, options.limit) : historyDocs;
  const changes = [];
  const fallbackSummary = new Map();
  let scanned = 0;
  let changedCount = 0;
  let oldCostTotal = 0;
  let newCostTotal = 0;

  scopedDocs.forEach((doc) => {
    scanned += 1;
    const data = doc.data() || {};
    const patch = buildOrderPatch(data, menuById, menuByName, activeMenu, inventory, fallbackAverageCost);
    oldCostTotal += patch.prevOrderCost;
    newCostTotal += patch.nextOrderCost;
    patch.fallbackItems.forEach((name) => {
      fallbackSummary.set(name, (fallbackSummary.get(name) || 0) + 1);
    });
    if (!patch.changed) return;
    changedCount += 1;
    changes.push({
      docId: doc.id,
      orderId: data.id || doc.id,
      paidAt: data.paidAt || null,
      prevOrderCost: patch.prevOrderCost,
      nextOrderCost: patch.nextOrderCost,
      delta: roundMoney(patch.nextOrderCost - patch.prevOrderCost),
      nextItems: patch.nextItems,
      fallbackItems: patch.fallbackItems,
    });
  });

  console.log(`Menu items loaded: ${menu.length}`);
  console.log(`Active menu items used for backfill: ${activeMenu.length}`);
  console.log(`Inventory items loaded: ${inventory.length}`);
  console.log(`Average current menu cost fallback: ${formatMoney(fallbackAverageCost)}`);
  console.log(`History docs eligible: ${scopedDocs.length}`);
  console.log(`History docs changed: ${changedCount}`);
  console.log(`Old total cost: ${formatMoney(oldCostTotal)}`);
  console.log(`New total cost: ${formatMoney(newCostTotal)}`);
  console.log(`Delta total cost: ${formatMoney(newCostTotal - oldCostTotal)}`);

  const fallbackTop = Array.from(fallbackSummary.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  if (fallbackTop.length) {
    console.log('Top item names using average-menu fallback:');
    fallbackTop.forEach(([name, count]) => {
      console.log(`- ${name}: ${count}`);
    });
  }

  const sample = changes.slice(0, 12).map((change) => ({
    orderId: change.orderId,
    paidAt: change.paidAt,
    prevOrderCost: change.prevOrderCost,
    nextOrderCost: change.nextOrderCost,
    delta: change.delta,
    fallbackItems: change.fallbackItems,
  }));
  if (sample.length) {
    console.log('Sample changes:');
    console.log(JSON.stringify(sample, null, 2));
  }

  if (!options.write) {
    console.log('Dry-run only. Re-run with --write to persist changes.');
    return;
  }

  let batch = db.batch();
  let batchOps = 0;
  let committed = 0;

  for (const change of changes) {
    const ref = db.collection('history').doc(change.docId);
    batch.update(ref, {
      items: change.nextItems,
      cost: change.nextOrderCost,
      costBackfillMode: 'current_cost_rewrite',
      costBackfillCutoffDate: options.before,
      costBackfillWrittenAt: admin.firestore.FieldValue.serverTimestamp(),
      costBackfillAverageMenuCost: fallbackAverageCost,
      costBackfillFallbackCount: change.fallbackItems.length,
    });
    batchOps += 1;

    if (batchOps >= 300) {
      await batch.commit();
      committed += batchOps;
      if (options.verbose) console.log(`Committed ${committed}/${changes.length}`);
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
    committed += batchOps;
  }

  console.log(`Write complete. Updated ${committed} history docs.`);
}

main().catch((error) => {
  console.error('[backfill_history_costs] failed:', error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
