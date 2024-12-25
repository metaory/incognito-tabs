import { cfg, b64 } from './utils.js'

const generateKey = async () => {
  const key = await crypto.subtle.generateKey(cfg.crypto.wrap, true, cfg.crypto.usage)
  const exportedKey = await crypto.subtle.exportKey('raw', key)
  await chrome.storage.local.set({ browserKey: b64.encode(exportedKey) })
  return key
}

const getBrowserKey = async () => {
  const { browserKey } = await chrome.storage.local.get('browserKey')
  if (!browserKey) return generateKey()

  return crypto.subtle.importKey(
    'raw',
    b64.decode(browserKey),
    cfg.crypto.wrap,
    false,
    cfg.crypto.usage,
  )
}

const encodeData = data => new TextEncoder().encode(JSON.stringify(data))
const decodeData = data => JSON.parse(new TextDecoder().decode(data))

export const encrypt = async urls => {
  const browserKey = await getBrowserKey()
  if (!browserKey) return null

  const [key, iv] = await Promise.all([
    crypto.subtle.generateKey(cfg.crypto.aes, true, ['encrypt']),
    crypto.getRandomValues(new Uint8Array(cfg.crypto.iv)),
  ])

  const [wrapped, cipher] = await Promise.all([
    crypto.subtle.wrapKey('raw', key, browserKey, cfg.crypto.wrap),
    crypto.subtle.encrypt({ ...cfg.crypto.aes, iv }, key, encodeData(urls)),
  ])

  return new Blob([wrapped, iv, cipher]).arrayBuffer()
}

export const decrypt = async buf => {
  const browserKey = await getBrowserKey()
  if (!browserKey) return null

  const arr = new Uint8Array(buf)
  const [wrapped, iv, cipher] = [arr.slice(0, 40), arr.slice(40, 52), arr.slice(52)]

  const key = await crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    browserKey,
    cfg.crypto.wrap,
    cfg.crypto.aes,
    true,
    ['decrypt'],
  )

  const data = await crypto.subtle.decrypt({ ...cfg.crypto.aes, iv }, key, cipher)

  return decodeData(data)
}
