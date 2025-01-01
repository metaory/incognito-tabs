import { encrypt, decrypt } from './crypto.js'
import { url, meta } from './utils.js'
import { createApp } from './app.js'

const MODES = ['current', 'all', 'incognito', 'normal']
const DEFAULT_STATE = {
  mode: MODES[0],
  urls: [],
  data: null,
  message: '',
  error: false,
  counts: {},
  loading: false
}

const validateState = state => ({
  mode: MODES.includes(state.mode) ? state.mode : DEFAULT_STATE.mode,
  urls: Array.isArray(state.urls) ? state.urls : [],
  data: state.data ?? null,
  message: String(state.message || ''),
  error: Boolean(state.error),
  counts: typeof state.counts === 'object' ? state.counts : {},
  loading: Boolean(state.loading)
})

const createStore = () => {
  const state = new Proxy(validateState(DEFAULT_STATE), {
    set: (obj, key, val) => {
      obj[key] = val
      obj.render?.(validateState(obj))
      return true
    }
  })

  const createUpdate = state => (data, isError) => {
    const updates = typeof data === 'string'
      ? {
          message: data?.trim() || '',
          error: isError ?? data?.startsWith('!'),
          loading: false
        }
      : { ...data, loading: false }

    Object.assign(state, updates)
  }

  const createReset = state => () =>
    Object.assign(state, { ...DEFAULT_STATE, mode: state.mode })

  const update = createUpdate(state)
  const reset = createReset(state)

  return { state, update, reset }
}

const handleTabs = async ({ state, update }) => {
  try {
    state.loading = true
    const urls = await url.getUrls(state.mode)
    if (!urls?.length) throw new Error(`No tabs found in ${state.mode} window(s)`)

    const data = await encrypt(urls)
    if (!data) throw new Error('Failed to encrypt data')

    update({ urls, data })
    return true
  } catch (error) {
    update(`!${error.message}`)
    console.error(error)
    return false
  }
}

const init = async store => {
  store.reset()
  await Promise.all([
    url.getCounts()
      .catch(() => ({}))
      .then(counts => store.update({ counts })),
    handleTabs(store)
  ])
}

const createMode = store => {
  const el = document.querySelector('#mode')
  if (!el) return null

  const onChange = async ({ target: { value } }) => {
    if (!value || !MODES.includes(value)) return
    store.update({ mode: value })
    await handleTabs(store)
  }

  el.addEventListener('change', onChange)
  return el
}

const store = createStore()
createMode(store)
init(store)
createApp(store.state, { encrypt, decrypt, meta, setState: store.update })
