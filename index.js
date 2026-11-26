/**
 * ---------------------------------------------------------------------------
 * All in One Accessibility® - Gridsome plugin (Server API)
 * ---------------------------------------------------------------------------
 * 1. Widget: every page of the website gets the All in One Accessibility widget
 *    script (gridsome.client.js). At build time the plugin asks Skynet whether the
 *    website was registered from the EU, and then uses the EU widget script.
 *
 * 2. Settings page: the page a site owner uses to set up the widget (color, size,
 *    position, icon, paid features, accessibility score and the dashboard link).
 *    It is its own HTML document (lib/view.js), so the website's CSS and the
 *    widget never load on it. Gridsome has no admin panel, so by default the page
 *    only exists while `gridsome develop` runs on the site owner's computer:
 *
 *      http://localhost:8080/gridsome-plugin-all-in-one-accessibility/
 *
 *    Routes added to the dev server:
 *      GET  <settingsPath>/                  The settings page. Reads ?url=, ?username=, ?email=, ?theme=
 *      POST <settingsPath>/route?action=...  AJAX route used by the page. Every response is JSON.
 *      GET  <settingsPath>/assets/...        CSS, JavaScript and icons
 *
 *    With `settingsPage: true` the page is also written by `gridsome build`, to
 *    dist/<settingsPath>/index.html. A static website has no server, so that page
 *    reads its query string and runs the route in the browser.
 *
 * A website that is not registered yet is registered for the free widget (once)
 * as soon as the settings page opens, with no_required_eu from ipapi.co (EU or not):
 *   with an email     name = admin name (or the website), email = admin email
 *   without an email  name = admin name (or the website), email = no-reply@<website>
 *
 * Route actions (lib/skynet-widget.js):
 *   fetchWidgetSettings  Load settings ({"not_registered": true} for a new website; never registers)
 *   registerDomain       Register the free widget for a new website (once), with no_required_eu
 *   getDashboardLink     Dashboard sign-in link, manage_domain from check-website (paid plans)
 *   fetchScanDetails     Accessibility Score tab: scan results of a domain (paid plans)
 *
 * Plugin options (gridsome.config.js), all optional:
 *   domain        Website domain. Default: the domain of siteUrl
 *   settingsPage  'development' (default) | true | false
 *   settingsPath  Default: '/gridsome-plugin-all-in-one-accessibility'
 *   adminName     Admin name sent when the website is registered
 *   adminEmail    Admin email sent when the website is registered
 *   widget        Add the widget to the website. Default: true
 *   region        Widget script: 'auto' (default) | 'global' | 'eu'
 */

const fs = require('fs')
const path = require('path')
const config = require('./lib/config')
const SkynetWidget = require('./lib/skynet-widget')
const { renderPage } = require('./lib/view')
const { aioaRequest, lastValue, normalizePath } = require('./lib/helpers')
const { version } = require('./package.json')

const ASSETS_DIR = path.join(__dirname, 'assets')
const LIB_DIR = path.join(__dirname, 'lib')
const BROWSER_DIR = path.join(__dirname, 'browser')
const LOG_PREFIX = 'All in One Accessibility:'

// Seconds the build waits for the widget region (global or EU) before it uses the global script
const REGION_TIMEOUT = 8

// Content types of the files in assets/
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
}

function AllInOneAccessibility (api, options) {
  const defaults = AllInOneAccessibility.defaultOptions()
  const opts = Object.assign({}, defaults, options)

  const isProd = process.env.NODE_ENV === 'production'
  const settingsPath = normalizePath(opts.settingsPath) || defaults.settingsPath
  const hasSettingsPage = opts.settingsPage === true || (opts.settingsPage === 'development' && !isProd)
  const domain = websiteDomain(opts.domain, api.config.siteUrl)
  const adminName = String(opts.adminName || '').trim()
  const adminEmail = String(opts.adminEmail || '').trim()

  /* ---------- Widget on every page ---------- */

  // loadSource runs before Gridsome writes the client code, so these options reach gridsome.client.js
  api.loadSource(async () => {
    const scriptBase = opts.widget === false ? '' : await widgetScriptBase(opts.region, domain)

    api.setClientOptions({
      widget: opts.widget !== false,
      scriptUrl: scriptBase ? scriptBase + config.AIOA_WIDGET_QUERY : '',
      scriptId: config.AIOA_WIDGET_SCRIPT_ID,
      // Links to the settings page always open it with a full page load
      settingsPath: hasSettingsPage ? settingsPath : ''
    })
  })

  if (!hasSettingsPage) {
    return
  }

  /* ---------- Settings page: gridsome develop ---------- */

  api.configureServer((app) => {
    // The dev server never uses a path prefix
    const base = settingsPath + '/'

    app.use(settingsPath + '/assets', serveAssets)

    /**
     * Platform integration point: answer 401 / 403 in requireAdmin when a request must not
     * reach the settings page or its route. The dev server runs on the site owner's computer,
     * so every request is let through.
     */
    const requireAdmin = (req, res, next) => next()

    app.get(settingsPath, requireAdmin, (req, res) => {
      // The page loads its assets and route relative to the folder: always open it with a trailing slash
      const url = new URL(req.originalUrl, 'http://localhost')
      if (!url.pathname.endsWith('/')) {
        res.redirect(302, url.pathname + '/' + url.search)
        return
      }

      const query = aioaRequest(req.query)
      const html = renderPage({
        domain: query.url || domain,
        name: query.username || adminName,
        email: query.email || adminEmail,
        theme: query.theme,
        base: base,
        routeUrl: base + 'route',
        version: version,
        isStatic: false
      })

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('X-Robots-Tag', 'noindex, nofollow')
      res.end(html)
    })

    app.all(settingsPath + '/route', requireAdmin, (req, res) => {
      // Only POST requests are accepted
      if (req.method !== 'POST') {
        sendJson(res, { error: 'Method Not Allowed.' }, 405)
        return
      }

      readForm(req)
        .then((fields) => SkynetWidget.route(lastValue(req.query.action), fields))
        .then((result) => sendJson(res, result))
        .catch((err) => {
          console.error(LOG_PREFIX, err)
          sendJson(res, { error: 'Unable to process the request. Please try again.' }, 500)
        })
    })

    console.log(`${LOG_PREFIX} settings page ${base} (website: ${domain || 'not set'})`)
    if (!domain || domain === 'localhost') {
      console.log(`${LOG_PREFIX} set siteUrl (or the plugin option "domain") to your live website before you save settings.`)
    }
  })

  /* ---------- Settings page: gridsome build (settingsPage: true) ---------- */

  api.afterBuild(({ config: buildConfig }) => {
    const folder = path.join(buildConfig.outputDir, settingsPath)
    const base = buildConfig.pathPrefix + settingsPath + '/'

    copyDir(ASSETS_DIR, path.join(folder, 'assets'))
    fs.copyFileSync(path.join(BROWSER_DIR, 'gridsome-params.js'), path.join(folder, 'assets', 'js', 'gridsome-params.js'))
    fs.writeFileSync(path.join(folder, 'assets', 'js', 'gridsome-route.js'), browserRoute())

    fs.writeFileSync(path.join(folder, 'index.html'), renderPage({
      domain: domain,
      name: adminName,
      email: adminEmail,
      theme: '',
      base: base,
      routeUrl: '',
      version: version,
      isStatic: true
    }))

    console.log(`${LOG_PREFIX} settings page written to ${path.relative(buildConfig.context || process.cwd(), folder)}/index.html`)
  })
}

AllInOneAccessibility.defaultOptions = () => ({
  domain: '',
  settingsPage: 'development',
  settingsPath: '/gridsome-plugin-all-in-one-accessibility',
  adminName: '',
  adminEmail: '',
  widget: true,
  region: 'auto'
})

module.exports = AllInOneAccessibility

/* =======================================================================
 * Helpers
 * ===================================================================== */

/** Website domain: the plugin option "domain", otherwise the domain of siteUrl ('' when neither is valid) */
function websiteDomain (domainOption, siteUrl) {
  for (const value of [domainOption, siteUrl]) {
    const domain = SkynetWidget.normalizeDomain(value)
    if (SkynetWidget.isValidDomain(domain)) {
      return domain
    }
  }
  return ''
}

/**
 * Widget script for the website (without the query string):
 *   region 'eu' / 'global'  that script
 *   region 'auto'           the EU script when the website was registered from the EU
 *                           (no_required_eu = 0), otherwise the global script
 */
async function widgetScriptBase (region, domain) {
  if (region === 'eu') {
    return config.AIOA_WIDGET_SCRIPT_EU
  }
  if (region === 'global' || !domain) {
    return config.AIOA_WIDGET_SCRIPT
  }
  const detected = await SkynetWidget.getWidgetRegion(domain, REGION_TIMEOUT)
  return detected === 'eu' ? config.AIOA_WIDGET_SCRIPT_EU : config.AIOA_WIDGET_SCRIPT
}

/**
 * assets/js/gridsome-route.js for a static build: lib/config.js and lib/skynet-widget.js
 * wrapped for the browser, replacing AIOA.api.route (loaded right after core.js).
 */
function browserRoute () {
  const module = (name, file) => `  ${JSON.stringify(name)}: function (module, exports, require) {\n${fs.readFileSync(path.join(LIB_DIR, file), 'utf8')}\n  }`

  return `/**
 * gridsome-route.js - the settings route, in the browser (static build only)
 * Written by gridsome-plugin-all-in-one-accessibility ${version} from lib/config.js and
 * lib/skynet-widget.js. The Skynet APIs allow these browser calls.
 *
 * Note: without a server, the browser receives the whole check-website answer
 * (it also holds the widget api_key and a second sign-in link). Only
 * manage_domain is used, and nothing is stored or logged.
 */
(function (window) {
  'use strict';

  var modules = {
${module('./config', 'config.js')},
${module('./skynet-widget', 'skynet-widget.js')}
  };

  var cache = {};
  function require (name) {
    if (!cache[name]) {
      var module = { exports: {} };
      cache[name] = module;
      modules[name](module, module.exports, require);
    }
    return cache[name].exports;
  }

  /** Same contract as the server route: resolves with the JSON answer of the action */
  window.AIOA.api.route = require('./skynet-widget').route;
})(window);
`
}

/** Static files from assets/ (dev server). Only .css, .js and .svg files inside assets/ are served. */
function serveAssets (req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next()
  }

  let relative
  try {
    relative = decodeURIComponent(req.path || '/')
  } catch (err) {
    return next()
  }

  const file = path.join(ASSETS_DIR, path.normalize(relative))
  const type = MIME_TYPES[path.extname(file)]
  if (!type || !file.startsWith(ASSETS_DIR + path.sep)) {
    return next()
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      return next()
    }
    res.setHeader('Content-Type', type)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Cache-Control', 'no-cache')
    if (req.method === 'HEAD') {
      return res.end()
    }
    fs.createReadStream(file).pipe(res)
  })
}

/** Form fields of a POST request (application/x-www-form-urlencoded); the last value of a name wins */
function readForm (req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 100000) {
        reject(new Error('Request body too large.'))
        req.destroy()
      }
    })
    req.on('end', () => {
      const fields = {}
      new URLSearchParams(body).forEach((value, key) => {
        fields[key] = value
      })
      resolve(fields)
    })
    req.on('error', reject)
  })
}

function sendJson (res, data, status) {
  res.statusCode = status || 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

/** Copy the .css, .js and .svg files of a folder (and its sub folders) */
function copyDir (from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name)
    const target = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(source, target)
    } else if (MIME_TYPES[path.extname(entry.name)]) {
      fs.copyFileSync(source, target)
    }
  }
}
