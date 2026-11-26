/**
 * ---------------------------------------------------------------------------
 * All in One Accessibility® - Gridsome plugin (Client API)
 * ---------------------------------------------------------------------------
 * Adds the All in One Accessibility widget script to every page of the website,
 * once, after the page has loaded. The widget loads the settings saved for the
 * website (the settings page, or the Skynet dashboard on a paid plan) by itself.
 *
 * The settings page (index.js) never shows the widget, and is always opened and
 * left with a full page load, so its own scripts and styles start fresh.
 *
 * Options come from index.js (api.setClientOptions):
 *   widget        false: don't add the widget
 *   scriptUrl     widget script (global or EU) with its query string
 *   scriptId      id of the <script> element
 *   settingsPath  path of the settings page, '' when there is none
 */

export default function (Vue, options, { router, isClient }) {
  if (!isClient) {
    return
  }

  const opts = options || {}
  const settingsPath = trimSlash(opts.settingsPath || '')

  function isSettingsPage (route) {
    return settingsPath !== '' && trimSlash(route.path) === settingsPath
  }

  // Full page load when going to or leaving the settings page
  if (settingsPath) {
    router.beforeEach((to, from, next) => {
      const firstLoad = from.matched.length === 0
      if (!firstLoad && isSettingsPage(to) !== isSettingsPage(from)) {
        window.location.assign(router.resolve(to.fullPath).href)
        next(false)
        return
      }
      next()
    })
  }

  if (opts.widget === false || !opts.scriptUrl) {
    return
  }

  router.onReady(() => {
    if (isSettingsPage(router.currentRoute)) {
      return
    }
    // After the page has loaded, so the widget never slows the page down
    if (document.readyState === 'complete') {
      addWidget(opts.scriptUrl, opts.scriptId)
    } else {
      window.addEventListener('load', () => addWidget(opts.scriptUrl, opts.scriptId), { once: true })
    }
  })
}

/** Add the widget script, unless it is already on the page */
function addWidget (src, id) {
  const scriptId = id || 'aioa-adawidget'
  if (document.getElementById(scriptId)) {
    return
  }
  const script = document.createElement('script')
  script.id = scriptId
  script.src = src
  script.defer = true
  document.body.appendChild(script)
}

/** "/foo/" -> "/foo", "/" -> "" */
function trimSlash (value) {
  return String(value).replace(/\/+$/, '')
}
