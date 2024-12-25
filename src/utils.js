export const cfg = {
  crypto: {
    aes: { name: 'AES-GCM', length: 256 },
    wrap: { name: 'AES-KW', length: 256 },
    iv: 12,
    usage: ['wrapKey', 'unwrapKey'],
  },
}

export const has = x => x?.length > 0
export const trim = x => x?.trim()
export const pipe =
  (...fns) =>
  x =>
    fns.reduce((v, f) => f(v), x)

export const b64 = {
  encode: buf => btoa(String.fromCharCode(...new Uint8Array(buf))),
  decode: str => Uint8Array.from(atob(str), c => c.charCodeAt(0)).buffer,
}

const getIncognitoUrls = pipe(
  windows => windows.filter(w => w.incognito && w.tabs).flatMap(w => w.tabs),
  tabs => tabs.filter(t => t?.url && t.url !== 'chrome://newtab/').map(t => t.url),
)

const getDomain = url => new URL(url).hostname || ''
const groupByDomain = urls =>
  urls.reduce((acc, url) => {
    const domain = getDomain(url)
    return domain ? { ...acc, [domain]: [...(acc[domain] || []), url] } : acc
  }, {})

const getWindows = () => chrome.windows.getAll({ populate: true })
const checkIncognito =
  setState =>
  ([tab]) =>
    tab?.incognito ? true : setState('!Please open in incognito window')

export const url = {
  getDomain,
  getStats: () =>
    pipe(getWindows, async windows => ({
      windows: windows.length,
      tabs: getIncognitoUrls(windows).length,
    }))(),
  getIncognitoUrls: setState =>
    pipe(
      () => chrome.tabs.query({ active: true, currentWindow: true }),
      async tabs => checkIncognito(setState)(tabs) && (await getWindows()),
      windows => windows && getIncognitoUrls(windows),
      urls => (urls?.length ? urls : setState('!No tabs found')),
    )(),
}

export const meta = {
  encode: data =>
    pipe(
      () => url.getStats(),
      async ({ windows, tabs }) =>
        [
          'INC@1',
          new Date().toISOString().slice(2, 12).replace(/[-T]/g, ''),
          `W${windows}.T${tabs}`,
          b64.encode(data),
        ].join('::'),
    )(),
  decode: text => {
    const [meta, data] = text.split('::')
    if (!(meta?.startsWith('INC@') && data)) return null
    const [prefix, timestamp, windows, tabs] = meta.split('.')
    return (
      prefix &&
      timestamp &&
      windows?.startsWith('W') &&
      tabs?.startsWith('T') && {
        version: prefix.slice(4),
        date: timestamp,
        windows: +windows.slice(1),
        tabs: +tabs.slice(1),
        data: b64.decode(data),
      }
    )
  },
}

export const processData = async (promise, transform) => {
  const urls = await promise?.then(transform)
  if (!has(urls)) return
  const groups = groupByDomain(urls)
  return (
    confirm(`Open ${urls.length} tabs?`) &&
    Promise.all(Object.values(groups).map(url => chrome.windows.create({ incognito: true, url })))
  )
}
