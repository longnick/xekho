#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'app', 'esm', 'ui', 'image-zoom.js');
const appPath = path.join(root, 'app.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createFakeElement() {
  const listeners = {};
  return {
    clientWidth: 300,
    clientHeight: 200,
    naturalWidth: 600,
    naturalHeight: 400,
    style: {},
    draggable: true,
    addEventListener(name, fn) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(fn);
    },
    removeEventListener(name, fn) {
      listeners[name] = (listeners[name] || []).filter((item) => item !== fn);
    },
    dispatch(name, event) {
      (listeners[name] || []).forEach((fn) => fn(event));
    },
    listenerCount(name) {
      return (listeners[name] || []).length;
    },
  };
}

(async () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  const appSource = fs.readFileSync(appPath, 'utf8');
  assert(source.includes('export function createImageZoomController'), 'image zoom module must export controller factory');
  assert(source.includes('export function installGlobalImageZoom'), 'image zoom module must export installer');
  assert(appSource.includes('ESM Phase E4: delegate to app/esm/ui/image-zoom.js'), 'app.js ImgZoom wrapper must contain E4 delegation marker');

  const dataUrl = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source);
  const mod = await import(dataUrl);
  assert(typeof mod.createImageZoomController === 'function', 'createImageZoomController export missing');
  assert(typeof mod.installGlobalImageZoom === 'function', 'installGlobalImageZoom export missing');

  const controller = mod.createImageZoomController();
  const wrap = createFakeElement();
  const img = createFakeElement();
  controller.attach(wrap, img);
  assert(controller.getState().attached === true, 'controller should attach');
  assert(img.style.transformOrigin === 'center center', 'image transform origin should be initialized');
  assert(img.draggable === false, 'image should be non-draggable');
  assert(wrap.listenerCount('touchstart') === 1, 'touchstart listener should attach');
  assert(wrap.listenerCount('wheel') === 1, 'wheel listener should attach');

  let prevented = false;
  wrap.dispatch('wheel', { deltaY: -1, preventDefault() { prevented = true; } });
  assert(prevented === true, 'wheel should prevent default');
  assert(controller.getState().scale > 1, 'wheel zoom should increase scale');
  assert(String(img.style.transform).includes('scale('), 'transform should update after wheel zoom');

  controller.reset();
  assert(controller.getState().scale === 1, 'reset should restore scale');
  controller.detach();
  assert(controller.getState().attached === false, 'controller should detach');
  assert(wrap.listenerCount('touchstart') === 0, 'touchstart listener should detach');

  const win = { XekhoApp: {} };
  const installed = mod.installGlobalImageZoom(win);
  assert(installed && typeof installed.attach === 'function', 'installer should return controller');
  assert(win.XekhoApp.esm.ui.imageZoom === installed, 'installer should publish XekhoApp.esm.ui.imageZoom');
  assert(win.ImgZoom === installed, 'installer should publish compatibility ImgZoom when absent');

  console.log('verify-esm-ui-image-zoom passed', {
    exports: Object.keys(mod).sort(),
    listenersDetached: wrap.listenerCount('touchstart') === 0,
    installed: Boolean(win.XekhoApp.esm.ui.imageZoom),
  });
})();
