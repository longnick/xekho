const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadServiceAccount() {
  const directPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(directPath)) return require(directPath);

  const fallback = fs.readdirSync(__dirname).find(name =>
    /^.+-firebase-adminsdk-[^.]+\.json$/i.test(name)
  );
  if (!fallback) {
    throw new Error('Không tìm thấy file service account trong thư mục project.');
  }
  return require(path.join(__dirname, fallback));
}

const serviceAccount = loadServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const ITEM_TYPES = {
  RETAIL: 'retail_item',
  RAW: 'raw_material',
  FINISHED: 'finished_good',
};

function normalizeViKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mapInventoryUnit(baseUnit) {
  const key = normalizeViKey(baseUnit);
  const unitMap = {
    gram: 'Gram',
    kg: 'Kg',
    kilogram: 'Kg',
    lon: 'Lon',
    chai: 'Chai',
    bottle: 'Chai',
    portion: 'phần',
    phan: 'phần',
    plate: 'phần',
    piece: 'Miếng',
    mieng: 'Miếng',
    unit: 'phần',
  };
  return unitMap[key] || baseUnit || 'phần';
}

function mapMenuUnit(product, linkedInventory) {
  if (product.item_type === 'Retail') {
    return linkedInventory?.unit || 'phần';
  }
  return 'phần';
}

function mapInventoryType(invType) {
  return String(invType || '').toLowerCase() === 'retail'
    ? ITEM_TYPES.RETAIL
    : ITEM_TYPES.RAW;
}

function mapMenuType(itemType) {
  return String(itemType || '').toLowerCase() === 'retail'
    ? ITEM_TYPES.RETAIL
    : ITEM_TYPES.FINISHED;
}

async function syncMasterToApp() {
  const [productSnap, inventorySnap, bomSnap, appMenuSnap, appInventorySnap] = await Promise.all([
    db.collection('Product_Catalog').get(),
    db.collection('Inventory_Items').get(),
    db.collection('Recipes_BOM').get(),
    db.collection('menu').get(),
    db.collection('inventory').get(),
  ]);

  const products = productSnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
  const importedInventory = inventorySnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
  const recipes = bomSnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
  const appMenu = appMenuSnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
  const appInventory = appInventorySnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));

  const recipeMap = new Map();
  recipes.forEach(recipe => {
    const parentId = recipe.parent_item_id;
    if (!recipeMap.has(parentId)) recipeMap.set(parentId, []);
    recipeMap.get(parentId).push(recipe);
  });

  const inventoryById = new Map(appInventory.map(item => [item.id || item._docId, item]));
  const inventoryByName = new Map(
    appInventory.map(item => [normalizeViKey(item.name), item]).filter(([key]) => !!key)
  );

  const syncedInventoryRefs = new Map();
  const inventoryBatch = db.batch();
  const inventorySummary = { created: 0, updated: 0 };

  for (const inv of importedInventory) {
    const targetId = inv.inv_id || inv._docId;
    const targetName = inv.material_name || targetId;
    const existing =
      inventoryById.get(targetId) ||
      inventoryByName.get(normalizeViKey(targetName)) ||
      null;

    const nextId = existing ? (existing.id || existing._docId) : targetId;
    const payload = {
      id: nextId,
      name: targetName,
      unit: mapInventoryUnit(inv.base_unit),
      itemType: mapInventoryType(inv.inv_type),
      qty: existing ? Number(existing.qty || 0) : Number(inv.current_stock || 0),
      minQty: Number(inv.min_alert || existing?.minQty || 0),
      costPerUnit: Number(existing?.costPerUnit || 0),
      hidden: false,
      supplierName: existing?.supplierName || '',
      supplierPhone: existing?.supplierPhone || '',
      supplierAddress: existing?.supplierAddress || '',
      masterInventoryId: targetId,
      _docId: nextId,
    };

    inventoryBatch.set(db.collection('inventory').doc(nextId), payload, { merge: true });
    syncedInventoryRefs.set(targetId, payload);

    if (existing) inventorySummary.updated++;
    else inventorySummary.created++;
  }

  await inventoryBatch.commit();

  const refreshedInventorySnap = await db.collection('inventory').get();
  const refreshedInventory = refreshedInventorySnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
  const refreshedInventoryById = new Map(
    refreshedInventory.map(item => [item.id || item._docId, item])
  );
  const refreshedInventoryByMasterId = new Map(
    refreshedInventory
      .filter(item => item.masterInventoryId)
      .map(item => [item.masterInventoryId, item])
  );

  const menuById = new Map(appMenu.map(item => [item.id || item._docId, item]));
  const menuByName = new Map(
    appMenu.map(item => [normalizeViKey(item.name), item]).filter(([key]) => !!key)
  );

  const menuBatch = db.batch();
  const menuSummary = { created: 0, updated: 0 };

  for (const product of products) {
    const productId = product.item_id || product._docId;
    const productName = product.display_name || productId;
    const existing =
      menuById.get(productId) ||
      menuByName.get(normalizeViKey(productName)) ||
      null;

    const bomLines = recipeMap.get(productId) || [];
    const linkedInventory = bomLines.length
      ? refreshedInventoryByMasterId.get(bomLines[0].ingredient_inv_id) ||
        refreshedInventoryById.get(bomLines[0].ingredient_inv_id) ||
        null
      : null;

    const ingredients = bomLines
      .map(line => {
        const inventoryItem =
          refreshedInventoryByMasterId.get(line.ingredient_inv_id) ||
          refreshedInventoryById.get(line.ingredient_inv_id) ||
          null;
        if (!inventoryItem) return null;
        return {
          name: inventoryItem.name,
          qty: Number(line.quantity_needed || 0),
          unit: inventoryItem.unit || 'phần',
        };
      })
      .filter(Boolean);

    const nextId = existing ? (existing.id || existing._docId) : productId;
    const itemType = mapMenuType(product.item_type);
    const payload = {
      id: nextId,
      name: productName,
      category: product.category || existing?.category || 'Khác',
      price: Number(product.sell_price || 0),
      unit: mapMenuUnit(product, linkedInventory),
      cost: Number(existing?.cost || 0),
      itemType,
      linkedInventoryId: itemType === ITEM_TYPES.RETAIL ? (linkedInventory?.id || null) : null,
      ingredients: itemType === ITEM_TYPES.FINISHED ? ingredients : [],
      aliases: product.aliases || existing?.aliases || '',
      masterProductId: productId,
    };

    menuBatch.set(db.collection('menu').doc(nextId), payload, { merge: true });

    if (existing) menuSummary.updated++;
    else menuSummary.created++;
  }

  await menuBatch.commit();

  console.log(JSON.stringify({
    ok: true,
    inventory: inventorySummary,
    menu: menuSummary,
    totals: {
      importedProducts: products.length,
      importedInventory: importedInventory.length,
      importedRecipes: recipes.length,
    },
  }, null, 2));
}

syncMasterToApp().catch(error => {
  console.error(JSON.stringify({
    ok: false,
    message: error.message,
    stack: error.stack,
  }, null, 2));
  process.exit(1);
});
