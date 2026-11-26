/**
 * ---------------------------------------------------------------------------
 * gridsome-params.js - query string of the settings page (static build only)
 * ---------------------------------------------------------------------------
 * On `gridsome develop` the dev server reads the query string of the settings
 * page. A static build has no server, so this script does it in the browser.
 * It runs in <head>, after the boot data and before theme-init.js:
 *
 *   ?url= &username= &email=   -> boot data (#aioa-boot), read by core.js;
 *                                 the values from gridsome.config.js are kept when missing
 *   &theme=light|dark          -> data-theme on <html> (a saved toggle choice still wins)
 *
 * Integrations that cannot fill in the admin details may send raw placeholders
 * such as "{email}"; those count as missing. The last value wins when a name
 * is repeated.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);

  function param(name) {
    var values = params.getAll(name);
    var value = values.length ? values[values.length - 1] : '';
    return /^\{.*\}$/.test(value.trim()) ? '' : value.replace(/[{}]/g, '').trim();
  }

  var theme = param('theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  var bootEl = document.getElementById('aioa-boot');
  if (!bootEl) {
    return;
  }
  var boot = {};
  try {
    boot = JSON.parse(bootEl.textContent) || {};
  } catch (e) {
    boot = {};
  }
  boot.domain = param('url') || boot.domain || '';
  boot.name = param('username') || boot.name || '';
  boot.email = param('email') || boot.email || '';
  bootEl.textContent = JSON.stringify(boot);
})();
