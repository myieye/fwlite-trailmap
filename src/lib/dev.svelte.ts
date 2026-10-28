// Same switch as Lexbox and FW Lite (a `devMode` localStorage key and a global `enableDevMode()`), so one bookmarklet works everywhere.
// FW Lite's newer release-channel key counts too.
const KEY = 'devMode'
const CHANNEL_KEY = 'fwlite-release-channel'

function stored() {
  try {
    return localStorage.getItem(KEY) === 'true' || localStorage.getItem(CHANNEL_KEY) === 'dev'
  } catch {
    return false
  }
}

function save(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, 'true')
    else {
      localStorage.removeItem(KEY)
      if (localStorage.getItem(CHANNEL_KEY) === 'dev') localStorage.removeItem(CHANNEL_KEY)
    }
  } catch {}
}

// `?dev` or `?dev=0` in a link turns it on or off for good.
const param = new URLSearchParams(location.search).get('dev')
if (param !== null) save(param !== '0' && param !== 'false')

export const dev = $state({ on: stored() })

export function enableDevMode(enable = true) {
  save(enable)
  dev.on = enable
}

declare global {
  var enableDevMode: (enable?: boolean) => void
}
globalThis.enableDevMode = enableDevMode

addEventListener('storage', () => (dev.on = stored()))
