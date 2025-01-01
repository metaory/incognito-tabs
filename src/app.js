import { processData, has, trim } from './utils.js'

const $ = id => document.querySelector(`#${id}`)
const MODES = Object.entries({ current: 'Current', all: 'All', incognito: 'Incognito', normal: 'Normal' })
const BUTTONS = { save: 'Save', copy: 'Copy', load: 'Load', paste: 'Paste' }
const IDS = [...Object.keys(BUTTONS), 'msg', 'txt', 'mode']

const createEl = (tag, props) => Object.assign(document.createElement(tag), props)
const els = Object.fromEntries([...IDS, 'file'].map(id =>
  [id, id === 'file' ? createEl('input', { type: 'file', accept: '.bin' }) : $(id)]
))

const getButtonProps = ({ urls = [], data, text, loading }) => ({
  style: { display: has(urls) ? '' : 'none' },
  disabled: loading || !has(urls) || !data,
  dataset: { data },
  textContent: loading ? '...' : has(urls) ? `${text} (${urls.length})` : text
})

const updateEl = (id, props) => Object.assign(els[id], props)

const render = ({ message = '', error, urls = [], data, mode, counts = {}, loading }) => {
  const updates = {
    msg: { textContent: message, className: error ? 'error' : loading ? 'loading' : '' },
    txt: { placeholder: loading ? '...' : 'Paste encrypted tabs here...', disabled: loading },
    mode: {
      value: mode,
      disabled: loading,
      innerHTML: MODES.map(([value, text]) =>
        `<option value="${value}">${text} (${counts[value] ?? 0})</option>`
      ).join('')
    }
  }

  Object.entries(updates).forEach(([id, props]) => updateEl(id, props))
  Object.entries(BUTTONS).forEach(([id, text]) =>
    updateEl(id, getButtonProps({ urls, data, text, loading })))
}

const download = (data, name = `t${Date.now()}.bin`) => {
  const url = URL.createObjectURL(new Blob([data]))
  createEl('a', { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}

const copy = async (text, setState) => {
  try {
    await navigator.clipboard.writeText(text)
    setState('Copied')
    return true
  } catch {
    setState('!Failed to copy')
    return false
  }
}

const createActions = ({ mode }, { setState, meta, decrypt }) => {
  const processText = data => data?.data && processData(Promise.resolve(data.data), decrypt, mode)
  const handlePaste = text => {
    if (!text) return { clear: true }
    text.split('\n')
      .filter(Boolean)
      .forEach(line => processText(meta.decode(line)))
    return { clear: true }
  }

  return {
    save: data => { download(data); setState('Saved') },
    copy: async data => {
      const value = await meta.encode(data)
      setState('Copied')
      return { value }
    },
    load: () => ({ type: 'file' }),
    paste: handlePaste
  }
}

const bindEvents = (acts, state, { setState, decrypt }) => {
  const handleAction = async (id, action) => {
    if (state.loading) return
    const result = await action(els[id].dataset.data, state.urls)
    if (result?.type === 'file') els.file.click()
    if (result?.value) els.txt.value = result.value
    if (result?.clear) els.txt.value = ''
  }

  Object.entries(acts).forEach(([id, action]) => {
    els[id].onclick = () => handleAction(id, action)
  })

  els.file.onchange = ({ target: { files: [file] } }) => {
    if (!file || state.loading) return
    file.arrayBuffer()
      .then(buf => processData(Promise.resolve(buf), decrypt, state.mode))
  }

  els.txt.onclick = async () => {
    if (state.loading) return
    const text = trim(els.txt.value)
    text && await copy(text, setState) && els.txt.select()
  }
}

const createApp = (state, deps) => {
  const acts = createActions(state, deps)
  bindEvents(acts, state, deps)
  return { view: { render }, actions: acts }
}

export { createApp }
