#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app', 'esm', 'ui', 'settings-tabs.js');
const indexPath = path.join(repo, 'index.html');

async function importEsmFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
}

function createEventDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
    dispatchClick(target) {
      const handler = listeners.get('click');
      assert.strictEqual(typeof handler, 'function', 'click handler should be registered');
      handler({ type: 'click', target });
    },
  };
}

function makeButton(tab) {
  return {
    dataset: { esmSettingsTab: tab },
    closest(selector) {
      assert.strictEqual(selector, '[data-esm-settings-tab]');
      return this;
    },
  };
}

(async function main() {
  const mod = await importEsmFile(modulePath);
  assert.strictEqual(typeof mod.callSettingsTab, 'function', 'callSettingsTab export missing');
  assert.strictEqual(typeof mod.installSettingsTabs, 'function', 'installSettingsTabs export missing');

  const calls = [];
  const directRoot = {
    switchSettingsTab(tab, trigger) {
      calls.push({ tab, trigger });
      return 'ok:' + tab;
    },
  };
  const trigger = makeButton('users');
  assert.strictEqual(mod.callSettingsTab('users', trigger, directRoot), 'ok:users', 'direct call should delegate');
  assert.deepStrictEqual(calls.map((call) => call.tab), ['users']);
  assert.strictEqual(mod.callSettingsTab('', trigger, directRoot), undefined, 'empty tab should no-op');
  assert.strictEqual(mod.callSettingsTab('store', trigger, {}), undefined, 'missing legacy switcher should no-op');

  const documentRef = createEventDocument();
  const delegatedCalls = [];
  const win = {
    document: documentRef,
    XekhoApp: { esm: { ui: {} } },
    switchSettingsTab(tab, button) {
      delegatedCalls.push({ tab, button });
    },
  };
  const api = mod.installSettingsTabs(win);
  assert.strictEqual(api.installed, true, 'installer should mark installed');
  assert.strictEqual(api.selector, '[data-esm-settings-tab]', 'selector mismatch');
  assert.strictEqual(win.XekhoApp.esm.ui.settingsTabs, api, 'installer should publish namespace');

  const themeButton = makeButton('theme');
  documentRef.dispatchClick(themeButton);
  assert.strictEqual(delegatedCalls.length, 1, 'delegated click should call once');
  assert.strictEqual(delegatedCalls[0].tab, 'theme');
  assert.strictEqual(delegatedCalls[0].button, themeButton);

  api.uninstall();
  assert.strictEqual(api.installed, false, 'uninstall should mark not installed');
  assert.strictEqual(documentRef.listeners.has('click'), false, 'uninstall should remove click listener');

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert.strictEqual((indexHtml.match(/data-esm-settings-tab=/g) || []).length, 7, 'expected seven delegated settings tab buttons');
  for (const tab of ['store', 'theme', 'users', 'attendance', 'payment', 'ai', 'data']) {
    assert(!indexHtml.includes("onclick=\"switchSettingsTab('" + tab + "',this)\""), tab + ' inline handler should be removed');
  }

  console.log('verify-esm-settings-tabs passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: !documentRef.listeners.has('click'),
    convertedSettingsTabs: (indexHtml.match(/data-esm-settings-tab=/g) || []).length,
  });
})();
