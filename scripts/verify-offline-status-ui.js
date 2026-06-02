#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const {
  normalizeSummary,
  getBadgeState,
  formatBadgeText,
  formatPanelText,
  installOfflineStatusUI,
} = require('../offlineStatusUI.js');

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value) { this.values.has(value) ? this.values.delete(value) : this.values.add(value); }
  contains(value) { return this.values.has(value); }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.classList = new FakeClassList();
    this.textContent = '';
    this.disabled = false;
  }
  set id(value) { this.attributes.id = value; }
  get id() { return this.attributes.id || ''; }
  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
    if (!value || !value.includes('offline-panel-title')) return;
    const title = this.ownerDocument.createElement('div');
    title.classList.add('offline-panel-title');
    title.textContent = 'POS Offline Backup';
    this.appendChild(title);
    ['network', 'sync', 'counts', 'updated'].forEach(role => {
      const row = this.ownerDocument.createElement('div');
      row.setAttribute('data-role', role);
      row.classList.add('offline-panel-row');
      this.appendChild(row);
    });
    const confirmBox = this.ownerDocument.createElement('div');
    confirmBox.setAttribute('data-role', 'sync-confirm');
    this.appendChild(confirmBox);
    const syncStatus = this.ownerDocument.createElement('div');
    syncStatus.setAttribute('data-role', 'sync-status');
    this.appendChild(syncStatus);
    ['refresh', 'guarded-sync', 'close'].forEach(action => {
      const button = this.ownerDocument.createElement('button');
      button.setAttribute('data-action', action);
      button.textContent = action === 'refresh' ? 'Cập nhật' : (action === 'guarded-sync' ? 'Đồng bộ thủ công' : 'Đóng');
      this.appendChild(button);
    });
  }
  get innerHTML() { return this._innerHTML || ''; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  insertBefore(child) { return this.appendChild(child); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  async dispatch(type, target = this) {
    const event = { target, preventDefault() {}, stopPropagation() {} };
    for (const listener of this.listeners[type] || []) await listener(event);
  }
  matches(selector) {
    const dataMatch = selector.match(/^\[data-(role|action)=\"([^\"]+)\"\]$/);
    if (dataMatch) return this.getAttribute(`data-${dataMatch[1]}`) === dataMatch[2];
    if (selector === '[data-action]') return !!this.getAttribute('data-action');
    return false;
  }
  closest(selector) {
    let cursor = this;
    while (cursor) {
      if (cursor.matches && cursor.matches(selector)) return cursor;
      cursor = cursor.parentNode;
    }
    return null;
  }
  querySelector(selector) { return findFirst(this, selector); }
}

function findFirst(root, selector) {
  for (const child of root.children || []) {
    if (selector.startsWith('#') && child.id === selector.slice(1)) return child;
    if (child.matches && child.matches(selector)) return child;
    const nested = findFirst(child, selector);
    if (nested) return nested;
  }
  return null;
}

function createFakeDocument() {
  const doc = {
    body: null,
    head: null,
    createElement(tagName) { return new FakeElement(tagName, doc); },
    getElementById(id) { return findFirst({ children: [doc.head, doc.body].filter(Boolean) }, `#${id}`); },
    querySelector(selector) { return findFirst({ children: [doc.head, doc.body].filter(Boolean) }, selector); },
  };
  doc.body = doc.createElement('body');
  doc.head = doc.createElement('head');
  return doc;
}

async function main() {
  const clean = normalizeSummary({ online: true, pending: 0, failed: 0, synced: 2, total: 2, syncEnabled: false });
  assert.equal(clean.online, true);
  assert.equal(clean.pending, 0);
  assert.equal(getBadgeState(clean), 'ok');
  assert.equal(formatBadgeText(clean), 'Offline: OK');

  const pending = normalizeSummary({ online: true, pending: 3, failed: 0, syncEnabled: false });
  assert.equal(getBadgeState(pending), 'warning');
  assert.equal(formatBadgeText(pending), 'Offline: 3 chờ');

  const failed = normalizeSummary({ online: true, pending: 1, failed: 2, syncEnabled: false });
  assert.equal(getBadgeState(failed), 'danger');
  assert.equal(formatBadgeText(failed), 'Offline: 2 lỗi');

  const offline = normalizeSummary({ online: false, pending: 0, failed: 0, syncEnabled: false });
  assert.equal(getBadgeState(offline), 'offline');
  assert.equal(formatBadgeText(offline), 'Offline: mất mạng');

  const panel = formatPanelText({ online: true, pending: 1, failed: 0, synced: 2, total: 3, syncEnabled: false });
  assert.equal(panel.network, 'Online');
  assert.equal(panel.sync, 'Sync đang tắt');
  assert.equal(panel.counts, 'Pending: 1 · Failed: 0 · Synced: 2 · Total: 3');

  const doc = createFakeDocument();
  let runtimePending = 1;
  const runtime = {
    async getSummary() {
      return { online: true, pending: runtimePending, failed: 0, synced: 0, total: runtimePending, syncEnabled: false };
    },
    async listPendingActions() {
      return [{
        id: 'offline_action_test_1',
        type: 'add_item',
        status: 'pending',
        clientOrderId: 'dryrun-order-1',
        deviceId: 'device_test_1',
        createdAt: '2026-06-01T16:30:00.000Z',
        payload: { clientOrderId: 'dryrun-order-1', orderId: 'dryrun-order-1', tableId: 'dryrun-table-1', item: { id: 'sku-1', qty: 1 } },
      }];
    },
    async listFailedActions() {
      return [];
    },
  };
  const controller = installOfflineStatusUI({
    document: doc,
    runtime,
    intervalMs: 0,
    logger: { warn() {}, info() {}, error() {} },
  });
  assert.equal(controller.installed, true);

  await controller.refresh();
  const modal = doc.getElementById('xekho-offline-backup-panel');
  const counts = modal.querySelector('[data-role="counts"]');
  const updated = modal.querySelector('[data-role="updated"]');
  const refreshButton = modal.querySelector('[data-action="refresh"]');
  assert.equal(counts.textContent, 'Pending: 1 · Failed: 0 · Synced: 0 · Total: 1');
  assert.match(updated.textContent, /^Cập nhật lần cuối: \d{2}:\d{2}:\d{2}$/);

  runtimePending = 2;
  await modal.dispatch('click', refreshButton);
  assert.equal(counts.textContent, 'Pending: 2 · Failed: 0 · Synced: 0 · Total: 2');
  assert.equal(refreshButton.disabled, false);
  assert.equal(refreshButton.textContent, 'Cập nhật');

  console.log('✅ offlineStatusUI Sprint 19 verification passed');
}

main().catch(error => {
  console.error('❌ offlineStatusUI Sprint 19 verification failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
