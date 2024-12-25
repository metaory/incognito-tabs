import { encrypt, decrypt } from './crypto.js'
import { url, meta } from './utils.js'
import { createApp } from './app.js'

const createState = (initialState = {}) => {
  const state = new Proxy(initialState, {
    set(obj, key, val) {
      obj[key] = val
      obj.render?.(obj)
      return true
    },
  })

  const setState = (updates, isError) => {
    if (typeof updates === 'string') {
      state.message = updates
      state.error = isError ?? updates.startsWith('!')
    } else {
      Object.assign(state, updates)
    }
  }

  return { state, setState }
}

const { state, setState } = createState({
  isIncognito: false,
  urls: [],
  data: null,
  message: '',
  error: false,
})

const init = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.incognito) {
      throw new Error('!Please open in incognito window')
    }
    setState({ isIncognito: true })

    const urls = await url.getIncognitoUrls(setState)
    if (!urls?.length) {
      throw new Error('!No tabs found')
    }

    const data = await encrypt(urls)
    if (!data) {
      throw new Error('!Failed to encrypt data')
    }

    setState({ urls, data })
  } catch (error) {
    setState(error.message)
    console.error(error)
  }
}

init()
createApp(state, { encrypt, decrypt, meta, setState })
