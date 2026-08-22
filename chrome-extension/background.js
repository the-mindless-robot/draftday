'use strict'

const APP_URL = 'http://localhost:3000'

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'submitPick') {
    fetch(`${APP_URL}/api/draft/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.payload),
    })
      .then(async (res) => {
        const data = await res.json()
        sendResponse({ ok: res.ok, data })
      })
      .catch((e) => sendResponse({ ok: false, error: e.message }))
    return true // keep message channel open for async response
  }

  if (msg.type === 'submitNomination') {
    fetch(`${APP_URL}/api/draft/nomination`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.payload),
    })
      .then(async (res) => {
        const data = await res.json()
        sendResponse({ ok: res.ok, data })
      })
      .catch((e) => sendResponse({ ok: false, error: e.message }))
    return true
  }
})
