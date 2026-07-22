#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const modulePath = path.join(repo, 'app/esm/ui/modal-overlay-controls.js');

function makeClassList() {
  const classes = new Set(['active']);
  return {
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

function makeElement(attrs = {}) {
  const el = {
    attrs,
    classList: makeClassList(),
    getAttribute(name) { return this.attrs[name] || null; },
    closest(selector) {
      if (selector === '[data-esm-modal-self-dismiss]' && this.attrs['data-esm-modal-self-dismiss'] !== undefined) return this;
      if (selector === '[data-esm-modal-close]' && this.attrs['data-esm-modal-close'] !== undefined) return this;
      if (selector === '[data-esm-modal-close-self]' && this.attrs['data-esm-modal-close-self'] !== undefined) return this;
      if (selector === '[data-esm-image-zoom-self-dismiss]' && this.attrs['data-esm-image-zoom-self-dismiss'] !== undefined) return this;
      if (selector === '[data-esm-image-zoom-close]' && this.attrs['data-esm-image-zoom-close'] !== undefined) return this;
      if (selector === '[data-esm-image-zoom-reset]' && this.attrs['data-esm-image-zoom-reset'] !== undefined) return this;
      return null;
    },
  };
  return el;
}

async function importModule() {
  const source = fs.readFileSync(modulePath, 'utf8');
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
}

(async () => {
  const mod = await importModule();
  assert.strictEqual(typeof mod.dismissModal, 'function');
  assert.strictEqual(typeof mod.dismissImageZoomModal, 'function');
  assert.strictEqual(typeof mod.closeModalById, 'function');
  assert.strictEqual(typeof mod.closeImageZoomModal, 'function');
  assert.strictEqual(typeof mod.resetImageZoom, 'function');
  assert.strictEqual(typeof mod.installModalOverlayControls, 'function');

  const listeners = [];
  let detachCount = 0;
  let resetCount = 0;
  const modalById = {
    photo: makeElement({}),
    basic: makeElement({}),
  };
  const root = {
    XekhoApp: {},
    ImgZoom: {
      detach() { detachCount += 1; },
      reset() { resetCount += 1; },
    },
    document: {
      addEventListener(type, handler) { listeners.push({ type, handler }); },
      removeEventListener(type, handler) {
        const idx = listeners.findIndex((item) => item.type === type && item.handler === handler);
        if (idx >= 0) listeners.splice(idx, 1);
      },
      getElementById(id) { return modalById[id] || null; },
    },
  };

  const api = mod.installModalOverlayControls(root);
  assert.strictEqual(api.installed, true);
  assert.strictEqual(root.XekhoApp.esm.ui.modalOverlayControls, api);
  assert.strictEqual(listeners.length, 1);

  const modal = makeElement({ 'data-esm-modal-self-dismiss': '' });
  listeners[0].handler({ target: modal });
  assert.strictEqual(modal.classList.contains('active'), false);

  const zoomModal = makeElement({ 'data-esm-image-zoom-self-dismiss': '' });
  listeners[0].handler({ target: zoomModal });
  assert.strictEqual(zoomModal.classList.contains('active'), false);
  assert.strictEqual(detachCount, 1);

  const closeBasic = makeElement({ 'data-esm-modal-close': 'basic' });
  listeners[0].handler({ target: closeBasic, preventDefault() {} });
  assert.strictEqual(modalById.basic.classList.contains('active'), false);

  modalById.basic = makeElement({});
  const closeSelf = makeElement({ 'data-esm-modal-close-self': 'basic' });
  listeners[0].handler({ target: closeSelf });
  assert.strictEqual(modalById.basic.classList.contains('active'), false);

  const reset = makeElement({ 'data-esm-image-zoom-reset': '' });
  listeners[0].handler({ target: reset, preventDefault() {} });
  assert.strictEqual(resetCount, 1);

  const close = makeElement({ 'data-esm-image-zoom-close': 'photo' });
  listeners[0].handler({ target: close, preventDefault() {} });
  assert.strictEqual(modalById.photo.classList.contains('active'), false);
  assert.strictEqual(detachCount, 2);

  api.detach();
  assert.strictEqual(api.installed, false);
  assert.strictEqual(listeners.length, 0);

  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const count = (re) => [...html.matchAll(re)].length;
  assert.strictEqual(count(/if\(event\.target===this\)this\.classList\.remove\('active'\)/g), 0);
  assert.strictEqual(count(/if\(event\.target===this\)\{this\.classList\.remove\('active'\);ImgZoom\.detach\(\);\}/g), 0);
  assert.strictEqual(count(/onclick="ImgZoom\.reset\(\)"/g), 0);
  assert.strictEqual(count(/data-esm-modal-self-dismiss/g), 15);
  assert.strictEqual(count(/data-esm-modal-close=/g), 19);
  assert.strictEqual(count(/data-esm-modal-close-self=/g), 1);
  assert.strictEqual(count(/data-esm-image-zoom-self-dismiss/g), 2);
  assert.strictEqual(count(/data-esm-image-zoom-reset/g), 2);
  assert.strictEqual(count(/data-esm-image-zoom-close=/g), 2);

  console.log('verify-esm-modal-overlay-controls passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: listeners.length === 0,
    modalSelfDismiss: count(/data-esm-modal-self-dismiss/g),
    modalClose: count(/data-esm-modal-close=/g),
    modalCloseSelf: count(/data-esm-modal-close-self=/g),
    imageZoomSelfDismiss: count(/data-esm-image-zoom-self-dismiss/g),
    imageZoomReset: count(/data-esm-image-zoom-reset/g),
    imageZoomClose: count(/data-esm-image-zoom-close=/g),
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
