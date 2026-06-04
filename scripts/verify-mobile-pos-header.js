'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const offlineStatusUi = fs.readFileSync(path.join(root, 'offlineStatusUI.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(
  indexHtml.includes('id="current-user-display" class="header-user-chip"'),
  'current user display uses reusable compact header-user-chip class'
);
assert(
  !indexHtml.includes('id="current-user-display"\n          style='),
  'old inline current-user-display style is removed'
);
assert(
  appJs.includes('class="header-user-name"') && appJs.includes('aria-hidden="true"'),
  'applyRoleRights renders user text inside shrink-safe header-user-name span'
);
assert(
  css.includes('.app-header {') && css.includes('max-width: 100vw;') && css.includes('overflow: hidden;'),
  'app header is capped to viewport and clips overflow'
);
assert(
  css.includes('.header-logo {') && css.includes('max-width: 46%;') && css.includes('min-width: 0;'),
  'brand block has shrink-safe width limits'
);
assert(
  css.includes('.header-actions {') && css.includes('flex: 0 1 auto;') && css.includes('overflow: hidden;'),
  'header actions can shrink instead of pushing outside viewport'
);
assert(
  css.includes('.header-user-chip {') && css.includes('max-width: 112px;') && css.includes('text-overflow: ellipsis;'),
  'user chip is bounded and ellipsized'
);
assert(
  css.includes('@media (max-width: 430px)') && css.includes('max-width: 35%;') && css.includes('flex-basis: 32px;'),
  'mobile breakpoint tightens brand/actions for iPhone widths'
);
assert(
  offlineStatusUi.includes("return 'OK';") && !offlineStatusUi.includes("return 'Offline: OK';"),
  'offline status badge uses compact OK label in the header'
);
assert(
  offlineStatusUi.includes('max-width: 72px;') && offlineStatusUi.includes('flex: 0 1 72px;'),
  'offline status badge width is bounded for header layout'
);
assert(
  offlineStatusUi.includes("badge.textContent = '...';") && !offlineStatusUi.includes("badge.textContent = 'Offline: ...';"),
  'initial offline badge placeholder is compact'
);

console.log('verify-mobile-pos-header passed');
