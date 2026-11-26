/**
 * ---------------------------------------------------------------------------
 * All in One Accessibility - helpers
 * ---------------------------------------------------------------------------
 * Small functions used by index.js and lib/view.js (Node.js only).
 */

/** Last value of a query / form field ("a=1&a=2" gives "2"), '' when missing or not text */
function lastValue (value) {
  if (Array.isArray(value)) {
    value = value[value.length - 1]
  }
  return typeof value === 'string' ? value : ''
}

/**
 * Clean the query string sent to the settings page (?url=, ?username=, ?email=, ?theme=).
 *
 * Integrations that cannot provide the admin details may send raw placeholders
 * such as "{email}". Those are treated as missing values, so the website is
 * registered with no-reply@<website>.
 */
function aioaRequest (query) {
  const cleaned = {}
  Object.keys(query || {}).forEach((key) => {
    const value = lastValue(query[key])
    cleaned[key] = /^\{.*\}$/.test(value.trim()) ? '' : value.replace(/[{}]/g, '').trim()
  })
  return cleaned
}

/** Element id slug: "top_left" => "top-left", "aioa-extra-small-icon" => "extra-small". */
function aioaSlug (value) {
  return String(value).split('aioa-').join('').split('-icon').join('').split('_').join('-')
}

/** Text or attribute value for HTML: &, <, >, " and ' are escaped */
function escapeHtml (value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** JSON for a <script type="application/json"> block: <, >, & and ' are escaped */
function jsonForScript (value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
}

/** "/foo/bar/" or "foo/bar" => "/foo/bar"; "" or "/" => "" */
function normalizePath (value) {
  const segments = String(value || '').split('/').filter(Boolean)
  return segments.length ? '/' + segments.join('/') : ''
}

module.exports = {
  lastValue,
  aioaRequest,
  aioaSlug,
  escapeHtml,
  jsonForScript,
  normalizePath
}
