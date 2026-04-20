const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ROOT = __dirname;
const MASTER_DATA_PATH = path.join(PROJECT_ROOT, 'GanhKho_MasterData.json');
const STORAGE_BUCKET = 'pos-v2-909ff.firebasestorage.app';
const SHOULD_APPLY = process.argv.includes('--apply');
const SHOULD_PURGE_STORAGE = process.argv.includes('--purge-storage');

function loadServiceAccount() {
  const directPath = path.join(PROJECT_ROOT, 'serviceAccountKey.json');
  if (fs.existsSync(directPath)) return require(directPath);

  const fallback = fs.readdirSync(PROJECT_ROOT).find(name =>
    /^.+-firebase-adminsdk-[^.]+\.json$/i.test(name)
  );
  if (!fallback) {
    throw new Error('Khong tim thay file service account trong thu muc project.');
  }
  return require(path.join(PROJECT_ROOT, fallback));
}

function normalizeKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isWeirdText(text) {
  return /[├╞ß╗┤æ]/.test(String(text || ''));
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function takePreview(arr, limit = 20) {
  return arr.slice(0, limit);
}

function logSection(title, data) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
}

function buildMasterIndexes(master) {
  const products = Array.isArray(master.Product_Catalog) ? master.Product_Catalog : [];
  const inventory = Array.isArray(master.Inventory_Items) ? master.Inventory_Items : [];
  const bom = Array.isArray(master.Recipes_BOM) ? master.Recipes_BOM : [];

  return {
    products,
    inventory,
    bom,
    productIds: new Set(products.map(item => item.item_id)),
    productNames: new Set(products.map(item => normalizeKey(item.display_name))),
    inventoryIds: new Set(inventory.map(item => item.inv_id)),
    inventoryNames: new Set(inventory.map(item => normalizeKey(item.material_name))),
    bomKeys: new Set(
      bom.map(item => `${item.parent_item_id}__${item.ingredient_inv_id}`)
    ),
  };
}

async function getCollectionDocs(db, name) {
  const snap = await db.collection(name).get();
  return snap.docs.map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
}

function chooseCanonicalDoc(group, options = {}) {
  const { masterField, preferredIdPattern } = options;

  const ranked = [...group].sort((a, b) => {
    const score = item => {
      let total = 0;
      if (masterField && item[masterField]) total += 1000;
      if (!isWeirdText(item.name)) total += 100;
      if (preferredIdPattern && preferredIdPattern.test(String(item.id))) total += 25;
      total -= String(item.id || '').length / 100;
      return total;
    };
    return score(b) - score(a);
  });

  return ranked[0] || null;
}

function buildCanonicalIndex(docs, options = {}) {
  const byId = new Map(docs.map(item => [String(item.id), item]));
  const byMaster = new Map();
  const byNameGroup = new Map();
  const canonicalById = new Map();
  const duplicateDocs = [];

  docs.forEach(item => {
    if (options.masterField && item[options.masterField]) {
      byMaster.set(String(item[options.masterField]), item);
    }
    const nameKey = normalizeKey(item.name);
    if (!nameKey) return;
    if (!byNameGroup.has(nameKey)) byNameGroup.set(nameKey, []);
    byNameGroup.get(nameKey).push(item);
  });

  const canonicalByName = new Map();
  byNameGroup.forEach((group, key) => {
    const canonical = chooseCanonicalDoc(group, options);
    canonicalByName.set(key, canonical);
    group.forEach(item => {
      canonicalById.set(String(item.id), canonical);
      if (canonical && String(item.id) !== String(canonical.id)) {
        duplicateDocs.push(item);
      }
    });
  });

  return {
    byId,
    byMaster,
    canonicalByName,
    canonicalById,
    duplicateDocs,
  };
}

function resolveCanonicalMenu(item, menuIndex) {
  if (!item) return null;
  const rawId = item.id != null ? String(item.id) : '';
  if (rawId && menuIndex.canonicalById.has(rawId)) {
    return menuIndex.canonicalById.get(rawId);
  }
  if (rawId && menuIndex.byMaster.has(rawId)) {
    return menuIndex.byMaster.get(rawId);
  }
  const key = normalizeKey(item.name || item.display_name || rawId);
  if (key && menuIndex.canonicalByName.has(key)) {
    return menuIndex.canonicalByName.get(key);
  }
  return null;
}

function resolveCanonicalInventory(item, inventoryIndex) {
  if (!item) return null;
  const rawId = item.inventoryItemId != null
    ? String(item.inventoryItemId)
    : item.ingredientId != null
      ? String(item.ingredientId)
      : item.id != null
        ? String(item.id)
        : '';
  if (rawId && inventoryIndex.canonicalById.has(rawId)) {
    return inventoryIndex.canonicalById.get(rawId);
  }
  if (rawId && inventoryIndex.byMaster.has(rawId)) {
    return inventoryIndex.byMaster.get(rawId);
  }
  const key = normalizeKey(item.name || item.ingredientName || rawId);
  if (key && inventoryIndex.canonicalByName.has(key)) {
    return inventoryIndex.canonicalByName.get(key);
  }
  return null;
}

async function commitUpdates(db, updates) {
  if (!updates.length) return 0;
  const BATCH_SIZE = 350;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    updates.slice(i, i + BATCH_SIZE).forEach(item => {
      batch.update(item.ref, item.data);
    });
    await batch.commit();
  }
  return updates.length;
}

async function commitDeletes(db, refs) {
  if (!refs.length) return 0;
  const BATCH_SIZE = 350;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    refs.slice(i, i + BATCH_SIZE).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
  return refs.length;
}

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
  const masterIdx = buildMasterIndexes(master);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(loadServiceAccount()),
      storageBucket: STORAGE_BUCKET,
    });
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const [
    productCatalogDocs,
    inventoryItemDocs,
    recipeDocs,
    menuDocs,
    inventoryDocs,
    unitConversionDocs,
    historyDocs,
    purchaseDocs,
    orderDocs,
  ] = await Promise.all([
    getCollectionDocs(db, 'Product_Catalog'),
    getCollectionDocs(db, 'Inventory_Items'),
    getCollectionDocs(db, 'Recipes_BOM'),
    getCollectionDocs(db, 'menu'),
    getCollectionDocs(db, 'inventory'),
    getCollectionDocs(db, 'unitConversions'),
    getCollectionDocs(db, 'history'),
    getCollectionDocs(db, 'purchases'),
    getCollectionDocs(db, 'orders'),
  ]);

  const menuIndex = buildCanonicalIndex(menuDocs, {
    masterField: 'masterProductId',
    preferredIdPattern: /^m\d+$/i,
  });
  const inventoryIndex = buildCanonicalIndex(inventoryDocs, {
    masterField: 'masterInventoryId',
    preferredIdPattern: /^i\d+$/i,
  });

  const liveInventoryIds = new Set(
    inventoryDocs.map(item => String(item.id || item.ref.id))
  );
  const liveInventoryNames = new Set(
    inventoryDocs.map(item => normalizeKey(item.name))
  );

  const extraProductCatalog = productCatalogDocs.filter(item => {
    const key = item.item_id || item.id;
    return !masterIdx.productIds.has(key);
  });

  const extraInventoryItems = inventoryItemDocs.filter(item => {
    const key = item.inv_id || item.id;
    return !masterIdx.inventoryIds.has(key);
  });

  const extraRecipes = recipeDocs.filter(item => {
    const key = `${item.parent_item_id}__${item.ingredient_inv_id}`;
    return !masterIdx.bomKeys.has(key);
  });

  const orphanMenuMasterLinked = menuDocs.filter(item =>
    item.masterProductId && !masterIdx.productIds.has(item.masterProductId)
  );

  const orphanInventoryMasterLinked = inventoryDocs.filter(item =>
    item.masterInventoryId && !masterIdx.inventoryIds.has(item.masterInventoryId)
  );

  const orphanUnitConversions = unitConversionDocs.filter(item => {
    const byId = item.ingredientId && liveInventoryIds.has(String(item.ingredientId));
    const byName = liveInventoryNames.has(normalizeKey(item.ingredientName));
    return !byId && !byName;
  });

  const historyUpdates = [];
  const historyRemapPreview = [];
  let historyRemapCount = 0;
  let unresolvedHistoryRefs = 0;

  historyDocs.forEach(doc => {
    let changed = false;
    const nextItems = (doc.items || []).map(item => {
      const canonical = resolveCanonicalMenu(item, menuIndex);
      if (!canonical) {
        const itemId = item && item.id != null ? String(item.id) : '';
        if (itemId && !menuIndex.byId.has(itemId)) unresolvedHistoryRefs++;
        return item;
      }

      const next = { ...item };
      if (String(next.id || '') !== String(canonical.id)) {
        next.id = canonical.id;
        changed = true;
        historyRemapCount++;
        if (historyRemapPreview.length < 20) {
          historyRemapPreview.push({
            historyId: doc.historyId || doc.id,
            fromId: item.id || null,
            toId: canonical.id,
            fromName: item.name || '',
            toName: canonical.name || '',
          });
        }
      }
      if (canonical.name && next.name !== canonical.name) {
        next.name = canonical.name;
        changed = true;
      }
      return next;
    });

    if (changed) {
      historyUpdates.push({ ref: doc.ref, data: { items: nextItems } });
    }
  });

  const orderUpdates = [];
  const orderRemapPreview = [];
  let orderRemapCount = 0;

  orderDocs.forEach(doc => {
    let changed = false;
    const nextItems = (doc.items || []).map(item => {
      const canonical = resolveCanonicalMenu(item, menuIndex);
      if (!canonical) return item;

      const next = { ...item };
      if (String(next.id || '') !== String(canonical.id)) {
        next.id = canonical.id;
        changed = true;
        orderRemapCount++;
        if (orderRemapPreview.length < 20) {
          orderRemapPreview.push({
            orderId: doc.id,
            fromId: item.id || null,
            toId: canonical.id,
            fromName: item.name || '',
            toName: canonical.name || '',
          });
        }
      }
      if (canonical.name && next.name !== canonical.name) {
        next.name = canonical.name;
        changed = true;
      }
      return next;
    });

    if (changed) {
      orderUpdates.push({ ref: doc.ref, data: { items: nextItems } });
    }
  });

  const purchaseUpdates = [];
  const purchaseRemapPreview = [];
  let purchaseRemapCount = 0;

  purchaseDocs.forEach(doc => {
    const canonical = resolveCanonicalInventory(doc, inventoryIndex);
    if (!canonical) return;

    const nextData = {};
    let changed = false;
    if (String(doc.inventoryItemId || '') !== String(canonical.id)) {
      nextData.inventoryItemId = canonical.id;
      changed = true;
      purchaseRemapCount++;
      if (purchaseRemapPreview.length < 20) {
        purchaseRemapPreview.push({
          purchaseId: doc.id,
          fromId: doc.inventoryItemId || null,
          toId: canonical.id,
          fromName: doc.name || '',
          toName: canonical.name || '',
        });
      }
    }
    if (canonical.name && doc.name !== canonical.name) {
      nextData.name = canonical.name;
      changed = true;
    }
    if (canonical.unit && doc.unit !== canonical.unit) {
      nextData.unit = canonical.unit;
      changed = true;
    }
    if (canonical.itemType && doc.itemType !== canonical.itemType) {
      nextData.itemType = canonical.itemType;
      changed = true;
    }
    if (changed) {
      purchaseUpdates.push({ ref: doc.ref, data: nextData });
    }
  });

  const menuUpdates = [];
  const menuLinkedPreview = [];
  let menuLinkedRemapCount = 0;

  menuDocs.forEach(doc => {
    const canonical = resolveCanonicalInventory({ inventoryItemId: doc.linkedInventoryId }, inventoryIndex);
    if (!doc.linkedInventoryId || !canonical) return;
    if (String(doc.linkedInventoryId) === String(canonical.id)) return;

    menuUpdates.push({
      ref: doc.ref,
      data: { linkedInventoryId: canonical.id },
    });
    menuLinkedRemapCount++;
    if (menuLinkedPreview.length < 20) {
      menuLinkedPreview.push({
        menuId: doc.id,
        menuName: doc.name || '',
        fromInventoryId: doc.linkedInventoryId,
        toInventoryId: canonical.id,
      });
    }
  });

  const unitConversionUpdates = [];
  let unitConversionRemapCount = 0;

  unitConversionDocs.forEach(doc => {
    const canonical = resolveCanonicalInventory(doc, inventoryIndex);
    if (!canonical) return;

    const nextData = {};
    let changed = false;
    if (String(doc.ingredientId || '') !== String(canonical.id)) {
      nextData.ingredientId = canonical.id;
      changed = true;
      unitConversionRemapCount++;
    }
    if (canonical.name && doc.ingredientName !== canonical.name) {
      nextData.ingredientName = canonical.name;
      changed = true;
    }
    if (changed) {
      unitConversionUpdates.push({ ref: doc.ref, data: nextData });
    }
  });

  const duplicateMenuCandidates = unique(
    menuIndex.duplicateDocs
      .filter(item => !item.masterProductId || item.id !== menuIndex.byMaster.get(String(item.masterProductId))?.id)
      .map(item => item.ref)
  );
  const duplicateInventoryCandidates = unique(
    inventoryIndex.duplicateDocs
      .filter(item => !item.masterInventoryId || item.id !== inventoryIndex.byMaster.get(String(item.masterInventoryId))?.id)
      .map(item => item.ref)
  );

  let storageFiles = [];
  try {
    const [files] = await bucket.getFiles({ maxResults: 1000 });
    storageFiles = files.map(file => file.name);
  } catch (error) {
    storageFiles = [`ERROR: ${error.message}`];
  }

  logSection('MASTERDATA_SUMMARY', {
    Product_Catalog: masterIdx.products.length,
    Inventory_Items: masterIdx.inventory.length,
    Recipes_BOM: masterIdx.bom.length,
  });

  logSection('FIRESTORE_SUMMARY', {
    Product_Catalog: productCatalogDocs.length,
    Inventory_Items: inventoryItemDocs.length,
    Recipes_BOM: recipeDocs.length,
    menu: menuDocs.length,
    inventory: inventoryDocs.length,
    unitConversions: unitConversionDocs.length,
    history: historyDocs.length,
    purchases: purchaseDocs.length,
    orders: orderDocs.length,
  });

  logSection('REMAP_PLAN', {
    historyUpdates: historyUpdates.length,
    historyItemRemaps: historyRemapCount,
    unresolvedHistoryRefs,
    ordersUpdates: orderUpdates.length,
    orderItemRemaps: orderRemapCount,
    purchaseUpdates: purchaseUpdates.length,
    purchaseRefRemaps: purchaseRemapCount,
    menuLinkedInventoryUpdates: menuUpdates.length,
    menuLinkedInventoryRemaps: menuLinkedRemapCount,
    unitConversionUpdates: unitConversionUpdates.length,
    unitConversionRemaps: unitConversionRemapCount,
    historyPreview: historyRemapPreview,
    orderPreview: orderRemapPreview,
    purchasePreview: purchaseRemapPreview,
    menuLinkedPreview,
  });

  logSection('DELETE_PLAN', {
    extraProductCatalog: takePreview(extraProductCatalog.map(item => item.id)),
    extraInventoryItems: takePreview(extraInventoryItems.map(item => item.id)),
    extraRecipes: takePreview(extraRecipes.map(item => item.id)),
    orphanMenuMasterLinked: takePreview(orphanMenuMasterLinked.map(item => ({ id: item.id, masterProductId: item.masterProductId, name: item.name }))),
    orphanInventoryMasterLinked: takePreview(orphanInventoryMasterLinked.map(item => ({ id: item.id, masterInventoryId: item.masterInventoryId, name: item.name }))),
    orphanUnitConversions: takePreview(orphanUnitConversions.map(item => ({ id: item.id, ingredientId: item.ingredientId || null, ingredientName: item.ingredientName || '' }))),
    duplicateMenuDocs: takePreview(menuIndex.duplicateDocs.map(item => ({ id: item.id, name: item.name, canonicalId: menuIndex.canonicalById.get(String(item.id))?.id || null }))),
    duplicateInventoryDocs: takePreview(inventoryIndex.duplicateDocs.map(item => ({ id: item.id, name: item.name, canonicalId: inventoryIndex.canonicalById.get(String(item.id))?.id || null }))),
    storageFilesPreview: takePreview(storageFiles),
    storageFileCount: storageFiles.length,
  });

  if (!SHOULD_APPLY) {
    console.log('\nDry-run only. Chay lai voi --apply de remap va xoa duplicate an toan.');
    if (storageFiles.length > 0) {
      console.log('Them --purge-storage neu muon xoa toan bo file trong Firebase Storage.');
    }
    return;
  }

  const updates = [
    ...historyUpdates,
    ...orderUpdates,
    ...purchaseUpdates,
    ...menuUpdates,
    ...unitConversionUpdates,
  ];

  const deleteRefs = unique([
    ...extraProductCatalog.map(item => item.ref),
    ...extraInventoryItems.map(item => item.ref),
    ...extraRecipes.map(item => item.ref),
    ...orphanMenuMasterLinked.map(item => item.ref),
    ...orphanInventoryMasterLinked.map(item => item.ref),
    ...orphanUnitConversions.map(item => item.ref),
    ...duplicateMenuCandidates,
    ...duplicateInventoryCandidates,
  ]);

  const updatedDocs = await commitUpdates(db, updates);
  const deletedDocs = await commitDeletes(db, deleteRefs);

  if (SHOULD_PURGE_STORAGE) {
    await bucket.deleteFiles({ force: true });
  }

  logSection('CLEANUP_DONE', {
    updatedFirestoreDocs: updatedDocs,
    deletedFirestoreDocs: deletedDocs,
    purgedStorage: SHOULD_PURGE_STORAGE,
  });
}

main().catch(error => {
  console.error(JSON.stringify({
    ok: false,
    message: error.message,
    stack: error.stack,
  }, null, 2));
  process.exit(1);
});
