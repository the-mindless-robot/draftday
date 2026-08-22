'use strict'

const toggleBtn = document.getElementById('toggle')
const dot = document.getElementById('dot')
const statusText = document.getElementById('statusText')

function render(enabled) {
  toggleBtn.textContent = enabled ? 'Disable' : 'Enable'
  toggleBtn.classList.toggle('active', enabled)
  dot.classList.toggle('on', enabled)
  statusText.textContent = enabled ? 'Syncing picks...' : 'Disabled — open ESPN draft room first'
}

chrome.storage.local.get('enabled', ({ enabled }) => render(!!enabled))

toggleBtn.addEventListener('click', () => {
  chrome.storage.local.get('enabled', ({ enabled }) => {
    const next = !enabled
    chrome.storage.local.set({ enabled: next })
    render(next)
  })
})
