'use strict'

const seenPlayers = new Set()
let pollTimer = null

chrome.storage.local.get('enabled', ({ enabled }) => {
  if (enabled) init()
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    if (changes.enabled.newValue) init(); else stop()
  }
})

function init() {
  console.log('[DraftMonster] Starting...')
  waitFor('.pick-history', startPickHistory)
  waitFor('.player-selected__player-info-container', startNominationWatcher)
}

function stop() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  seenPlayers.clear()
  console.log('[DraftMonster] Stopped')
}

function waitFor(selector, callback) {
  const el = document.querySelector(selector)
  if (el) { callback(el); return }
  const watcher = new MutationObserver(() => {
    const found = document.querySelector(selector)
    if (found) { watcher.disconnect(); callback(found) }
  })
  watcher.observe(document.body, { childList: true, subtree: true })
}

// ─── Pick history (persists across reloads) ──────────────────────────────────

function parseRow(row) {
  const cells = row.querySelectorAll('.public_fixedDataTableCell_cellContent')
  if (cells.length < 6) return null

  const anchor = cells[1].querySelector('.playerinfo__playername a')
  const playerName = anchor?.title?.trim() || anchor?.textContent?.trim()
  if (!playerName) return null

  const pos = cells[1].querySelector('.positionPill')?.textContent?.trim()
  const teamName = cells[2].textContent?.trim()
  const salary = parseInt((cells[5].textContent ?? '').replace('$', ''), 10) || 0

  if (!teamName || !salary) return null
  return { playerName, teamName, salary, pos }
}

function scanPickHistory(container) {
  for (const row of container.querySelectorAll('.fixedDataTableRowLayout_rowWrapper')) {
    const pick = parseRow(row)
    if (!pick || seenPlayers.has(pick.playerName)) continue
    seenPlayers.add(pick.playerName)
    submitPick(pick)
  }
}

function startPickHistory(container) {
  scanPickHistory(container)
  pollTimer = setInterval(() => scanPickHistory(container), 3000)
  console.log('[DraftMonster] Watching pick history')
}

function submitPick({ playerName, teamName, salary, pos }) {
  chrome.runtime.sendMessage(
    { type: 'submitPick', payload: { playerName, teamName, salary, pos } },
    (res) => {
      if (!res || !res.ok) {
        console.warn(`[DraftMonster] "${playerName}": ${res?.data?.error ?? res?.error}`)
      } else if (!res.data?.exists) {
        console.log(`[DraftMonster] Pick synced: ${playerName} → ${teamName} $${salary}`)
      }
    }
  )
}

// ─── Current nomination watcher ──────────────────────────────────────────────

function startNominationWatcher(container) {
  let lastPlayerName = ''

  function checkNomination() {
    const playerName = container.querySelector('.playerinfo__playername')?.textContent?.trim()
    if (!playerName || playerName === lastPlayerName) return
    lastPlayerName = playerName

    const team = container.querySelector('.playerinfo__playerteam')?.textContent?.trim()
    const pos = container.querySelector('.playerinfo__playerpos')?.textContent?.trim()

    submitNomination({ playerName, team, pos })
  }

  checkNomination()

  const observer = new MutationObserver(checkNomination)
  observer.observe(container, { childList: true, subtree: true, characterData: true })
  console.log('[DraftMonster] Watching nominations')
}

function submitNomination({ playerName, team, pos }) {
  chrome.runtime.sendMessage(
    { type: 'submitNomination', payload: { playerName, team, pos } },
    (res) => {
      if (!res?.ok) {
        console.error('[DraftMonster] Nomination error:', res?.error)
      } else {
        console.log(`[DraftMonster] Nominated: ${playerName} (${pos}) ${team}`)
      }
    }
  )
}
