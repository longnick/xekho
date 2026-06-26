/**
 * cap-ota-updater.js
 * Capacitor-only OTA updater. No-op in browser.
 * Loaded by index.html; runs after DOM ready.
 */
(function capOtaUpdater() {
  'use strict';

  const LS_KEY = 'cap_ota_last_attempted';
  const DEFAULT_MANIFEST_URL = 'https://xe-kho.web.app/ota/latest.json';
  const MANIFEST_URL =
    localStorage.getItem('cap_ota_manifest_url') ||
    (window.XEKHO_OTA_MANIFEST_URL || DEFAULT_MANIFEST_URL);

  // Only run inside native Capacitor runtime with CapacitorUpdater plugin.
  function isNative() {
    return (
      typeof window !== 'undefined' &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform() &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.CapacitorUpdater
    );
  }

  async function run() {
    if (!isNative()) return;

    const updater = window.Capacitor.Plugins.CapacitorUpdater;

    // Always notify the app is ready so the native side doesn't roll back.
    try {
      await updater.notifyAppReady();
    } catch (e) {
      console.warn('[cap-ota] notifyAppReady failed', e);
    }

    let manifest;
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (!res.ok) return;
      manifest = await res.json();
    } catch (e) {
      console.warn('[cap-ota] fetch manifest failed', e);
      return;
    }

    if (!manifest || !manifest.enabled || !manifest.version || !manifest.url) return;

    const lastAttempted = localStorage.getItem(LS_KEY);
    if (lastAttempted === manifest.version) return; // already attempted/applied

    try {
      localStorage.setItem(LS_KEY, manifest.version);
      const downloadUrl = new URL(manifest.url, MANIFEST_URL).href;
      const bundle = await updater.download({ version: manifest.version, url: downloadUrl });
      await updater.set(bundle);
      // set() reloads the webview — execution stops here on success
    } catch (e) {
      console.warn('[cap-ota] update failed, blocking retry for same version', e);
      // Don't clear LS_KEY: same version won't loop. Owner publishes new stamp to unblock.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
