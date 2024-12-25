import { processData, has, trim } from './utils.js'

const createElement = type => props => Object.assign(document.createElement(type), props)

const createElements = () => ({
  ...['message', 'text', 'save', 'copy', 'load', 'paste'].reduce(
    (acc, id) => ({
      ...acc,
      [id]: document.querySelector(`#${id}`),
    }),
    {},
  ),
  file: createElement('input')({ type: 'file', accept: '.bin' }),
})

const buttonState = (urls, data, text) => ({
  style: { display: has(urls) ? '' : 'none' },
  disabled: !(has(urls) && data),
  data,
  textContent: has(urls) ? `${text} (${urls.length})` : text,
})

const getViewState = ({ message = '', error, isIncognito, urls = [], data }) => ({
  message: { textContent: message, className: error ? 'error' : '' },
  text: { placeholder: isIncognito ? '' : 'Paste encrypted tabs here...' },
  save: buttonState(urls, data, 'Save'),
  copy: buttonState(urls, data, 'Copy'),
})

const render = (elements, state) => {
  const viewState = getViewState(state)
  Object.entries(viewState).forEach(([k, p]) => Object.assign(elements[k], p))
}

const createFileData = (data, name) => ({
  url: URL.createObjectURL(new Blob([data])),
  name,
})

const downloadFile = file => {
  const link = createElement('a')({ href: file.url, download: file.name })
  link.click()
  URL.revokeObjectURL(link.href)
}

const createActions = ({ meta, setState }) => ({
  save: data => {
    const file = createFileData(data, `t${Date.now()}.bin`)
    downloadFile(file)
    setState('Saved')
  },
  copy: async data => {
    const value = await meta.encode(data)
    setState('Copied')
    return { value }
  },
  load: () => ({ type: 'file' }),
  paste: (text, decrypt) => {
    if (!text) return
    const lines = text.split('\n').filter(Boolean)
    lines.forEach(line => {
      const data = meta.decode(line)
      data && processData(Promise.resolve(data.data), decrypt)
    })
    return { clear: true }
  },
})

const handleClipboard = async (text, setState) => {
  try {
    await navigator.clipboard.writeText(text)
    setState('Copied')
  } catch {
    setState('!Failed')
  }
}

const bindEvents = (elements, actions, state, setState) => {
  const handleAction = (id, action) => async () => {
    const result = await action(elements[id].dataset.data, state.urls)
    if (result?.type === 'file') elements.file.click()
    if (result?.value) {
      elements.text.value = result.value
      result.onSuccess?.()
    }
    if (result?.clear) elements.text.value = ''
  }

  Object.entries(actions).forEach(([id, action]) => {
    elements[id].onclick = handleAction(id, action)
  })

  elements.file.onchange = e => processData(e.target?.files?.[0]?.arrayBuffer(), actions.decrypt)
  elements.text.onclick = async () => {
    const text = trim(elements.text.value)
    if (!text) return
    await handleClipboard(text, setState)
    elements.text.select()
  }
}

export const createApp = (state, { setState, ...deps }) => {
  const elements = createElements()
  const actions = createActions({ setState, ...deps })
  bindEvents(elements, actions, state, setState)
  return {
    view: { render: state => render(elements, state) },
    actions,
  }
}
