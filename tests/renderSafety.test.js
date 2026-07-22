const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadDomUtils() {
  const window = {};
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'utils', 'dom.js'), 'utf8');
  vm.runInNewContext(source, { window, globalThis: window, String, URL });
  return window.XekhoApp.utils.dom;
}

describe('render-safety DOM helpers', () => {
  test('escapes HTML text instead of preserving executable markup', () => {
    const dom = loadDomUtils();
    expect(dom.escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('only accepts HTTPS or constrained raster data-image URLs for image src', () => {
    const dom = loadDomUtils();
    expect(dom.safeImageUrl('javascript:alert(1)')).toBe('');
    expect(dom.safeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(dom.safeImageUrl('http://cdn.example/logo.webp')).toBe('');
    expect(dom.safeImageUrl('https://cdn.example/logo.webp')).toBe('https://cdn.example/logo.webp');
    expect(dom.safeImageUrl('data:image/png;base64,aGVsbG8=')).toBe('data:image/png;base64,aGVsbG8=');
  });

  test('sets a safe image source through DOM attributes and rejects unsafe URLs', () => {
    const dom = loadDomUtils();
    const image = { setAttribute: jest.fn() };
    expect(dom.setSafeImageSource(image, 'javascript:alert(1)')).toBe(false);
    expect(image.setAttribute).not.toHaveBeenCalled();

    expect(dom.setSafeImageSource(image, 'https://cdn.example/logo.webp')).toBe(true);
    expect(image.setAttribute).toHaveBeenCalledWith('src', 'https://cdn.example/logo.webp');
  });

  test('routes both persisted-logo render paths through the safe image helper', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    expect(appSource).toContain("_replaceWithSafeImage(logoIcon, s.storeLogo, 'Logo cửa hàng'");
    expect(appSource).toContain("_replaceWithSafeImage(logoPreview, s.storeLogo, 'Logo cửa hàng'");
    expect(appSource).not.toContain('innerHTML = `<img src=\"${s.storeLogo}\"');
  });

  test('requires safe URL and text boundaries for menu and purchase image renderers', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    expect(appSource).toContain('const safeMenuName = _escapeHtml(m.name || \'\');');
    expect(appSource).toContain('const imageUrl = _safeImageUrl(getMenuItemImageUrl(item));');
    expect(appSource).toContain('const safeDataUrl = _safeImageUrl(ph.dataUrl);');
    expect(appSource).toContain('if (!_setSafeImageSource(img, photo.dataUrl))');
  });

  test('routes purchase-photo manager thumbnail through safe URL and handler boundaries', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    expect(appSource).not.toContain('<img src="${e.photos[0].dataUrl}"');
    expect(appSource).not.toContain("openPurchasePhotoFullFromBatch('${e.batchId}', 0)");
    expect(appSource).not.toContain("viewPurchasePhotoBatch('${e.batchId}')");
    expect(appSource).not.toContain("deletePurchasePhotoBatch('${e.batchId}')");
    expect(appSource).toContain('const safeThumbnailUrl = _safeImageUrl(e.photos[0]?.dataUrl);');
    expect(appSource).toContain('const safeBatchId = _escapeHtml(_escapeJsString(e.batchId));');
    expect(appSource).toContain('<img src="${_escapeHtml(safeThumbnailUrl)}"');
    expect(appSource).toContain('onclick="openPurchasePhotoFullFromBatch(${safeBatchId}, 0)"');
    expect(appSource).toContain('onclick="viewPurchasePhotoBatch(${safeBatchId})"');
    expect(appSource).toContain('onclick="deletePurchasePhotoBatch(${safeBatchId})"');

    const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(indexSource).toContain('app.js?v=20260722-pin-fast-path');
  });
});
