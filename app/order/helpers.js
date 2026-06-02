// @ts-check
(function (global) {
  'use strict';
  /** @type {any} */
  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.order = XekhoApp.order || {};

  var ITEM_TYPES = (global.ITEM_TYPES || {});

  /** @returns {string} */
  function uid() {
    return (typeof global.uid === 'function') ? global.uid()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ── History order helpers ──

  /** @param {Object} order @returns {boolean} */
  function isCompletedHistoryOrderForUi(order) {
    var status = String(order && order.status || '').trim().toLowerCase();
    if (!status) return !(order && order.cancelledAt) && !(order && order.cancelReason);
    return status === 'completed' || status === 'closed';
  }

  /** @param {Object} order @returns {boolean} */
  function isVisibleHistoryOrderForUi(order) {
    if (!order || typeof order !== 'object') return false;
    if (!isCompletedHistoryOrderForUi(order)) return false;
    if (order.hidden === true) return false;
    if (order.hiddenFromReports === true) return false;
    if (order.hiddenFromHistory === true) return false;
    if (order.deletedAt || order.deletedFromAppAt) return false;
    if (order.archivedAt || order.archivedFromHistoryId) return false;
    if (order.supersededAt || order.supersededByHistoryId) return false;
    return true;
  }

  // ── Vietnamese key normalization ──

  /** @param {string} text @returns {string} */
  function normalizeViKey(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  // ── Inventory item helpers ──

  /** @param {Object} item @returns {string} */
  function inferInventoryItemType(item) {
    item = item || {};
    if (item.itemType === ITEM_TYPES.RETAIL || item.itemType === ITEM_TYPES.RAW) return item.itemType;
    if (item.saleMode === 'retail' || item.directSale === true) return ITEM_TYPES.RETAIL;
    return ITEM_TYPES.RAW;
  }

  /** @param {Object} item @returns {Object} */
  function normalizeInventoryItemModel(item) {
    item = item || {};
    return {
      itemType: inferInventoryItemType(item),
      mergedInto: item.mergedInto || null,
      qty: Number(item.qty || 0),
      minQty: Number(item.minQty || 0),
      costPerUnit: Number(item.costPerUnit || 0),
      hidden: !!item.hidden,
    };
  }

  // ── Menu item helpers ──

  /** @param {Object} item @returns {string} */
  function inferMenuItemType(item) {
    item = item || {};
    if (item.itemType === ITEM_TYPES.RETAIL || item.itemType === ITEM_TYPES.FINISHED) return item.itemType;
    return Array.isArray(item.ingredients) && item.ingredients.length > 0 ? ITEM_TYPES.FINISHED : ITEM_TYPES.RETAIL;
  }

  /**
   * @param {Object} item
   * @param {Array} inventory
   * @returns {string|null}
   */
  function findLinkedInventoryIdForMenuItem(item, inventory) {
    item = item || {};
    inventory = inventory || [];
    if (item.linkedInventoryId && inventory.some(function (inv) { return inv.id === item.linkedInventoryId; })) return item.linkedInventoryId;
    var exact = inventory.find(function (inv) { return !inv.hidden && normalizeViKey(inv.name) === normalizeViKey(item.name); });
    return exact ? exact.id : null;
  }

  /** @param {string} unit @returns {string} */
  function normalizeUnitText(unit) {
    var raw = String(unit || '').trim();
    if (!raw) return 'ph\u1ea7n';
    if (/ph/i.test(raw) && /(\u00e1\u00ba|\u00c3|\u1edf|\xa7n|\u1ea7n|an)/i.test(raw)) return 'ph\u1ea7n';
    if (/mi/i.test(raw) && /(\u00e1\u00ba|\u00c3|\u1ebfng|eng)/i.test(raw)) return 'Mi\u1ebfng';
    var key = normalizeViKey(raw);
    var map = {
      phan: 'ph\u1ea7n', portion: 'ph\u1ea7n', lon: 'Lon', chai: 'Chai',
      ly: 'ly', kg: 'Kg', kilogram: 'Kg', gram: 'Gram', gam: 'Gram',
      mieng: 'Mi\u1ebfng', piece: 'Mi\u1ebfng', con: 'Con',
    };
    return map[key] || raw;
  }

  // ── Kitchen order item helpers ──

  /** @param {Object} item @returns {boolean} */
  function _isKitchenSkippedItem(item) {
    item = item || {};
    return String(item.itemType || '').trim().toLowerCase() === String(ITEM_TYPES.RETAIL).toLowerCase();
  }

  /** @returns {string} */
  function createKitchenLineItemId() {
    return 'li_' + Date.now() + '_' + uid().slice(0, 6);
  }

  /** @param {Object} item @returns {string} */
  function getKitchenLineItemId(item) {
    item = item || {};
    return String(item.lineItemId || '').trim();
  }

  /** @param {string} status @returns {boolean} */
  function isKitchenFinalStatus(status) {
    var normalized = String(status || '').trim().toLowerCase();
    return normalized === 'served';
  }

  /** @param {Object} item @returns {boolean} */
  function canToggleServedStatus(item) {
    item = item || {};
    var status = String(item.kitchenStatus || '').trim().toLowerCase();
    return status === 'done' || status === 'served';
  }

  /** @param {Object} item @returns {string} */
  function getCartItemStatusLabel(item) {
    item = item || {};
    var status = String(item.kitchenStatus || '').trim().toLowerCase();
    if (status === 'served') return 'Da mang ra';
    if (status === 'done') return 'Cho mang ra';
    if (status === 'cooking') return 'Dang lam';
    if (status === 'skip') return 'Ban thang';
    return 'Cho lam';
  }

  /** @param {Object} item @param {Map|null} menuMap @returns {Object} */
  function normalizeKitchenOrderItem(item, menuMap) {
    item = item || {};
    var base = Object.assign({}, item);
    var menuItem = menuMap instanceof Map ? menuMap.get(String(base.id || '')) : null;
    var inferredItemType = (menuItem && menuItem.itemType) || base.itemType || inferMenuItemType(menuItem || base);
    var normalized = Object.assign({}, base, {
      itemType: inferredItemType,
      kitchenRouting: (menuItem && menuItem.kitchenRouting) || base.kitchenRouting || 'all',
      linkedInventoryId: (menuItem && menuItem.linkedInventoryId) || base.linkedInventoryId || null,
      lineItemId: getKitchenLineItemId(base) || createKitchenLineItemId(),
    });

    if (_isKitchenSkippedItem(normalized) || String(normalized.kitchenRouting || '').trim().toLowerCase() === 'skip') {
      normalized.kitchenStatus = 'skip';
      if (normalized.kitchenSentAt == null) normalized.kitchenSentAt = null;
      if (normalized.kitchenUpdatedAt == null) normalized.kitchenUpdatedAt = null;
      if (normalized.servedAt == null) normalized.servedAt = null;
      return normalized;
    }

    var existingStatus = String(normalized.kitchenStatus || '').trim().toLowerCase();
    var validStatuses = { pending: 1, cooking: 1, done: 1, served: 1 };
    var nextStatus = validStatuses[existingStatus] ? existingStatus : 'pending';
    var now = Date.now();
    normalized.kitchenStatus = nextStatus;
    normalized.kitchenSentAt = Number(normalized.kitchenSentAt || 0) > 0 ? Number(normalized.kitchenSentAt) : now;
    normalized.kitchenUpdatedAt = Number(normalized.kitchenUpdatedAt || 0) > 0 ? Number(normalized.kitchenUpdatedAt) : normalized.kitchenSentAt;
    normalized.servedAt = normalized.servedAt != null ? normalized.servedAt : null;
    return normalized;
  }

  // ── Online order helpers ──

  /** @param {Object} order @returns {string} */
  function _mapOnlineOrderPayMethod(order) {
    order = order || {};
    var paymentMethod = String(order.paymentMethod || '').trim().toLowerCase();
    var paymentStatus = String(order.paymentStatus || '').trim().toLowerCase();
    if (paymentMethod && paymentMethod !== 'cod') {
      return paymentStatus === 'paid' ? 'bank' : 'cash';
    }
    return 'cash';
  }

  /** @param {Object} order @returns {string} */
  function _buildOnlineOrderBillNo(order) {
    order = order || {};
    var orderCode = String(order.orderCode || '').trim();
    if (orderCode) return 'ONL-' + orderCode;
    var now = new Date();
    return 'ONL-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + uid().slice(0, 4).toUpperCase();
  }

  /** @param {Object} item @returns {number} */
  function _getOnlineOrderItemQty(item) {
    item = item || {};
    return Number(item.qty != null ? item.qty : (item.quantity != null ? item.quantity : 1)) || 1;
  }

  /** @param {Object} item @returns {number} */
  function _getOnlineOrderItemUnitPrice(item) {
    item = item || {};
    return Number(
      item.unitPrice != null ? item.unitPrice :
      item.price != null ? item.price :
      item.sellPrice != null ? item.sellPrice :
      item.finalPrice != null ? item.finalPrice :
      item.subtotal
    ) || 0;
  }

  /** @param {Object} order @returns {number} */
  function _calculateOnlineOrderTotal(order) {
    order = order || {};
    var pricing = order.pricing || {};
    var explicitTotal = Number(
      order.total != null ? order.total :
      order.finalBillTotal != null ? order.finalBillTotal :
      order.temporaryTotal != null ? order.temporaryTotal :
      order.totalPrice != null ? order.totalPrice :
      pricing.total != null ? pricing.total :
      pricing.grandTotal != null ? pricing.grandTotal :
      pricing.finalTotal
    ) || 0;
    if (explicitTotal > 0) return explicitTotal;

    var items = Array.isArray(order.items) ? order.items : [];
    var itemsTotal = items.reduce(function (sum, item) {
      return sum + (_getOnlineOrderItemUnitPrice(item) * _getOnlineOrderItemQty(item));
    }, 0);
    var shipping = Number(order.shipping || order.shippingFee || pricing.shippingFee || pricing.deliveryFee || 0) || 0;
    var discount = Number(order.discount || order.discountAmount || pricing.discountTotal || pricing.discountAmount || 0) || 0;
    var vatAmount = Number(order.vatAmount || pricing.vatAmount || 0) || 0;
    return Math.max(0, itemsTotal + shipping + vatAmount - discount);
  }

  /** @param {Object} order @param {string} [fallbackId] @returns {string} */
  function _resolveOnlineOrderDocId(order, fallbackId) {
    order = order || {};
    return String(order._docId || order.id || fallbackId || '').trim();
  }

  // ── Export ──
  XekhoApp.order.isCompletedHistoryOrderForUi = isCompletedHistoryOrderForUi;
  XekhoApp.order.isVisibleHistoryOrderForUi = isVisibleHistoryOrderForUi;
  XekhoApp.order.normalizeViKey = normalizeViKey;
  XekhoApp.order.inferInventoryItemType = inferInventoryItemType;
  XekhoApp.order.normalizeInventoryItemModel = normalizeInventoryItemModel;
  XekhoApp.order.inferMenuItemType = inferMenuItemType;
  XekhoApp.order.findLinkedInventoryIdForMenuItem = findLinkedInventoryIdForMenuItem;
  XekhoApp.order.normalizeUnitText = normalizeUnitText;
  XekhoApp.order._isKitchenSkippedItem = _isKitchenSkippedItem;
  XekhoApp.order.createKitchenLineItemId = createKitchenLineItemId;
  XekhoApp.order.getKitchenLineItemId = getKitchenLineItemId;
  XekhoApp.order.isKitchenFinalStatus = isKitchenFinalStatus;
  XekhoApp.order.canToggleServedStatus = canToggleServedStatus;
  XekhoApp.order.getCartItemStatusLabel = getCartItemStatusLabel;
  XekhoApp.order.normalizeKitchenOrderItem = normalizeKitchenOrderItem;
  XekhoApp.order._mapOnlineOrderPayMethod = _mapOnlineOrderPayMethod;
  XekhoApp.order._buildOnlineOrderBillNo = _buildOnlineOrderBillNo;
  XekhoApp.order._getOnlineOrderItemQty = _getOnlineOrderItemQty;
  XekhoApp.order._getOnlineOrderItemUnitPrice = _getOnlineOrderItemUnitPrice;
  XekhoApp.order._calculateOnlineOrderTotal = _calculateOnlineOrderTotal;
  XekhoApp.order._resolveOnlineOrderDocId = _resolveOnlineOrderDocId;

  /** @param {Object} dish @param {Array} inventoryList @returns {number} */
  function _resolveDishCostPerUnit(dish, inventoryList) {
    if (!dish) return 0;
    var inv = Array.isArray(inventoryList) ? inventoryList : [];
    var dishCost = Number(dish.cost || 0);
    if (dish.itemType === ITEM_TYPES.RETAIL) {
      var linked = null;
      for (var i = 0; i < inv.length; i++) {
        if (inv[i].id === dish.linkedInventoryId) { linked = inv[i]; break; }
      }
      if (!linked) {
        var dishNameKey = normalizeViKey(dish.name);
        for (var j = 0; j < inv.length; j++) {
          if (normalizeViKey(inv[j].name) === dishNameKey) { linked = inv[j]; break; }
        }
      }
      return Number((linked && linked.costPerUnit) || dishCost || 0);
    }
    if (Array.isArray(dish.ingredients) && dish.ingredients.length > 0) {
      dishCost = dish.ingredients.reduce(function (sum, ing) {
        var stock = null;
        for (var k = 0; k < inv.length; k++) {
          if (inv[k].name === ing.name) { stock = inv[k]; break; }
        }
        return sum + (Number(stock && stock.costPerUnit || 0) * Number(ing.qty || 0));
      }, 0);
    }
    return Number(dishCost || 0);
  }
  XekhoApp.order._resolveDishCostPerUnit = _resolveDishCostPerUnit;

  /** @param {Object} item @param {Array} [inventory] @returns {Object} */
  function normalizeMenuItemModel(item, inventory) {
    item = item || {};
    if (!Array.isArray(inventory)) {
      if (typeof global._getInventory === 'function') inventory = global._getInventory();
      else if (global.Store && typeof global.Store.getInventory === 'function') inventory = global.Store.getInventory();
      else inventory = [];
    }
    var itemType = inferMenuItemType(item);
    var kitchenRoutingRaw = String(item.kitchenRouting || item.kitchenStation || '').trim().toLowerCase();
    var kitchenRouting = itemType === ITEM_TYPES.RETAIL
      ? 'skip'
      : (['all', 'kitchen_1', 'kitchen_2', 'skip'].indexOf(kitchenRoutingRaw) !== -1 ? kitchenRoutingRaw : 'all');
    var normalized = {
      unit: normalizeUnitText(item.unit),
      itemType: itemType,
      kitchenRouting: kitchenRouting,
      linkedInventoryId: itemType === ITEM_TYPES.RETAIL ? findLinkedInventoryIdForMenuItem(item, inventory) : null,
      ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
    };
    var merged = {};
    var key;
    for (key in item) { if (Object.prototype.hasOwnProperty.call(item, key)) merged[key] = item[key]; }
    for (key in normalized) { if (Object.prototype.hasOwnProperty.call(normalized, key)) merged[key] = normalized[key]; }
    var liveCost = _resolveDishCostPerUnit(merged, inventory);
    merged.cost = Number(liveCost || item.cost || 0);
    return merged;
  }
  XekhoApp.order.normalizeMenuItemModel = normalizeMenuItemModel;

  // Legacy global fallbacks
  if (typeof global.isCompletedHistoryOrderForUi !== 'function') global.isCompletedHistoryOrderForUi = isCompletedHistoryOrderForUi;
  if (typeof global.isVisibleHistoryOrderForUi !== 'function') global.isVisibleHistoryOrderForUi = isVisibleHistoryOrderForUi;
  if (typeof global.normalizeViKey !== 'function') global.normalizeViKey = normalizeViKey;

})(typeof window !== 'undefined' ? window : globalThis);
