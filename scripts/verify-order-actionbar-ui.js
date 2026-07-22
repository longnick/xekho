'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(
  html.includes('style.css?v=20260626-order-actionbar'),
  'index.html bumps the stylesheet cache key for the order action bar update'
);
assert(
  html.includes('aria-label="Giỏ hàng và xuất bill nhanh"'),
  'order action bar has a combined accessible label'
);
assert(
  html.includes('order-cart-pill-btn order-cart-pill-btn-cart') && html.includes('order-cart-pill-btn order-cart-pill-btn-bill'),
  'cart and bill actions are separate explicit buttons'
);
assert(
  html.includes('<span class="order-cart-pill-label">Giỏ</span>') && html.includes('<span class="order-cart-pill-label">Xuất bill</span>'),
  'mobile action labels are explicit and short'
);
assert(
  !html.includes('id="order-cart-pill" style='),
  'old inline order-cart-pill styles are removed'
);
assert(
  !html.includes('width:1.5px; height:20px; background:var(--border)'),
  'old inline divider style is removed'
);

assert(
  /@media \(max-width:\s*767px\) \{[\s\S]*\.order-cart-pill\s*\{[\s\S]*left:\s*12px;[\s\S]*right:\s*12px;[\s\S]*bottom:\s*calc\(var\(--nav-height\) \+ var\(--safe-bottom\) \+ 8px\);[\s\S]*height:\s*48px;[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*minmax\(0,\s*0\.92fr\) minmax\(0,\s*1\.08fr\);[\s\S]*padding:\s*4px;/.test(css),
  'mobile order action bar uses approved iPhone-tested full-width 48px layout above bottom nav'
);
assert(
  /@media \(max-width:\s*767px\) \{[\s\S]*\.order-cart-pill-btn\s*\{[\s\S]*height:\s*40px;[\s\S]*min-height:\s*40px;[\s\S]*padding:\s*0 10px;[\s\S]*border-radius:\s*14px;/.test(css),
  'mobile cart/bill buttons use approved 40px touch target sizing'
);
assert(
  /@media \(max-width:\s*767px\) \{[\s\S]*\.order-cart-pill-btn-cart\s*\{\s*background:\s*rgba\(255,255,255,0\.08\);\s*\}[\s\S]*\.order-cart-pill-btn-bill\s*\{\s*background:\s*#E10600;\s*color:\s*#fff;\s*\}/.test(css),
  'mobile cart is secondary and bill is the red primary action'
);
assert(
  /@media \(max-width:\s*767px\) \{[\s\S]*\.order-pane-menu\s*\{\s*padding-bottom:\s*72px;\s*\}[\s\S]*\.menu-grid\s*\{\s*margin-bottom:\s*72px;\s*\}/.test(css),
  'menu list reserves 72px so food cards do not sit under the action bar'
);
assert(
  !css.includes('left: 50%; transform: translateX(-50%)') && !css.includes('bottom: calc(var(--nav-height) + var(--safe-bottom) + 14px); height: 52px'),
  'old centered floating 52px pill positioning is removed'
);

console.log('verify-order-actionbar-ui passed');
