#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app/esm/ui/header-actions.js');
const indexPath = path.join(repo, 'index.html');
const mainPath = path.join(repo, 'app/esm/main.js');

async function importFromSource(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
}

class FakeElement {
  constructor(action) {
    this.action = action;
  }
  closest(selector) {
    return selector === '[data-esm-header-action]' ? this : null;
  }
  getAttribute(name) {
    return name === 'data-esm-header-action' ? this.action : null;
  }
}

async function main() {
  const mod = await importFromSource(modulePath);
  assert.strictEqual(typeof mod.callHeaderAction, 'function', 'callHeaderAction export missing');
  assert.strictEqual(typeof mod.installHeaderActions, 'function', 'installHeaderActions export missing');

  const called = [];
  const listeners = [];
  const root = {
    console,
    XekhoApp: {},
    openAIAssistant: () => called.push('ai'),
    openStockAlertPopup: () => called.push('stock-alert'),
    hardReloadApp: () => called.push('hard-reload'),
    handleLogout: () => called.push('logout'),
    document: {
      addEventListener(type, listener) { listeners.push({ type, listener }); },
      removeEventListener(type, listener) {
        const index = listeners.findIndex((item) => item.type === type && item.listener === listener);
        if (index >= 0) listeners.splice(index, 1);
      },
    },
  };

  mod.callHeaderAction(root, 'ai');
  mod.callHeaderAction(root, 'stock-alert');
  mod.callHeaderAction(root, 'hard-reload');
  mod.callHeaderAction(root, 'logout');
  assert.deepStrictEqual(called, ['ai', 'stock-alert', 'hard-reload', 'logout'], 'direct action dispatch mismatch');

  const installed = mod.installHeaderActions(root);
  assert.strictEqual(installed.installed, true, 'installer should mark installed');
  assert.strictEqual(installed.selector, '[data-esm-header-action]', 'selector mismatch');
  assert.strictEqual(root.XekhoApp.esm.ui.headerActions, installed, 'installer should publish global headerActions');
  assert.strictEqual(listeners.length, 1, 'expected one click listener');

  let prevented = false;
  listeners[0].listener({
    target: new FakeElement('ai'),
    preventDefault() { prevented = true; },
  });
  assert.strictEqual(prevented, true, 'delegated event should prevent default');
  assert.strictEqual(called[called.length - 1], 'ai', 'delegated event should call AI action');

  installed.uninstall();
  assert.strictEqual(listeners.length, 0, 'uninstall should remove listener');

  const html = fs.readFileSync(indexPath, 'utf8');
  for (const id of ['ai-mic-btn', 'header-alert-btn', 'header-reload-btn', 'header-logout-btn']) {
    const buttonMatch = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`, 's'));
    assert(buttonMatch, `${id} button missing`);
    assert(!/onclick=/.test(buttonMatch[0]), `${id} still has inline onclick`);
    assert(/data-esm-header-action=/.test(buttonMatch[0]), `${id} missing data-esm-header-action`);
  }

  const main = fs.readFileSync(mainPath, 'utf8');
  assert(main.includes("./ui/header-actions.js"), 'main.js should import header-actions');
  assert(main.includes('installHeaderActions(anyRoot)'), 'main.js should install header actions');
  assert(main.includes('20260602-e5-'), 'main.js version not bumped for E5');

  console.log('verify-esm-header-actions passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: listeners.length === 0,
    convertedHeaderButtons: 4,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
