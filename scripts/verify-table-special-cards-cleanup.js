#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');

assert(
  app.includes('function isActiveOnlineOrderForTables(order)') || app.includes('const isActiveOnlineOrderForTables ='),
  'app.js must define a shared active-online-order filter for the Tables card and modal'
);
assert(
  app.includes("const activeOnlineOrders = getActiveOnlineOrdersForTables(window.appState?.onlineOrders || [])"),
  'renderTables must use active online orders, not raw appState.onlineOrders'
);
assert(
  app.includes("const onlineOrders = getActiveOnlineOrdersForTables(window.appState?.onlineOrders || [])"),
  'renderOnlineOrdersPanel must hide cancelled/rejected/completed stale online orders'
);
assert(
  app.includes("if (String(tid).toLowerCase() === 'takeaway') return;"),
  '_getOrders must ignore stale cloud takeaway orders'
);
assert(
  app.includes("const localTakeawayOrder = localOrders.takeaway"),
  '_getOrders must preserve the live local takeaway order when cloud orders are present'
);
assert(
  app.includes("if (String(tid).toLowerCase() === 'takeaway') return;"),
  'syncLocalOrderCacheFromCloud must not resurrect cloud takeaway into local Store'
);
assert(
  db.includes(".filter(order => isActiveOnlineOrderForTables(order))"),
  'db online_orders listener must filter to active orders only'
);
assert(
  app.includes("_patchLocalOnlineOrderMeta(orderId, { status: 'rejected'"),
  'rejectOnlineOrder should patch local state so rejected orders disappear immediately'
);
assert(
  app.includes("_patchLocalOnlineOrderMeta(onlineOrderDocId, {") && app.includes("status: 'cancelled'"),
  'cancelOnlineOrder should patch cancelled local state immediately'
);

console.log('verify-table-special-cards-cleanup passed');
