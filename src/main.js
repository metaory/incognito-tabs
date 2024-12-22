const [msg, btnSave, btnLoad, btnCopy, btnPaste, text] = [
  'msg',
  'btn-save',
  'btn-load',
  'btn-copy',
  'btn-paste',
  'text',
].map((id) => document.querySelector(`#${id}`))

const cfg = { name: 'AES-GCM', length: 256, usage: ['encrypt', 'decrypt'] }
const genKey = () => crypto.subtle.generateKey(cfg, true, cfg.usage)

const encrypt = async (data, key) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { ...cfg, iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  )
  return { iv, cipher }
}

const decrypt = async ({ iv, cipher }, key) =>
  JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ ...cfg, iv }, key, cipher)))

const toBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromBase64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0))

const showMsg = (text, isError) => {
  msg.textContent = text
  msg.classList.toggle('error', isError)
  if (text)
    setTimeout(() => {
      msg.textContent = ''
      msg.classList.remove('error')
    }, 2000)
}

const getTabs = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.incognito) {
    msg.innerHTML = 'Please open this popup from an incognito window'
    msg.classList.add('error')
    return []
  }
  return (await chrome.windows.getAll({ populate: true }))
    .filter((win) => win.incognito)
    .flatMap((win) => win.tabs)
    .map((tab) => tab.url)
}

const openTabs = async (urls) => {
  if (urls.length === 0) return
  await chrome.windows.create({ incognito: true, url: urls })
}

const init = async () => {
  const urls = await getTabs()
  const count = urls.length
  for (const btn of [btnSave, btnCopy]) {
    btn.disabled = !count
    if (count) btn.textContent = `${btn === btnSave ? 'To File' : 'To Text'} (${count})`
  }
  btnLoad.disabled = false
  btnPaste.disabled = false
}

btnSave.onclick = async () => {
  const key = await genKey()
  const { iv, cipher } = await encrypt(await getTabs(), key)
  const raw = await crypto.subtle.exportKey('raw', key)
  const a = document.createElement('a')
  Object.assign(a, {
    href: URL.createObjectURL(new Blob([raw, iv, new Uint8Array(cipher)])),
    download: `tabs-${new Date().toISOString()}.bin`,
  })
  a.click()
}

btnCopy.onclick = async () => {
  const key = await genKey()
  const { iv, cipher } = await encrypt(await getTabs(), key)
  const raw = await crypto.subtle.exportKey('raw', key)
  text.value = toBase64(new Uint8Array([...new Uint8Array(raw), ...iv, ...new Uint8Array(cipher)]))
  showMsg('Text ready')
}

const loadData = async (buf) => {
  const key = await crypto.subtle.importKey('raw', buf.slice(0, 32), cfg, true, cfg.usage)
  const urls = await decrypt({ iv: new Uint8Array(buf.slice(32, 44)), cipher: buf.slice(44) }, key)
  await openTabs(urls)
  text.value = ''
}

btnLoad.onclick = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.bin'
  input.onchange = () => {
    if (input.files[0]) input.files[0].arrayBuffer().then(loadData)
  }
  input.click()
}

btnPaste.onclick = () =>
  (text.value && showMsg('Please paste text first', true)) ||
  loadData(fromBase64(text.value).buffer)

text.onclick = () =>
  text.value && navigator.clipboard.writeText(text.value).then(() => showMsg('Copied'))

init()
