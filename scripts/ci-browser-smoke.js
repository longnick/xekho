'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(dist, relativePath);
    if (!filePath.startsWith(`${dist}${path.sep}`) && filePath !== path.join(dist, 'index.html')) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (error, content) => {
      if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(); return; }
      res.writeHead(200, { 'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(content);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html is missing; run npm run build:hosting first');
  const server = await startStaticServer();
  const { port } = server.address();
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    const consoleErrors = [];
    const pageErrors = [];
    const badResponses = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(`http://127.0.0.1:${port}`)) badResponses.push(`${response.status()} ${response.url()}`); });
    await page.evaluateOnNewDocument(() => { window.__XEKHO_CI_FIREBASE_MOCK__ = true; });
    await page.goto(`http://127.0.0.1:${port}/?ciBrowserSmoke=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.login-screen', { timeout: 30000 });
    const result = await page.evaluate(() => {
      const login = document.querySelector('.login-screen');
      window.navigate('tables');
      const tables = document.getElementById('page-tables');
      const lockedRoutes = ['inventory', 'finance', 'reports', 'settings'].map(pageName => {
        window.navigate(pageName);
        return { pageName, stayedOnTables: document.getElementById('page-tables')?.classList.contains('active') === true };
      });
      return {
        loginLocked: login?.classList.contains('active') === true,
        tablesActive: tables?.classList.contains('active') === true,
        lockedRoutes,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    const failures = [
      !result.loginLocked && 'login screen is not locked for signed-out mock',
      !result.tablesActive && 'tables screen did not render under the signed-out lock',
      ...result.lockedRoutes.filter(item => !item.stayedOnTables).map(item => `signed-out navigation escaped lock to ${item.pageName}`),
      result.horizontalOverflow && 'mobile horizontal overflow detected',
      ...consoleErrors.map(error => `console error: ${error}`),
      ...pageErrors.map(error => `page error: ${error}`),
      ...badResponses.map(error => `local response error: ${error}`),
    ].filter(Boolean);
    if (failures.length) throw new Error(`CI_BROWSER_SMOKE_FAILED\n${failures.map(failure => `- ${failure}`).join('\n')}`);
    console.log(`CI_BROWSER_SMOKE_OK screen=tables loginLocked=${result.loginLocked} blockedRoutes=${result.lockedRoutes.map(item => item.pageName).join(',')}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
