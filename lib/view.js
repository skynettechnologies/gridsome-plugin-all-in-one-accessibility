/**
 * ---------------------------------------------------------------------------
 * All in One Accessibility - settings page HTML
 * ---------------------------------------------------------------------------
 * The page markup of the Main Source Code (views/layout.ejs and
 * views/partials/*.ejs in the JavaScript version), written as template
 * literals so the plugin needs no template engine. Each function below is one
 * EJS file and prints the same HTML.
 *
 * renderPage(page) returns the whole document. page:
 *   domain, name, email  boot data (any may be empty)
 *   theme                'light' | 'dark' | '' (follow the system)
 *   base                 URL of the settings page folder, with a trailing slash
 *                        (assets are loaded from <base>assets/)
 *   routeUrl             server route (gridsome develop), '' on a static build
 *   version              plugin version, added to the asset URLs
 *   isStatic             true on a static build: the browser reads the query string
 *                        (gridsome-params.js) and runs the route itself (gridsome-route.js)
 */

const cfg = require('./config')
const { aioaSlug: slug, escapeHtml: e, jsonForScript } = require('./helpers')

// Stylesheets in cascade order (assets/css)
const STYLES = [
  'tokens.css', // colors and sizes, light + dark theme
  'base.css', // reset, typography, page layout, header
  'components.css', // buttons, cards, fields, toasts, loader
  'banners.css', // plan notices (free / paid) and the site line
  'settings.css', // color, widget size, position, icon type / size, save bar
  'tabs.css', // tabs and the free plan lock overlay
  'paid.css', // Paid Features tab: links, switches, mobile position
  'score.css', // Accessibility Score tab
  'responsive.css' // phone overrides
]

// Scripts in dependency order (assets/js). All are deferred, so they run in
// this order once the HTML has been parsed.
const SCRIPTS = [
  'core.js', // namespace, config, state, helpers, API calls
  'ui.js', // toasts, busy buttons, view switching
  'theme.js', // light / dark toggle
  'tabs.js', // Appearance Design / Paid Features / Accessibility Score tabs, order and locks by plan
  'plan.js', // free / paid notices, site line, tabs for the plan
  'paid-features.js', // Paid Features tab: links, switches, widget position for mobile
  'score.js', // Accessibility Score tab (scan results)
  'settings-form.js', // read and fill the settings form, color picker
  'save.js', // "Save Changes"
  'dashboard.js', // paid plan "Dashboard" button (sign-in link from check-website)
  'app.js' // loads the website (registers it once when new) and starts the page
]

// Lock icon (tabs and the free plan overlay)
const LOCK_SVG = '<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />'

/* =======================================================================
 * views/layout.ejs
 * ===================================================================== */

function renderPage (page) {
  const assetBase = page.base + 'assets/'
  const iconBase = assetBase + 'images/icons/'
  const asset = (file) => e(assetBase + file + '?v=' + encodeURIComponent(page.version || '1'))

  // Data handed to the JavaScript; read by assets/js/core.js
  const boot = {
    domain: page.domain || '',
    name: page.name || '',
    email: page.email || '',
    iconBase: iconBase,
    defaultColor: cfg.AIOA_DEFAULT_COLOR,
    routeUrl: page.routeUrl || '',
    apiUpdateUrl: cfg.AIOA_UPDATE_API,
    geoApiUrl: cfg.AIOA_GEO_API
  }

  // Static build: the route runs in the browser, right after core.js
  const scripts = page.isStatic
    ? [SCRIPTS[0], 'gridsome-route.js'].concat(SCRIPTS.slice(1))
    : SCRIPTS

  const theme = page.theme === 'light' || page.theme === 'dark' ? page.theme : ''
  const ctx = { iconBase: iconBase }

  return `<!doctype html>
<html lang="en"${theme ? ` data-theme="${theme}"` : ''}>

<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <meta name="googlebot" content="noindex, nofollow">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="All in One Accessibility widget settings" />
  <title>All in One Accessibility Settings</title>
${page.isStatic ? `
  <!-- Boot data for the scripts (assets/js/core.js). gridsome-params.js adds url, username, email and theme from the query string -->
  <script id="aioa-boot" type="application/json">${jsonForScript(boot)}</script>
  <script src="${asset('js/gridsome-params.js')}"></script>
` : ''}
  <!-- Applies the saved light / dark choice before the first paint (no flash) -->
  <script src="${asset('js/theme-init.js')}"></script>

${STYLES.map((style) => `  <link rel="stylesheet" href="${asset('css/' + style)}">`).join('\n')}
</head>

<body>

  <div class="aioa-page">

${header()}

    <main>
${status()}

      <!-- Settings (shown once loading has finished) -->
      <div id="settings_block" hidden>
${upgradeBanner()}
${paidBanner()}
${siteStrip()}
${settingsForm(ctx)}
      </div>
    </main>
  </div>

  <!-- Toast notifications (assets/js/ui.js) -->
  <div class="aioa-toasts" id="toasts" aria-live="polite"></div>
${page.isStatic ? '' : `
  <!-- Boot data for the scripts -->
  <script id="aioa-boot" type="application/json">${jsonForScript(boot)}</script>
`}
${scripts.map((script) => `  <script src="${asset('js/' + script)}" defer></script>`).join('\n')}

</body>

</html>
`
}

/* =======================================================================
 * views/partials/header.ejs
 * Page header: logo, page title and the light / dark theme toggle (assets/js/theme.js).
 * ===================================================================== */

function header () {
  return `    <header class="aioa-header">
      <div class="aioa-brand">
        <svg class="aioa-logo" viewBox="0 0 81.296 81.296" aria-hidden="true" focusable="false">
          <circle class="aioa-logo-circle" cx="40.648" cy="40.648" r="40.648" />
          <path fill="#fff" transform="translate(6.249 6.244)" d="${cfg.AIOA_LOGO_PATH}" />
        </svg>
        <div>
          <h1>All in One Accessibility<sup>&reg;</sup></h1>
          <p>Powered by Skynet Technologies</p>
        </div>
      </div>

      <!-- Theme toggle: shows the moon in light mode and the sun in dark mode -->
      <button type="button" class="aioa-btn aioa-btn-icon aioa-theme-toggle" id="theme-toggle" aria-label="Switch to dark mode">
        <svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        <svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      </button>
    </header>`
}

/* =======================================================================
 * views/partials/status.ejs
 * Loading and error states. Only one of #load, #error_block and
 * #settings_block is visible at a time (AIOA.ui.setView in assets/js/ui.js).
 * ===================================================================== */

function status () {
  return `      <!-- Loading -->
      <div id="load" class="aioa-loading" role="status">
        <span class="aioa-spinner" aria-hidden="true"></span>
        <span>Loading your widget settings…</span>
      </div>

      <!-- Error (settings could not be loaded); title and text set by assets/js/app.js -->
      <section id="error_block" class="aioa-card aioa-error-card" hidden>
        <h2 id="error-title">We couldn't load your widget settings</h2>
        <p id="error-message">Please check your connection and try again.</p>
        <button type="button" class="aioa-btn aioa-btn-primary" id="retry-btn">Try again</button>
      </section>`
}

/* =======================================================================
 * views/partials/upgrade-banner.ejs
 * Free plan: purple "Upgrade to Paid Plan" banner.
 * Shown when the registered website is on the free widget (is_free_widget = 1).
 * ===================================================================== */

function upgradeBanner () {
  return `        <section id="free_plan_upgrade_block" class="aioa-upgrade" aria-labelledby="upgrade-title" hidden>
          <!-- Large faded accessibility figure in the top right corner -->
          <svg class="aioa-upgrade-watermark" viewBox="0 0 69 69" fill="#fff" aria-hidden="true" focusable="false"><path d="${cfg.AIOA_LOGO_PATH}" /></svg>

          <!-- Title, what the paid plan adds, call to action -->
          <div class="aioa-upgrade-head">
            <div class="aioa-upgrade-intro">
              <p class="aioa-upgrade-tag"><i aria-hidden="true"></i>Free plan active</p>
              <h2 id="upgrade-title">With 24 Features</h2>
              <p>Upgrade to unlock <strong>100+ Premium Accessibility Features</strong> and make your website even more inclusive.</p>
              <ul class="aioa-upgrade-points">
                <li>190+ Supported languages</li>
                <li>12 Accessibility Profiles</li>
              </ul>
            </div>
            <div class="aioa-upgrade-cta">
              <a href="${e(cfg.AIOA_UPGRADE_URL)}" data-upgrade-link target="_blank" rel="noopener" class="aioa-btn-white">
                Upgrade to Paid Plan
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                <span class="visually-hidden">(opens in a new tab)</span>
              </a>
              <small>10-day free trial &middot; Cancel anytime</small>
            </div>
          </div>

          <!-- Note -->
          <p class="aioa-upgrade-note">
            <b>NOTE:</b> Currently, All in One Accessibility is dedicated to enhancing accessibility specifically for websites and online stores.
          </p>
        </section>`
}

/* =======================================================================
 * views/partials/paid-banner.ejs
 * Paid plan notice with the "Dashboard" button (is_free_widget = 0). The button
 * opens the dashboard with the sign-in link (manage_domain from check-website)
 * that assets/js/dashboard.js loads as soon as the plan is known to be paid.
 * ===================================================================== */

function paidBanner () {
  return `        <section id="paid_plan_block" class="aioa-notice" aria-labelledby="paid-title" hidden>
          <div class="aioa-notice-body">
            <p class="aioa-tag is-success">Paid plan active</p>
            <h2 id="paid-title">All pro features are unlocked</h2>
            <p>Manage features, accessibility reports and widget analytics from your dashboard.</p>
          </div>
          <div class="aioa-notice-action">
            <button type="button" class="aioa-btn aioa-btn-primary" data-aioa-dashboard>
              Dashboard
              <span class="visually-hidden">(opens in a new tab)</span>
            </button>
          </div>
        </section>`
}

/* =======================================================================
 * views/partials/site-strip.ejs
 * "Widget installed on <domain>" line (text set by AIOA.plan.render in assets/js/plan.js).
 * ===================================================================== */

function siteStrip () {
  return `        <p class="aioa-site">
          <span class="aioa-site-dot" aria-hidden="true"></span>
          <span id="site-text"></span>
        </p>`
}

/* =======================================================================
 * views/partials/settings-form.ejs
 * Tabs + widget settings form, read and filled by assets/js/settings-form.js
 * (+ paid-features.js) and saved by assets/js/save.js.
 * ===================================================================== */

function settingsForm (ctx) {
  return `${tabs()}

        <form id="widget-form" name="widget-form" class="aioa-form" novalidate>

          <!-- Appearance Design -->
          <div class="aioa-tabpanel" role="tabpanel" id="panel-appearance" aria-labelledby="tab-appearance" tabindex="0">
            <div class="aioa-columns">
${color(ctx)}
${widgetSize()}
            </div>

${position(ctx)}
${iconType(ctx)}
${iconSize(ctx)}
          </div>

          <!-- Paid Features -->
          <div class="aioa-tabpanel" role="tabpanel" id="panel-paid" aria-labelledby="tab-paid" tabindex="0" hidden>
${paidFeatures(ctx)}
          </div>

          <!-- Accessibility Score -->
          <div class="aioa-tabpanel" role="tabpanel" id="panel-score" aria-labelledby="tab-score" tabindex="0" hidden>
${accessibilityScore()}
          </div>

          <!-- Save bar (Appearance Design, and Paid Features on a paid plan); stays at the bottom of the screen while scrolling -->
          <div id="save-area">
${saveBar()}
          </div>

        </form>`
}

/* =======================================================================
 * views/partials/tabs.ejs
 *   Appearance Design   - color, widget size, position, icon type and icon size
 *   Paid Features       - widget position for mobile, links, widget behavior
 *   Accessibility Score - scan results of the website
 * Printed in the free plan order; on a paid plan AIOA.tabs.setPlan moves them.
 * ===================================================================== */

function tabs () {
  // [id, label, locked on the free plan]
  const list = [
    ['appearance', 'Appearance Design', false],
    ['paid', 'Paid Features', true],
    ['score', 'Accessibility Score', true]
  ]

  return `        <div class="aioa-tabs" role="tablist" aria-label="Settings">
${list.map((tab, i) => `          <button type="button" role="tab" class="aioa-tab" id="tab-${tab[0]}" data-tab="${tab[0]}"
            aria-controls="panel-${tab[0]}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}">
            <span class="aioa-tab-label">${tab[1]}</span>${tab[2] ? `
            <!-- Lock: shown while the website is not on a paid plan (AIOA.tabs.setPlan) -->
            <span class="aioa-tab-lock" data-tab-lock hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">${LOCK_SVG}</svg>
              <span class="visually-hidden">(paid plan)</span>
            </span>` : ''}
          </button>`).join('\n')}
        </div>`
}

/* =======================================================================
 * views/partials/settings/color.ejs
 * Native color picker + hex field + preset colors.
 * ===================================================================== */

function color (ctx) {
  return `              <section class="aioa-card" aria-labelledby="color-title">
                <div class="aioa-card-head">
                  <div>
                    <h2 id="color-title">Widget color</h2>
                    <p class="aioa-desc">Pick a color or enter a hex code.</p>
                  </div>
                  <!-- Live preview: the widget button in the chosen color and icon type -->
                  <div class="aioa-live" aria-hidden="true">
                    <span class="aioa-live-icon"><img class="iconimg" src="${e(ctx.iconBase)}aioa-icon-type-1.svg" alt="" /></span>
                    <span class="aioa-live-text">Live<br>preview</span>
                  </div>
                </div>

                <!-- Picker + hex code + reset -->
                <div class="aioa-color-row">
                  <input type="color" class="aioa-swatch" id="colorpicker" value="#${cfg.AIOA_DEFAULT_COLOR.toLowerCase()}" aria-label="Open color picker" />
                  <div class="aioa-affix aioa-hex" data-for="colorcode">
                    <span class="aioa-affix-text" aria-hidden="true">#</span>
                    <input type="text" name="colorcode" id="colorcode" value="${cfg.AIOA_DEFAULT_COLOR}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex color code" aria-describedby="colorcode-hint colorcode-error" />
                  </div>
                  <button type="button" class="aioa-btn" id="color-reset">Reset</button>
                </div>
                <p class="aioa-hint" id="colorcode-hint">For example: FF5733</p>
                <p class="aioa-error" id="colorcode-error" hidden>Enter a valid hex color code, for example FF5733.</p>

                <!-- Presets -->
                <div class="aioa-presets" role="group" aria-label="Preset colors">
${cfg.AIOA_PRESET_COLORS.map(([hex, name]) => `                  <button type="button" class="aioa-preset" style="--c:#${hex}" data-color="${hex}" aria-pressed="false" aria-label="${e(name + ' #' + hex)}" title="${e(name)}"></button>`).join('\n')}
                </div>
              </section>`
}

/* =======================================================================
 * views/partials/settings/widget-size.ejs
 *   Regular Size (widget_size = 0) - narrower panel, 2 columns of feature tiles
 *   Oversize     (widget_size = 1) - wider panel, 3 columns of feature tiles
 * ===================================================================== */

function widgetSize () {
  // [value, id, label, css modifier, number of feature tiles in the outline]
  const sizes = [
    ['0', 'edit-widget-size-regularsize', 'Regular Size', 'is-regular', 6],
    ['1', 'edit-widget-size-oversize', 'Oversize', 'is-over', 9]
  ]

  return `              <section class="aioa-card" aria-labelledby="widget-size-title">
                <h2 id="widget-size-title">Widget size</h2>
                <p class="aioa-desc">Size of the panel that opens on your website.</p>

                <fieldset class="aioa-fieldset">
                  <legend class="visually-hidden">Select widget size</legend>
                  <div class="aioa-size-options">
${sizes.map((size) => `                    <label class="aioa-choice aioa-size-choice" for="${size[1]}">
                      <!-- Outline of the open widget panel: header, statement bar, feature tiles -->
                      <span class="aioa-panel ${size[3]}" aria-hidden="true">
                        <span class="aioa-panel-head"></span>
                        <span class="aioa-panel-grid">${'<i></i>'.repeat(size[4])}</span>
                      </span>
                      <span class="aioa-choice-text">
                        <input type="radio" id="${size[1]}" name="widget_size" value="${size[0]}" ${size[0] === '0' ? 'checked' : 'aria-describedby="widget-size-note"'} />
                        ${size[2]}
                      </span>
                    </label>`).join('\n')}
                  </div>
                </fieldset>
                <p class="aioa-hint" id="widget-size-note">Oversize only works on desktop view.</p>
              </section>`
}

/* =======================================================================
 * views/partials/settings/position.ejs and paid/mobile-position.ejs
 * A 3 x 3 grid of preset positions (AIOA_POSITIONS). The center cell is a mini
 * website whose icon moves to the selected position.
 * ===================================================================== */

function positionGrid (ctx, mobile) {
  const name = mobile ? 'position_mobile' : 'position'
  const idPrefix = mobile ? 'mobile-position-' : 'edit-position-'

  return cfg.AIOA_POSITIONS.map((pos) => {
    if (pos === null) {
      return mobile
        ? `                  <!-- Center cell: mini website with the icon at the selected mobile position -->
                  <div class="aioa-pos-center" aria-hidden="true">
                    <span class="aioa-mini-label">Mobile view</span>
                    <span class="aioa-mini-widget" id="mini-widget-mobile" style="--gx:1;--gy:1"><img class="iconimg" src="${e(ctx.iconBase)}aioa-icon-type-1.svg" alt="" /></span>
                  </div>`
        : `                  <!-- Center cell: mini website with the icon at the selected position -->
                  <div class="aioa-pos-center" aria-hidden="true">
                    <span class="aioa-mini-label">Your website</span>
                    <span class="aioa-mini-widget" id="mini-widget" style="--gx:1;--gy:1"><img class="iconimg" src="${e(ctx.iconBase)}aioa-icon-type-1.svg" alt="" /></span>
                  </div>`
    }
    const id = idPrefix + slug(pos[0])
    return `                  <div class="aioa-pos-option">
                    <input type="radio" class="aioa-radio" id="${id}" name="${name}" value="${pos[0]}" data-gx="${pos[2]}" data-gy="${pos[3]}" ${pos[0] === 'bottom_right' ? 'checked' : ''} />
                    <label for="${id}" class="aioa-pos-label">
                      <span class="aioa-glyph${mobile ? ' is-phone' : ''}" style="--gx:${pos[2]};--gy:${pos[3]}" aria-hidden="true"><i></i></span>
                      ${pos[1]}
                    </label>
                  </div>`
  }).join('\n')
}

function position (ctx) {
  return `            <section class="aioa-card" aria-labelledby="position-title">
              <h2 id="position-title">Widget position</h2>
              <p class="aioa-desc">Where the accessibility icon appears on your website.</p>

              <!-- Preset grid <-> exact offsets -->
              <label class="aioa-check">
                <input type="checkbox" id="custom-position-switcher" aria-controls="custom-position-controls position_html" />
                Set an exact position in pixels
              </label>

              <!-- Preset positions -->
              <fieldset class="aioa-fieldset widget-position" id="position_html">
                <legend class="visually-hidden">Widget icon position</legend>
                <div class="aioa-pos-grid">
${positionGrid(ctx, false)}
                </div>
              </fieldset>

              <!-- Exact offsets (0 - 500 px) -->
              <div class="aioa-subpanel custom-position-controls" id="custom-position-controls" hidden>
                <div class="aioa-offset-row">
                  <label class="aioa-label" for="custom_position_x_value">Horizontal</label>
                  <div class="aioa-affix" data-for="custom_position_x_value">
                    <input type="number" min="0" max="500" step="1" inputmode="numeric" id="custom_position_x_value" value="0" aria-describedby="pos-range-hint pos-error" />
                    <span class="aioa-affix-text" aria-hidden="true">px</span>
                  </div>
                  <select class="aioa-select" id="custom_position_x_dir" aria-label="Horizontal direction">
                    <option selected value="cust-pos-to-the-right">To the right</option>
                    <option value="cust-pos-to-the-left">To the left</option>
                  </select>
                </div>
                <div class="aioa-offset-row">
                  <label class="aioa-label" for="custom_position_y_value">Vertical</label>
                  <div class="aioa-affix" data-for="custom_position_y_value">
                    <input type="number" min="0" max="500" step="1" inputmode="numeric" id="custom_position_y_value" value="0" aria-describedby="pos-range-hint pos-error" />
                    <span class="aioa-affix-text" aria-hidden="true">px</span>
                  </div>
                  <select class="aioa-select" id="custom_position_y_dir" aria-label="Vertical direction">
                    <option selected value="cust-pos-to-the-lower">To the bottom</option>
                    <option value="cust-pos-to-the-upper">To the top</option>
                  </select>
                </div>
                <p class="aioa-hint" id="pos-range-hint">0 - 500px are permitted values</p>
                <p class="aioa-error" id="pos-error" hidden></p>
              </div>
            </section>`
}

/* =======================================================================
 * views/partials/settings/icon-type.ejs
 * The icon visitors click to open the widget (aioa-icon-type-1 ... AIOA_ICON_TYPE_COUNT).
 * ===================================================================== */

function iconType (ctx) {
  const options = []
  for (let i = 1; i <= cfg.AIOA_ICON_TYPE_COUNT; i++) {
    options.push(`                  <div class="aioa-icon-option">
                    <input type="radio" class="aioa-radio" id="edit-type-${i}" name="aioa_icon_type" value="aioa-icon-type-${i}" ${i === 1 ? 'checked' : ''} />
                    <label for="edit-type-${i}" class="aioa-icon-label">
                      <span class="aioa-icon"><img src="${e(ctx.iconBase)}aioa-icon-type-${i}.svg" alt="" width="32" height="32" loading="lazy" /></span>
                      <span class="visually-hidden">Type ${i}</span>
                    </label>
                  </div>`)
  }

  return `            <section class="aioa-card" aria-labelledby="icon-type-title">
              <h2 id="icon-type-title">Icon type</h2>
              <p class="aioa-desc">The icon visitors click to open the widget.</p>

              <fieldset class="aioa-fieldset">
                <legend class="visually-hidden">Select icon type</legend>
                <div class="aioa-icon-grid">
${options.join('\n')}
                </div>
              </fieldset>
            </section>`
}

/* =======================================================================
 * views/partials/settings/icon-size.ejs
 * Preset sizes (AIOA_ICON_SIZES) or an exact size in pixels.
 * ===================================================================== */

function iconSize (ctx) {
  return `            <section class="aioa-card" aria-labelledby="icon-size-title">
              <h2 id="icon-size-title">Icon size for desktop</h2>
              <p class="aioa-desc">Pick a preset size or set an exact size in pixels.</p>

              <!-- Preset sizes <-> exact size -->
              <label class="aioa-check">
                <input type="checkbox" id="custom-size-switcher" aria-controls="custom-size-controls select_icon_size" />
                Set an exact size in pixels
              </label>

              <!-- Preset sizes -->
              <fieldset class="aioa-fieldset widget-icon" id="select_icon_size">
                <legend class="visually-hidden">Select icon size for desktop</legend>
                <div class="aioa-size-row">
${cfg.AIOA_ICON_SIZES.map((size) => `                  <div class="aioa-icon-option">
                    <input type="radio" class="aioa-radio" id="edit-size-${slug(size[0])}" name="aioa_icon_size" value="${size[0]}" ${size[0] === 'aioa-medium-icon' ? 'checked' : ''} />
                    <label for="edit-size-${slug(size[0])}" class="aioa-icon-label">
                      <span class="aioa-icon" style="--d:${Math.trunc(size[2])}px"><img src="${e(ctx.iconBase)}aioa-icon-type-1.svg" class="iconimg" alt="" /></span>
                      <span class="aioa-icon-caption">${size[1]}</span>
                    </label>
                  </div>`).join('\n')}
                </div>
              </fieldset>

              <!-- Exact size (24 - 150 px) -->
              <div class="aioa-subpanel custom-size-controls" id="custom-size-controls" hidden>
                <label class="aioa-label" for="widget_icon_size_custom">Exact icon size</label>
                <div class="aioa-affix aioa-size-input" data-for="widget_icon_size_custom">
                  <input type="number" id="widget_icon_size_custom" name="widget_icon_size_custom" min="24" max="150" step="1" inputmode="numeric" value="" aria-describedby="size-range-hint size-error" />
                  <span class="aioa-affix-text" aria-hidden="true">px</span>
                </div>
                <p class="aioa-hint" id="size-range-hint">24 - 150px are permitted values</p>
                <p class="aioa-error" id="size-error" hidden></p>
              </div>
            </section>`
}

/* =======================================================================
 * views/partials/settings/save-bar.ejs
 * ===================================================================== */

function saveBar () {
  return `            <div class="aioa-savebar" id="savebar">
              <p class="aioa-save-state"><i aria-hidden="true"></i><span id="save-state-text">All changes saved</span></p>
              <button type="button" id="submit" class="aioa-btn aioa-btn-primary">Save Changes</button>
            </div>
            <p class="aioa-after-note">It may take a few seconds for changes to appear on your website. If you don't see them, clear your browser cache or check in a private window.</p>`
}

/* =======================================================================
 * views/partials/lock.ejs
 * Free plan overlay for a paid tab (shown / hidden by AIOA.tabs.setPlan).
 *   lockId   id prefix for the card text (aria-labelledby)
 *   lockMod  extra class: "" (card near the top) or "is-center" (short content)
 * ===================================================================== */

function lock (lockId, lockMod) {
  return `              <div class="aioa-lock ${lockMod}" hidden>
                <div class="aioa-lock-card" role="group" aria-labelledby="${lockId}-text">
                  <span class="aioa-lock-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">${LOCK_SVG}</svg>
                  </span>
                  <p class="aioa-lock-text" id="${lockId}-text">Try a 10-day free trial to view all 100+ features.</p>
                  <a href="${e(cfg.AIOA_UPGRADE_URL)}" data-upgrade-link target="_blank" rel="noopener" class="aioa-btn aioa-btn-primary">
                    Upgrade to Paid Plan
                    <span class="visually-hidden">(opens in a new tab)</span>
                  </a>
                </div>
              </div>`
}

/* =======================================================================
 * views/partials/paid-features.ejs (+ paid/mobile-position, paid/links, paid/toggles)
 * Saved together with the Appearance Design settings (paid plans only).
 * Free plan: blurred and inert, with the upgrade overlay on top.
 * ===================================================================== */

function paidFeatures (ctx) {
  return `            <div class="aioa-lockable">
              <div class="aioa-lock-content aioa-stack">
${mobilePosition(ctx)}
${links()}
${toggles()}
              </div>
${lock('paid-lock', '')}
            </div>`
}

/**
 * Paid Features > Widget position for mobile
 *   is_mobile_position                  switch: use a separate position on phones
 *   is_widget_custom_position_mobile    "Set an exact position in pixels": 0 = presets, 1 = offsets
 *   widget_position_mobile              preset (AIOA_POSITIONS)
 *   Exact position (0 - 500 px): horizontal To the left / To the right / Center, vertical To the top / To the bottom
 */
function mobilePosition (ctx) {
  return `                <section class="aioa-card" aria-labelledby="mobile-position-title">
                  <div class="aioa-switch-head">
                    <input type="checkbox" role="switch" class="aioa-switch" id="is_mobile_position" name="is_mobile_position" value="1" aria-controls="mobile-position-body" />
                    <h2 id="mobile-position-title"><label for="is_mobile_position">Widget position for mobile</label></h2>
                  </div>

                  <div id="mobile-position-body" hidden>

                    <!-- Preset grid <-> exact offsets -->
                    <label class="aioa-check">
                      <input type="checkbox" id="custom-position-mobile-switcher" aria-controls="mobile-custom mobile-preset" />
                      Set an exact position in pixels
                    </label>

                    <!-- Preset positions -->
                    <fieldset class="aioa-fieldset widget-position" id="mobile-preset">
                      <legend class="visually-hidden">Widget icon position on mobile</legend>
                      <div class="aioa-pos-grid">
${positionGrid(ctx, true)}
                      </div>
                    </fieldset>

                    <!-- Exact offsets -->
                    <div class="aioa-subpanel" id="mobile-custom" hidden>
                      <div class="aioa-offset-row">
                        <label class="aioa-label" for="mobile_x_value">Horizontal</label>
                        <div class="aioa-affix" data-for="mobile_x_value">
                          <input type="number" min="0" max="500" step="1" inputmode="numeric" id="mobile_x_value" value="0" aria-describedby="mobile-range-hint mobile-pos-error" />
                          <span class="aioa-affix-text" aria-hidden="true">px</span>
                        </div>
                        <select class="aioa-select" id="mobile_x_dir" aria-label="Horizontal direction (mobile)">
                          <option value="left">To the left</option>
                          <option value="right" selected>To the right</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                      <div class="aioa-offset-row">
                        <label class="aioa-label" for="mobile_y_value">Vertical</label>
                        <div class="aioa-affix" data-for="mobile_y_value">
                          <input type="number" min="0" max="500" step="1" inputmode="numeric" id="mobile_y_value" value="0" aria-describedby="mobile-range-hint mobile-pos-error" />
                          <span class="aioa-affix-text" aria-hidden="true">px</span>
                        </div>
                        <select class="aioa-select" id="mobile_y_dir" aria-label="Vertical direction (mobile)">
                          <option value="top">To the top</option>
                          <option value="bottom" selected>To the bottom</option>
                        </select>
                      </div>
                      <p class="aioa-hint" id="mobile-range-hint">0 - 500px are permitted values</p>
                      <p class="aioa-error" id="mobile-pos-error" hidden></p>
                    </div>
                  </div>
                </section>`
}

/**
 * Paid Features > custom links shown in the widget
 *   statement_link       custom accessibility statement page
 *   report_problem_link  custom "report a problem" page
 */
function links () {
  // [field name, title, placeholder, icon (SVG inner markup, 24 x 24)]
  const list = [
    ['statement_link', 'Enter custom accessibility statement link', 'https://www.yourwebsite.com/accessibility-statement',
      '<path d="M9 7h8M9 12h8M9 17h8" /><circle cx="5.5" cy="7" r=".6" fill="currentColor" /><circle cx="5.5" cy="12" r=".6" fill="currentColor" /><circle cx="5.5" cy="17" r=".6" fill="currentColor" />'],
    ['report_problem_link', 'Enter custom report a problem link', 'https://www.yourwebsite.com/report-a-problem',
      '<path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" />']
  ]

  return list.map((link) => `                <section class="aioa-card" aria-labelledby="${link[0]}-title">
                  <h2 class="aioa-feature-title" id="${link[0]}-title">
                    <span class="aioa-feature-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${link[3]}</svg>
                    </span>
                    <label for="${link[0]}">${link[1]}</label>
                  </h2>
                  <div class="aioa-affix aioa-link-input" data-for="${link[0]}">
                    <span class="aioa-affix-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
                    </span>
                    <input type="url" id="${link[0]}" name="${link[0]}" inputmode="url" autocomplete="off" spellcheck="false"
                      placeholder="${e(link[2])}" aria-describedby="${link[0]}-error" />
                  </div>
                  <p class="aioa-error" id="${link[0]}-error" hidden></p>
                </section>`).join('\n')
}

/**
 * Paid Features > widget behavior switches (sent as 1 / 0)
 *   widget_leave_page  Enable External Link Navigation On Widget
 *   is_sound_disabled  Disable Open Close sound on Widget
 */
function toggles () {
  const list = [
    ['widget_leave_page', 'Enable External Link Navigation On Widget'],
    ['is_sound_disabled', 'Disable Open Close sound on Widget']
  ]

  return `                <div class="aioa-pair">
${list.map((toggle) => `                  <label class="aioa-card aioa-toggle-card" for="${toggle[0]}">
                    <input type="checkbox" role="switch" class="aioa-switch" id="${toggle[0]}" name="${toggle[0]}" value="1" />
                    <span>${toggle[1]}</span>
                  </label>`).join('\n')}
                </div>`
}

/* =======================================================================
 * views/partials/accessibility-score.ejs (+ score/card.ejs)
 * Paid plan: the scan results load the first time the tab opens, and show as
 * loading, error, "scanning in progress" (no results yet) or the score card.
 * Free plan: a sample card, blurred, with the upgrade overlay.
 * ===================================================================== */

function accessibilityScore () {
  return `            <div class="aioa-lockable">

              <!-- Free plan: example card behind the blur -->
              <div class="aioa-lock-content" id="score-sample" aria-hidden="true" hidden>
${scoreCard(true)}
              </div>

              <!-- Paid plan -->
              <div id="score-live">
                <div class="aioa-loading aioa-card" id="score-loading" role="status" hidden>
                  <span class="aioa-spinner" aria-hidden="true"></span>
                  <span>Loading your accessibility score…</span>
                </div>

                <section class="aioa-card aioa-error-card" id="score-error" hidden>
                  <h2>We couldn't load your accessibility score</h2>
                  <p id="score-error-text">Please check your connection and try again.</p>
                  <button type="button" class="aioa-btn aioa-btn-primary" id="score-retry">Try again</button>
                </section>

                <!-- No scan results yet (the scanner answered no_scan) -->
                <section class="aioa-card aioa-error-card" id="score-empty" hidden>
                  <h2>Scanning in progress</h2>
                  <p>Website scanning is in progress. It may take a few days, depending on the number of web pages and other factors. Once it is complete, the system will send a confirmation to your registered email.</p>
                </section>

${scoreCard(false)}
              </div>

${lock('score-lock', 'is-center')}
            </div>`
}

/**
 * Accessibility Score card: status, score ring and three figures.
 *   live   - filled by assets/js/score.js from the route (action fetchScanDetails, [data-field] elements)
 *   sample - fixed example values behind the free plan blur (no ids)
 */
function scoreCard (sample) {
  const keys = ['status', 'score', 'violations-pct', 'violations-count', 'alt-pct', 'alt-count', 'pages', 'pages-count']
  const values = sample
    ? {
        status: 'Compliant',
        score: 98,
        'violations-pct': '86.36%',
        'violations-count': '38 / 44',
        'alt-pct': '0%',
        'alt-count': '0 / 0',
        pages: '13',
        'pages-count': '13 / 13'
      }
    : keys.reduce((all, key) => Object.assign(all, { [key]: '' }), {})

  // [value field, count field, label]
  const stats = [
    ['violations-pct', 'violations-count', 'Violations Remediated'],
    ['alt-pct', 'alt-count', 'Alt Text Remediated'],
    ['pages', 'pages-count', 'Web Pages Scanned']
  ]
  const scoreNumber = Math.trunc(Number(values.score)) || 0

  return `                <section class="aioa-card aioa-score" data-level="compliant"
                  ${sample ? '' : 'id="score-card" aria-labelledby="score-title" hidden'}>
                  <div class="aioa-score-head">
                    <h2 ${sample ? '' : 'id="score-title"'}>Accessibility Score</h2>
                    <p class="aioa-score-status" data-field="status">${e(values.status)}</p>
                  </div>

                  <div class="aioa-score-body">
                    <!-- Score ring: --p is the score in percent -->
                    <div class="aioa-donut" style="--p:${scoreNumber}" role="img" aria-label="Accessibility score ${scoreNumber}%">
                      <svg viewBox="0 0 120 120" aria-hidden="true">
                        <circle class="aioa-donut-track" cx="60" cy="60" r="52" />
                        <circle class="aioa-donut-bar" cx="60" cy="60" r="52" pathLength="100" />
                      </svg>
                      <span class="aioa-donut-value" aria-hidden="true"><b data-field="score">${e(values.score)}</b><small>%</small></span>
                    </div>

                    <div class="aioa-score-stats">
${stats.map((stat) => `                      <div class="aioa-stat">
                        <p class="aioa-stat-value" data-field="${stat[0]}">${e(values[stat[0]])}</p>
                        <p class="aioa-stat-label">${stat[2]}</p>
                        <p class="aioa-stat-count" data-field="${stat[1]}">${e(values[stat[1]])}</p>
                      </div>`).join('\n')}
                    </div>
                  </div>${sample ? '' : `

                  <!-- Last scan date and PDF report (when the API has one) -->
                  <p class="aioa-score-foot">
                    <span data-field="last-scan"></span>
                    <a data-field="report" href="#" target="_blank" rel="noopener" hidden>Download PDF report<span class="visually-hidden"> (opens in a new tab)</span></a>
                  </p>`}
                </section>`
}

module.exports = {
  renderPage
}
