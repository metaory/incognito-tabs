const cfg = {
  crypto: {
    aes: { name: 'AES-GCM', length: 256 },
    wrap: { name: 'AES-KW', length: 256 },
    iv: 12,
    usage: ['wrapKey', 'unwrapKey']
  }
}

// Core utils
const has = x => x?.length > 0
const trim = x => x?.trim()
const b64 = {
  encode: buf => btoa(String.fromCharCode(...new Uint8Array(buf))),
  decode: str => Uint8Array.from(atob(str), c => c.charCodeAt(0)).buffer
}

// Cache management
const createCache = (ttl = 1000) => {
  const state = { data: null, time: 0 }
  const isValid = () => state.data && Date.now() - state.time < ttl
  const set = val => Object.assign(state, { data: val, time: Date.now() }) && val
  const clear = () => Object.assign(state, { data: null, time: 0 })
  return { get: () => isValid() ? state.data : null, set, clear }
}

const createMap = () => {
  const map = new Map()
  return key => map.get(key) ?? map.set(key, new URL(key).hostname || '').get(key)
}

// Tab management
const isValidTab = t => t?.url && t.url !== 'chrome://newtab/'
const getTabUrls = tabs => tabs?.filter(isValidTab).map(t => t.url) ?? []
const filterTabs = (windows = [], pred = () => true) =>
  windows.filter(pred).flatMap(w => w?.tabs ?? [])

const cache = createCache()
const getDomain = createMap()

const getWindows = () => cache.get() ?? chrome.windows.getAll({ populate: true })
  .then(cache.set).catch(() => [])

const groupByDomain = urls => !urls?.length ? {} : urls.reduce((acc, url) => {
  const domain = getDomain(url)
  return domain ? { ...acc, [domain]: [...(acc[domain] ?? []), url] } : acc
}, {})

const getStats = async () => {
  const windows = await getWindows()
  const tabs = getTabUrls(windows.flatMap(w => w?.tabs ?? []))
  return { windows, tabs }
}

const getTabsByMode = (current, windows, mode) => {
  const modes = {
    current: () => current?.tabs,
    all: () => windows.flatMap(w => w?.tabs ?? []),
    incognito: () => filterTabs(windows, w => w?.incognito),
    normal: () => filterTabs(windows, w => !w?.incognito)
  }
  return modes[mode]?.() ?? []
}

const getWindowData = async () => {
  const [current, { windows }] = await Promise.all([
    chrome.windows.getCurrent({ populate: true }),
    getStats()
  ]).catch(() => [{ tabs: [] }, { windows: [] }])
  return { current, windows }
}

// URL management
const url = {
  getDomain,
  getStats: async () => {
    const { windows = [], tabs = [] } = await getStats()
    return { windows: windows.length, tabs: tabs.length }
  },
  getUrls: async (mode = 'current') => {
    const { current, windows } = await getWindowData()
    return getTabUrls(getTabsByMode(current, windows, mode))
  },
  getCounts: async () => {
    const { current, windows } = await getWindowData()
    const modes = {
      current: current?.tabs,
      all: windows.flatMap(w => w?.tabs ?? []),
      incognito: filterTabs(windows, w => w?.incognito),
      normal: filterTabs(windows, w => !w?.incognito)
    }
    return Object.fromEntries(
      Object.entries(modes).map(([k, tabs]) => [k, getTabUrls(tabs).length])
    )
  }
}

// Metadata management
const meta = {
  encode: async data => {
    const [windows, tabs] = await Promise.all([getWindows(), url.getUrls('all')])
    const date = new Date().toISOString().slice(2, 12).replace(/[-T]/g, '')
    return ['LT@1', date, `W${windows.length}.T${tabs.length}`, b64.encode(data)].join('::')
  },
  decode: text => {
    const [meta, data] = text.split('::')
    if (!meta?.startsWith('LT@') || !data) return null

    const [prefix, date, windows, tabs] = meta.split('.')
    if (!prefix || !date || !windows?.startsWith('W') || !tabs?.startsWith('T')) return null

    return {
      version: prefix.slice(4),
      date,
      windows: +windows.slice(1),
      tabs: +tabs.slice(1),
      data: b64.decode(data)
    }
  }
}

const processData = async (promise, transform, mode) => {
  const urls = await promise?.then(transform)
  if (!has(urls)) return

  const groups = groupByDomain(urls)
  const incognito = mode === 'incognito'
  const msg = `Open ${urls.length} tabs in ${incognito ? 'incognito' : 'normal'} windows?`

  return confirm(msg) && Promise.all(
    Object.values(groups).map(urls => chrome.windows.create({ incognito, url: urls }))
  )
}

export { cfg, has, trim, b64, url, meta, processData }
