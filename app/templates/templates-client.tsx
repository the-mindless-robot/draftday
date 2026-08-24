"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Star, User, ListChecks, BarChart2 } from "lucide-react"
import { PlayerDetail } from "@/app/dashboard/player-detail"
import { MyList } from "@/app/dashboard/my-list"
import { DraftLog } from "@/app/dashboard/draft-log"
import { DraftAnalytics } from "@/app/dashboard/draft-analytics"
import type { RankedPlayer } from "@/app/dashboard/dashboard-client"
import { extractLastName } from "@/lib/player-name"

// ── Types ─────────────────────────────────────────────────────────────────────

type TeamSnapshot = {
  id: string
  name: string
  budgets: number[]
  isDefault: boolean
}

type DraftPickInfo = {
  id: string
  salary: number
  teamId: string
  createdAt: string | Date
  team: { id: string; name: string; isMyTeam: boolean }
}

type DraftTeamInfo = {
  id: string
  name: string
  budget: number
  isMyTeam: boolean
}

type Player = {
  id: string
  fbgId: string
  name: string
  team: string | null
  pos: string | null
  draftPick: DraftPickInfo | null
  overallRank: number | null
  espnOverallRank: number | null
  positionalRank: number | null
  espnPositionalRank: number | null
  overallTier: string | null
  positionalTier: string | null
  projPoints: number | null
  projGames: number | null
  upside: number | null
  downside: number | null
  age: number | null
  experience: number | null
  byeWeek: number | null
  scFbg250: string | null
  scFbgScaled: string | null
  scEspn200: string | null
  fbgRankDelta: number | null
  espnRankDelta: number | null
  lastYearSalary: number | null
  flagged: boolean
  targeted: boolean
}

type RosterSlot = {
  label: string // "QB", "RB", "WR", "TE", "FLEX", "TD", "PK", "BENCH"
  budget: number // per-slot dollar target
  positions: string[] // eligible player positions
  isPriority?: boolean
  note?: string // e.g. "Stream", "→ RB", "Stud", "Handcuff"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSalary(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

function fbgSalary(p: Player): number | null {
  return parseSalary(p.scFbg250)
}

// Explicit class strings so Tailwind picks them all up at build time
const POS_COLORS: Record<string, { text: string; bg: string; border: string }> =
  {
    QB: {
      text: "text-blue-400",
      bg: "bg-blue-400",
      border: "border-blue-400/30",
    },
    RB: {
      text: "text-green-400",
      bg: "bg-green-400",
      border: "border-green-400/30",
    },
    WR: {
      text: "text-yellow-400",
      bg: "bg-yellow-400",
      border: "border-yellow-400/30",
    },
    TE: {
      text: "text-orange-400",
      bg: "bg-orange-400",
      border: "border-orange-400/30",
    },
    PK: {
      text: "text-purple-400",
      bg: "bg-purple-400",
      border: "border-purple-400/30",
    },
    K: {
      text: "text-purple-400",
      bg: "bg-purple-400",
      border: "border-purple-400/30",
    },
    TD: { text: "text-sky-400", bg: "bg-sky-400", border: "border-sky-400/30" },
    DST: {
      text: "text-sky-400",
      bg: "bg-sky-400",
      border: "border-sky-400/30",
    },
    FLEX: {
      text: "text-indigo-400",
      bg: "bg-indigo-400",
      border: "border-indigo-400/30",
    },
    BENCH: {
      text: "text-muted-foreground",
      bg: "bg-muted-foreground/30",
      border: "border-border",
    },
    STARS: {
      text: "text-amber-400",
      bg: "bg-amber-400",
      border: "border-amber-400/30",
    },
    REST: {
      text: "text-muted-foreground",
      bg: "bg-muted-foreground/30",
      border: "border-border",
    },
  }

// ── Player Selection ──────────────────────────────────────────────────────────

// Positive score = FBG values this player more than ESPN (rank higher + salary higher)
function valueScore(p: Player): number {
  const rankDelta =
    p.espnOverallRank != null && p.overallRank != null
      ? p.espnOverallRank - p.overallRank
      : 0
  const fbgSal = fbgSalary(p) ?? 0
  const espnSal = parseSalary(p.scEspn200) ?? 0
  const salDelta = fbgSal > 0 && espnSal > 0 ? fbgSal - espnSal : 0
  // salary delta (0–30 range) scaled ×4 to be comparable to rank delta (0–120 range)
  return rankDelta + salDelta * 4
}

function getSlotPlayers(
  players: Player[],
  positions: string[],
  budget: number,
  count = 3,
  exclude: Set<string> = new Set(),
  sortFn?: (budget: number) => (a: Player, b: Player) => number,
  maxAbove = 3,
  maxBelow = 5
): Player[] {
  const posSet = new Set(positions.map((p) => p.toUpperCase()))

  const eligible = players.filter((p) => {
    if (exclude.has(p.id)) return false
    if (p.draftPick) return false
    const pos = p.pos?.toUpperCase() ?? ""
    if (posSet.has("TD") || posSet.has("DST")) {
      if (pos === "TD" || pos === "DST" || pos === "D/ST") return true
    }
    return posSet.has(pos)
  })

  if (eligible.length === 0) return []

  const defaultRankOf = (p: Player) =>
    positions.length === 1 ? (p.positionalRank ?? 999) : (p.overallRank ?? 999)
  const defaultSort = (a: Player, b: Player) =>
    defaultRankOf(a) - defaultRankOf(b)
  const sort = sortFn ? sortFn(budget) : defaultSort

  const proximitySort = (a: Player, b: Player) =>
    Math.abs((fbgSalary(a) ?? 0) - budget) -
    Math.abs((fbgSalary(b) ?? 0) - budget)

  const lo = Math.max(0, budget - maxBelow)
  const hi = budget + maxAbove

  const inWindow = (p: Player) => {
    const sal = fbgSalary(p)
    return sal != null && sal >= lo && sal <= hi
  }

  // Tier within the salary window: targeted first, then flagged, then rest
  const windowPlayers = eligible.filter(inWindow)
  const targeted = windowPlayers.filter((p) => p.targeted).sort(proximitySort)
  const flagged = windowPlayers
    .filter((p) => p.flagged && !p.targeted)
    .sort(proximitySort)
  const remaining = windowPlayers
    .filter((p) => !p.targeted && !p.flagged)
    .sort(sort)

  const result = [...targeted, ...flagged, ...remaining].slice(0, count)
  if (result.length >= count) return result

  // Fallback: closest salary match outside the window, same tier ordering
  const seen = new Set(result.map((p) => p.id))
  const fallback = eligible
    .filter((p) => !seen.has(p.id) && !inWindow(p))
    .sort((a, b) => {
      const diff = proximitySort(a, b)
      return diff !== 0 ? diff : sort(a, b)
    })

  return [...result, ...fallback].slice(0, count)
}

// ── Strategy Definitions ──────────────────────────────────────────────────────

const TOTAL_BUDGET = 250

type SlotBudget = { slots: number; budget: number; label?: string }

type StrategyDef = {
  id: string
  name: string
  tagline: string
  philosophy: string
  accentClass: string
  budgets: Record<string, SlotBudget> // for left panel bars
  priorityPositions: string[]
  slots: RosterSlot[] // 17-slot roster for right panel
  slotSortFn?: (budget: number) => (a: Player, b: Player) => number // factory: receives slot budget, returns sort fn
}

const STRATEGIES: StrategyDef[] = [
  // ── Bellcow or Bust ─────────────────────────────────────────────────────────
  {
    id: "rb-heavy",
    name: "Bellcow or Bust",
    tagline: "Lock elite RBs, fill the rest cheap",
    philosophy:
      "Running backs depreciate fastest in ADP but dominate weekly floors. Lock in 2–3 elite bellcows across your RB and FLEX slots, then stream everything else at minimum cost. Win the position everyone else punts.",
    accentClass: "text-green-400",
    priorityPositions: ["RB"],
    budgets: {
      RB: { slots: 4, budget: 145, label: "2 RB + 2 FLEX" },
      WR: { slots: 2, budget: 45 },
      TE: { slots: 1, budget: 20 },
      QB: { slots: 1, budget: 10, label: "Stream" },
      TD: { slots: 1, budget: 5 },
      PK: { slots: 1, budget: 1 },
      BENCH: { slots: 7, budget: 24, label: "Handcuffs" },
    },
    slots: [
      { label: "QB", budget: 10, positions: ["QB"], note: "Stream" },
      { label: "RB", budget: 65, positions: ["RB"], isPriority: true },
      { label: "RB", budget: 50, positions: ["RB"], isPriority: true },
      { label: "WR", budget: 25, positions: ["WR"] },
      { label: "WR", budget: 20, positions: ["WR"] },
      { label: "TE", budget: 20, positions: ["TE"] },
      {
        label: "FLEX",
        budget: 20,
        positions: ["RB"],
        isPriority: true,
        note: "→ RB",
      },
      {
        label: "FLEX",
        budget: 10,
        positions: ["RB"],
        isPriority: true,
        note: "→ RB",
      },
      { label: "TD", budget: 5, positions: ["TD", "DST"] },
      { label: "PK", budget: 1, positions: ["K", "PK"] },
      {
        label: "BENCH",
        budget: 5,
        positions: ["RB", "WR", "TE"],
        note: "Handcuff",
      },
      { label: "BENCH", budget: 5, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 5, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 4, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 3, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
    ],
  },

  // ── Air Raid ─────────────────────────────────────────────────────────────────
  {
    id: "air-raid",
    name: "Air Raid",
    tagline: "Stack WRs, punt RBs, ride the pass game",
    philosophy:
      "WRs offer more consistent weekly floors in the modern pass-heavy era. Stack a premium QB with 4 WR slots and let them dominate both FLEX spots. RBs are volatile and replaceable — don't pay the premium.",
    accentClass: "text-yellow-400",
    priorityPositions: ["WR", "QB"],
    budgets: {
      WR: { slots: 4, budget: 140, label: "2 WR + 2 FLEX" },
      QB: { slots: 1, budget: 30, label: "Premium — stack with WRs" },
      RB: { slots: 2, budget: 30, label: "Cheap committee backs" },
      TE: { slots: 1, budget: 10, label: "Stream" },
      TD: { slots: 1, budget: 5 },
      PK: { slots: 1, budget: 1 },
      BENCH: { slots: 7, budget: 34 },
    },
    slots: [
      {
        label: "QB",
        budget: 30,
        positions: ["QB"],
        isPriority: true,
        note: "Stack w/ WRs",
      },
      { label: "RB", budget: 18, positions: ["RB"], note: "Committee" },
      { label: "RB", budget: 12, positions: ["RB"], note: "Committee" },
      { label: "WR", budget: 55, positions: ["WR"], isPriority: true },
      { label: "WR", budget: 45, positions: ["WR"], isPriority: true },
      { label: "TE", budget: 10, positions: ["TE"], note: "Stream" },
      {
        label: "FLEX",
        budget: 25,
        positions: ["WR"],
        isPriority: true,
        note: "→ WR",
      },
      {
        label: "FLEX",
        budget: 15,
        positions: ["WR"],
        isPriority: true,
        note: "→ WR",
      },
      { label: "TD", budget: 5, positions: ["TD", "DST"] },
      { label: "PK", budget: 1, positions: ["K", "PK"] },
      { label: "BENCH", budget: 6, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 7, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 6, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 6, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 5, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 3, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
    ],
  },

  // ── Stars & Scrubs ────────────────────────────────────────────────────────────
  {
    id: "stars-scrubs",
    name: "Stars & Scrubs",
    tagline: "2–3 studs, everything else at $1",
    philosophy:
      "Concentrate 70%+ of your budget on the 2–3 highest-projected players regardless of position. Fill the remaining 12 slots with high-upside bench fliers at minimum cost. Accept variance — you're swinging for the ceiling.",
    accentClass: "text-purple-400",
    priorityPositions: ["RB", "WR", "TE"],
    budgets: {
      STARS: { slots: 3, budget: 175, label: "Any pos — overall rank 1–20" },
      REST: { slots: 14, budget: 75, label: "Fill all remaining slots" },
    },
    slots: [
      { label: "QB", budget: 8, positions: ["QB"], note: "Stream" },
      {
        label: "RB",
        budget: 75,
        positions: ["RB"],
        isPriority: true,
        note: "Stud",
      },
      { label: "RB", budget: 6, positions: ["RB"], note: "Min" },
      {
        label: "WR",
        budget: 65,
        positions: ["WR"],
        isPriority: true,
        note: "Stud",
      },
      { label: "WR", budget: 6, positions: ["WR"], note: "Min" },
      {
        label: "TE",
        budget: 35,
        positions: ["TE"],
        isPriority: true,
        note: "Stud",
      },
      { label: "FLEX", budget: 5, positions: ["RB", "WR", "TE"], note: "Min" },
      { label: "FLEX", budget: 5, positions: ["RB", "WR", "TE"], note: "Min" },
      { label: "TD", budget: 4, positions: ["TD", "DST"] },
      { label: "PK", budget: 1, positions: ["K", "PK"] },
      {
        label: "BENCH",
        budget: 7,
        positions: ["RB", "WR", "TE"],
        note: "Upside",
      },
      {
        label: "BENCH",
        budget: 8,
        positions: ["RB", "WR", "TE"],
        note: "Upside",
      },
      {
        label: "BENCH",
        budget: 7,
        positions: ["RB", "WR", "TE"],
        note: "Upside",
      },
      { label: "BENCH", budget: 7, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 6, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 4, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
    ],
  },

  // ── Kelce Effect ──────────────────────────────────────────────────────────────
  {
    id: "te-premium",
    name: "Kelce Effect",
    tagline: "Elite TE gives you a weekly structural edge",
    philosophy:
      "An elite TE playing like a WR2 gives you a structural advantage opponents can't overcome every week. Pair with a premium QB for a stack, then balance RB and WR across your remaining slots. Pay the TE tax — it compounds.",
    accentClass: "text-orange-400",
    priorityPositions: ["TE", "QB"],
    budgets: {
      TE: { slots: 1, budget: 65, label: "Elite TE1 only" },
      QB: { slots: 1, budget: 35, label: "Premium — stack with TE" },
      RB: { slots: 3, budget: 55, label: "2 RB + 1 FLEX" },
      WR: { slots: 3, budget: 55, label: "2 WR + 1 FLEX" },
      TD: { slots: 1, budget: 5 },
      PK: { slots: 1, budget: 1 },
      BENCH: { slots: 7, budget: 34 },
    },
    slots: [
      {
        label: "QB",
        budget: 35,
        positions: ["QB"],
        isPriority: true,
        note: "Stack w/ TE",
      },
      { label: "RB", budget: 25, positions: ["RB"] },
      { label: "RB", budget: 20, positions: ["RB"] },
      { label: "WR", budget: 25, positions: ["WR"] },
      { label: "WR", budget: 20, positions: ["WR"] },
      {
        label: "TE",
        budget: 65,
        positions: ["TE"],
        isPriority: true,
        note: "Elite TE1",
      },
      { label: "FLEX", budget: 10, positions: ["RB"], note: "→ RB" },
      { label: "FLEX", budget: 10, positions: ["WR"], note: "→ WR" },
      { label: "TD", budget: 5, positions: ["TD", "DST"] },
      { label: "PK", budget: 1, positions: ["K", "PK"] },
      { label: "BENCH", budget: 6, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 6, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 6, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 5, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 5, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 5, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
    ],
  },

  // ── All Around ───────────────────────────────────────────────────────────────
  {
    id: "all-around",
    name: "All Around",
    tagline: "Balanced + target FBG sleepers ESPN is sleeping on",
    philosophy:
      "Even budget across all positions, but within each salary tier prioritize players where FBG ranks them significantly higher than ESPN and/or FBG's salary projection outpaces ESPN's — signs the market hasn't priced them correctly yet.",
    accentClass: "text-cyan-400",
    priorityPositions: [],
    slotSortFn: (budget) => (a, b) => {
      const aSal = fbgSalary(a) ?? 0
      const bSal = fbgSalary(b) ?? 0
      const aProx = Math.abs(aSal - budget)
      const bProx = Math.abs(bSal - budget)
      // 12% of slot budget (min $3) — players further apart than this sort by proximity
      const threshold = Math.max(budget * 0.12, 3)
      if (Math.abs(aProx - bProx) > threshold) return aProx - bProx
      // Within the same price tier: prefer the higher FBG-vs-ESPN value discrepancy
      return valueScore(b) - valueScore(a)
    },
    budgets: {
      QB: { slots: 1, budget: 25 },
      RB: { slots: 2, budget: 68 },
      WR: { slots: 2, budget: 68 },
      TE: { slots: 1, budget: 32 },
      FLEX: { slots: 2, budget: 33, label: "Best value available" },
      TD: { slots: 1, budget: 5 },
      PK: { slots: 1, budget: 1 },
      BENCH: { slots: 7, budget: 18, label: "High upside" },
    },
    slots: [
      { label: "QB", budget: 25, positions: ["QB"] },
      { label: "RB", budget: 40, positions: ["RB"] },
      { label: "RB", budget: 28, positions: ["RB"] },
      { label: "WR", budget: 40, positions: ["WR"] },
      { label: "WR", budget: 28, positions: ["WR"] },
      { label: "TE", budget: 32, positions: ["TE"] },
      {
        label: "FLEX",
        budget: 20,
        positions: ["RB", "WR", "TE"],
        note: "Best value",
      },
      {
        label: "FLEX",
        budget: 13,
        positions: ["RB", "WR", "TE"],
        note: "Best value",
      },
      { label: "TD", budget: 5, positions: ["TD", "DST"] },
      { label: "PK", budget: 1, positions: ["K", "PK"] },
      {
        label: "BENCH",
        budget: 4,
        positions: ["RB", "WR", "TE"],
        note: "Sleeper",
      },
      {
        label: "BENCH",
        budget: 4,
        positions: ["RB", "WR", "TE"],
        note: "Sleeper",
      },
      {
        label: "BENCH",
        budget: 4,
        positions: ["RB", "WR", "TE"],
        note: "Sleeper",
      },
      {
        label: "BENCH",
        budget: 3,
        positions: ["RB", "WR", "TE"],
        note: "Sleeper",
      },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
      { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
    ],
  },
]

// ── Custom Template ───────────────────────────────────────────────────────────

const CUSTOM_TEMPLATE_SLOTS: RosterSlot[] = [
  { label: "QB", budget: 25, positions: ["QB"] },
  { label: "RB", budget: 40, positions: ["RB"] },
  { label: "RB", budget: 28, positions: ["RB"] },
  { label: "WR", budget: 40, positions: ["WR"] },
  { label: "WR", budget: 28, positions: ["WR"] },
  { label: "TE", budget: 32, positions: ["TE"] },
  { label: "FLEX", budget: 20, positions: ["RB", "WR", "TE"] },
  { label: "FLEX", budget: 13, positions: ["RB", "WR", "TE"] },
  { label: "TD", budget: 5, positions: ["TD", "DST"] },
  { label: "PK", budget: 1, positions: ["K", "PK"] },
  { label: "BENCH", budget: 4, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget: 4, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget: 4, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget: 3, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget: 1, positions: ["RB", "WR", "TE"] },
]

const CUSTOM_STRATEGY: StrategyDef = {
  id: "custom",
  name: "Custom",
  tagline: "Set your own slot budgets",
  philosophy:
    "Manually set each slot's dollar target to explore any allocation. Player options update live as you adjust values — start from a balanced base and shift budget toward your preferred positions.",
  accentClass: "text-muted-foreground",
  budgets: {},
  priorityPositions: [],
  slots: CUSTOM_TEMPLATE_SLOTS,
}

// ── Live Draft Mode ───────────────────────────────────────────────────────────

type LivePick = Player & { draftPick: DraftPickInfo }

const CASCADE_STEPS: { label: string; floor: number; limit: number }[] = [
  { label: "BENCH", floor: 3, limit: 4 },
  { label: "BENCH", floor: 1, limit: 3 },
  { label: "TD",    floor: 2, limit: Infinity },
  { label: "PK",    floor: 1, limit: Infinity },
  { label: "K",     floor: 1, limit: Infinity },
  { label: "FLEX",  floor: 2, limit: Infinity },
  { label: "TE",    floor: 3, limit: Infinity },
  { label: "QB",    floor: 3, limit: Infinity },
  { label: "RB",    floor: 5, limit: Infinity },
  { label: "WR",    floor: 5, limit: Infinity },
]

function applyBudgetCascade(
  budgets: number[],
  slots: RosterSlot[],
  filledIndices: Set<number>,
  overage: number
): number[] {
  const result = [...budgets]
  let remaining = overage
  for (const { label, floor, limit } of CASCADE_STEPS) {
    if (remaining <= 0) break
    let count = 0
    const candidates = slots
      .map((s, i) => ({ i, budget: result[i], slotLabel: s.label }))
      .filter(({ i, budget, slotLabel }) =>
        !filledIndices.has(i) && slotLabel === label && budget > floor
      )
      .sort((a, b) => b.budget - a.budget)
    for (const { i, budget } of candidates) {
      if (remaining <= 0 || count >= limit) break
      result[i] = floor
      remaining -= budget - floor
      count++
    }
  }
  return result
}

function assignPicksToSlots(
  slots: RosterSlot[],
  picks: LivePick[]
): Map<number, LivePick> {
  const assignments = new Map<number, LivePick>()
  const usedIds = new Set<string>()

  const posMatch = (slot: RosterSlot, pick: LivePick) =>
    slot.positions.some((pos) => {
      const p = pos.toUpperCase()
      const pp = pick.pos?.toUpperCase() ?? ""
      return p === pp || (p === "TD" && (pp === "TD" || pp === "DST"))
    })

  const tryAssign = (indices: number[]) => {
    for (const i of indices) {
      const pick = picks.find((p) => !usedIds.has(p.id) && posMatch(slots[i], p))
      if (pick) { assignments.set(i, pick); usedIds.add(pick.id) }
    }
  }

  const all = slots.map((_, i) => i)
  tryAssign(all.filter((i) => !["FLEX", "BENCH"].includes(slots[i].label)))
  tryAssign(all.filter((i) => slots[i].label === "FLEX"))
  tryAssign(all.filter((i) => slots[i].label === "BENCH"))

  return assignments
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BudgetBar({ posKey, data }: { posKey: string; data: SlotBudget }) {
  const colors = POS_COLORS[posKey] ?? POS_COLORS.BENCH
  const pct = (data.budget / TOTAL_BUDGET) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span
            className={cn(
              "w-12 shrink-0 font-mono text-xs font-bold",
              colors.text
            )}
          >
            {posKey}
          </span>
          <span className="truncate text-[10px] text-muted-foreground">
            {data.slots} slot{data.slots !== 1 ? "s" : ""}
            {data.label ? ` · ${data.label}` : ""}
          </span>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          ${data.budget}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", colors.bg)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PlayerCard({
  player,
  isSelected,
  onClick,
}: {
  player: Player
  isSelected: boolean
  onClick: (p: Player) => void
}) {
  const salary = fbgSalary(player)
  const espn = parseSalary(player.scEspn200)
  const delta = espn != null && salary != null ? espn - salary : null
  const colors = POS_COLORS[player.pos ?? ""] ?? {
    text: "text-muted-foreground",
    border: "border-border",
  }

  return (
    <div
      onClick={() => onClick(player)}
      className={cn(
        "min-w-0 flex-1 cursor-pointer space-y-0.5 rounded border px-2 py-1.5 transition-colors",
        isSelected
          ? "border-foreground/40 bg-muted ring-1 ring-foreground/20"
          : cn("bg-muted/30 hover:bg-muted/60", colors.border)
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "shrink-0 font-mono text-[10px] font-bold",
            colors.text
          )}
        >
          {player.pos}
          {player.positionalRank ?? ""}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">
            {salary != null ? `$${salary.toFixed(0)}` : "—"}
          </span>
          {delta != null && (
            <span
              className={cn(
                "font-mono text-[9px]",
                delta < 0 ? "text-green-400" : "text-red-400/60"
              )}
            >
              {delta > 0 ? `+${delta.toFixed(0)}` : `${delta.toFixed(0)}`}
            </span>
          )}
        </div>
      </div>
      <p className="flex justify-between truncate text-[11px] leading-tight font-medium">
        {player.name}{" "}
        {player.team && (
          <span className="text-[10px] leading-none text-muted-foreground">
            {player.team}
          </span>
        )}
      </p>
      <div className="flex items-center justify-between">
        {(player.positionalTier || player.overallTier) && (
          <p className="font-mono text-[10px] leading-none text-muted-foreground/60">
            {[
              player.positionalTier
                ? `${player.positionalTier} ${player.pos}`
                : null,
              player.overallTier ? `${player.overallTier} player` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  )
}

function EmptyCard() {
  return (
    <div className="min-w-0 flex-1 rounded border border-dashed border-border/30 bg-muted/10" />
  )
}

function SlotRow({
  slot,
  players,
  accentClass,
  selectedPlayerId,
  onPlayerSelect,
  onBudgetChange,
  lockedPick,
  plannedBudget,
}: {
  slot: RosterSlot
  players: Player[]
  accentClass: string
  selectedPlayerId: string | null
  onPlayerSelect: (p: Player) => void
  onBudgetChange?: (v: number) => void
  lockedPick?: Player
  plannedBudget?: number
}) {
  const colors = POS_COLORS[slot.label] ?? POS_COLORS.BENCH

  return (
    <div
      className={cn(
        "flex items-stretch gap-3 border-b border-border/20 px-3 py-2 last:border-0",
        lockedPick && "bg-green-400/5"
      )}
    >
      {/* Slot label */}
      <div className="flex w-16 shrink-0 items-start gap-1 pt-1">
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold",
            colors.text,
            colors.border
          )}
        >
          {slot.label}
        </span>
        {lockedPick ? (
          <span className="mt-1 shrink-0 text-[9px] leading-none text-green-400">
            ✓
          </span>
        ) : slot.isPriority ? (
          <span className={cn("mt-1 shrink-0 text-[9px] leading-none", accentClass)}>
            ★
          </span>
        ) : null}
      </div>

      {/* Budget + note */}
      <div className="flex w-20 shrink-0 flex-col justify-start gap-0.5 pt-1">
        {lockedPick ? (
          <>
            <span className="font-mono text-xs font-semibold text-green-400">
              ${slot.budget}
            </span>
            <span className="text-[10px] leading-tight text-green-400/50">
              paid
            </span>
          </>
        ) : onBudgetChange ? (
          <div className="flex items-center gap-0.5">
            <span className="font-mono text-xs text-muted-foreground">$</span>
            <input
              type="number"
              value={slot.budget}
              min={1}
              onChange={(e) =>
                onBudgetChange(Math.max(1, Number(e.target.value)))
              }
              className="w-12 [appearance:textfield] rounded border border-border bg-background px-1 py-0.5 text-right font-mono text-xs font-semibold text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        ) : (
          <span className="font-mono text-xs font-semibold">${slot.budget}</span>
        )}
        {!lockedPick && slot.note && (
          <span className="text-[10px] leading-tight text-muted-foreground">
            {slot.note}
          </span>
        )}
      </div>

      {/* Player cards */}
      <div className="flex min-w-0 flex-1 gap-2">
        {lockedPick ? (
          <>
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <PlayerCard
                player={lockedPick}
                isSelected={lockedPick.id === selectedPlayerId}
                onClick={onPlayerSelect}
              />
              {lockedPick.draftPick && (() => {
                const paid = lockedPick.draftPick.salary
                const budget = plannedBudget ?? slot.budget
                const diff = budget - paid
                return (
                  <div className="flex gap-3 px-1 font-mono text-[10px]">
                    <span>
                      ${paid}
                      <span className="ml-0.5 text-muted-foreground/50">paid</span>
                    </span>
                    <span className="text-muted-foreground/50">
                      ${budget}
                      <span className="ml-0.5 text-muted-foreground/40">bgt</span>
                    </span>
                    <span className={diff >= 0 ? "text-green-400" : "text-red-400"}>
                      {diff > 0 ? "+" : ""}{diff}
                    </span>
                  </div>
                )
              })()}
            </div>
            <EmptyCard />
            <EmptyCard />
          </>
        ) : (
          <>
            {players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isSelected={p.id === selectedPlayerId}
                onClick={onPlayerSelect}
              />
            ))}
            {Array.from({ length: Math.max(0, 3 - players.length) }).map(
              (_, i) => (
                <EmptyCard key={i} />
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PositionalComps({
  label,
  players,
}: {
  label: string
  players: Player[]
}) {
  if (players.length === 0) return null
  return (
    <div className="shrink-0 rounded-xl bg-muted/50 p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {players.map((p) => {
          const salary = fbgSalary(p)
          const colors = POS_COLORS[p.pos ?? ""] ?? {
            text: "text-muted-foreground",
          }
          return (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "w-10 shrink-0 font-mono font-semibold",
                  colors.text
                )}
              >
                {p.pos}
                {p.positionalRank ?? ""}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.name}
                {p.team ? (
                  <span className="text-muted-foreground"> {p.team}</span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                #{p.overallRank ?? "—"}
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-muted-foreground">
                {salary != null ? `$${salary.toFixed(0)}` : "—"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TemplatesClient({
  players: initialPlayers,
  draftTeams,
}: {
  players: Player[]
  draftTeams: DraftTeamInfo[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [players, setPlayers] = useState(initialPlayers)
  const [strategyId, setStrategyId] = useState(STRATEGIES[0].id)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [maxAbove, setMaxAbove] = useState(3)
  const [maxBelow, setMaxBelow] = useState(5)
  const [customBudgets, setCustomBudgets] = useState<number[]>(() =>
    CUSTOM_TEMPLATE_SLOTS.map((s) => s.budget)
  )
  const [rightPanel, setRightPanel] = useState<
    "details" | "my-list" | "picks" | "analytics"
  >("details")
  const [liveMode, setLiveMode] = useState(false)

  useEffect(() => {
    const nominee = searchParams.get("nominee")
    if (!nominee) return
    const last = extractLastName(nominee).toLowerCase()
    const first = nominee.trim().split(/\s+/)[0].toLowerCase()
    const match =
      players.find((p) => p.name.toLowerCase() === nominee.toLowerCase()) ??
      players.find((p) => {
        const n = p.name.toLowerCase()
        return n.includes(last) && n.includes(first)
      }) ??
      players.find((p) => p.name.toLowerCase().includes(last))
    if (match) {
      setSelectedPlayer(match)
      setRightPanel("details")
      router.replace("/templates")
    }
  }, [searchParams])

  async function handleFlag(player: Player) {
    const wasFlagged = player.flagged
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id
          ? {
              ...p,
              flagged: !wasFlagged,
              ...(wasFlagged && { targeted: false }),
            }
          : p
      )
    )
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer((prev) =>
        prev
          ? {
              ...prev,
              flagged: !wasFlagged,
              ...(wasFlagged && { targeted: false }),
            }
          : null
      )
    }
    try {
      await fetch(`/api/players/${player.id}/flag`, { method: "PATCH" })
    } catch {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? { ...p, flagged: wasFlagged, targeted: player.targeted }
            : p
        )
      )
    }
  }

  async function handleTarget(player: Player) {
    const wasTargeted = player.targeted
    const wasFlagged = player.flagged
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id
          ? {
              ...p,
              targeted: !wasTargeted,
              ...(!wasTargeted && { flagged: true }),
            }
          : p
      )
    )
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer((prev) =>
        prev
          ? {
              ...prev,
              targeted: !wasTargeted,
              ...(!wasTargeted && { flagged: true }),
            }
          : null
      )
    }
    try {
      await fetch(`/api/players/${player.id}/target`, { method: "PATCH" })
    } catch {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? { ...p, targeted: wasTargeted, flagged: wasFlagged }
            : p
        )
      )
    }
  }

  async function handleEditPick(
    pickId: string,
    teamId: string,
    salary: number
  ) {
    const res = await fetch(`/api/draft/picks/${pickId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, salary }),
    })
    const updated = (await res.json()) as DraftPickInfo
    setPlayers((prev) =>
      prev.map((p) =>
        p.draftPick?.id === pickId ? { ...p, draftPick: updated } : p
      )
    )
  }

  async function handleDeletePick(pickId: string) {
    await fetch(`/api/draft/picks/${pickId}`, { method: "DELETE" })
    setPlayers((prev) =>
      prev.map((p) =>
        p.draftPick?.id === pickId ? { ...p, draftPick: null } : p
      )
    )
  }

  const [snapshots, setSnapshots] = useState<TeamSnapshot[]>([])
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)

  const refreshPicks = useCallback(async () => {
    const res = await fetch("/api/draft/picks")
    if (!res.ok) return
    const data: { playerId: string; pick: DraftPickInfo }[] = await res.json()
    const pickMap = new Map(data.map((d) => [d.playerId, d.pick]))
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, draftPick: pickMap.get(p.id) ?? null }))
    )
  }, [])

  useEffect(() => {
    const es = new EventSource("/api/draft/events")
    es.addEventListener("pick", refreshPicks)
    return () => es.close()
  }, [refreshPicks])

  const defaultLoaded = useRef(false)

  const fetchSnapshots = useCallback(async () => {
    const res = await fetch("/api/team-snapshots")
    if (!res.ok) return
    const data: TeamSnapshot[] = await res.json()
    setSnapshots(data)
    if (!defaultLoaded.current) {
      defaultLoaded.current = true
      const def = data.find((s) => s.isDefault)
      if (def) {
        setCustomBudgets(def.budgets)
        setStrategyId(`snapshot:${def.id}`)
      }
    }
  }, [])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  async function handleSaveTemplate() {
    if (!saveName.trim()) return
    setSavingTemplate(true)
    try {
      await fetch("/api/team-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName.trim(), budgets: customBudgets }),
      })
      await fetchSnapshots()
      setSaveName("")
      setShowSaveInput(false)
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteSnapshot(id: string) {
    await fetch(`/api/team-snapshots/${id}`, { method: "DELETE" })
    setSnapshots((prev) => prev.filter((s) => s.id !== id))
    if (strategyId === `snapshot:${id}`) setStrategyId(STRATEGIES[0].id)
  }

  const draftedPlayers = useMemo(
    () =>
      players.filter((p) => p.draftPick !== null) as (Player & {
        draftPick: DraftPickInfo
      })[],
    [players]
  )
  const flaggedCount = players.filter((p) => p.flagged).length
  const picksCount = draftedPlayers.length

  const myTeamPicks = useMemo(
    () => players.filter((p): p is LivePick => p.draftPick?.team.isMyTeam === true),
    [players]
  )
  const amountSpent = myTeamPicks.reduce((s, p) => s + p.draftPick.salary, 0)
  const remainingBudget = TOTAL_BUDGET - amountSpent

  const isSnapshot = strategyId.startsWith("snapshot:")
  const isCustom = strategyId === "custom" || isSnapshot
  const strategy = isCustom
    ? CUSTOM_STRATEGY
    : (STRATEGIES.find((s) => s.id === strategyId) ?? STRATEGIES[0])

  const activeSlots = isCustom
    ? CUSTOM_TEMPLATE_SLOTS.map((slot, i) => ({
        ...slot,
        budget: customBudgets[i] ?? slot.budget,
      }))
    : strategy.slots

  // ── Live Draft computations ───────────────────────────────────────────────
  let liveAssignments = new Map<number, LivePick>()
  let liveBudgets: number[] = []
  let liveSlotPlayers: Player[][] = []

  if (liveMode) {
    liveAssignments = assignPicksToSlots(activeSlots, myTeamPicks)
    const filledIndices = new Set(liveAssignments.keys())

    const unfilledBudgets = activeSlots.map((s, i) =>
      filledIndices.has(i) ? 0 : s.budget
    )
    const unfilledTotal = unfilledBudgets.reduce((a, b) => a + b, 0)
    const overage = Math.max(0, unfilledTotal - remainingBudget)
    const adjustedBudgets =
      overage > 0
        ? applyBudgetCascade(unfilledBudgets, activeSlots, filledIndices, overage)
        : unfilledBudgets

    liveBudgets = activeSlots.map((_, i) =>
      filledIndices.has(i)
        ? liveAssignments.get(i)!.draftPick.salary
        : adjustedBudgets[i]
    )

    const used = new Set<string>(
      [...liveAssignments.values()].map((p) => p.id)
    )
    liveSlotPlayers = activeSlots.map((slot, i) => {
      if (liveAssignments.has(i)) return []
      const result = getSlotPlayers(
        players,
        slot.positions,
        liveBudgets[i],
        3,
        used,
        strategy.slotSortFn,
        maxAbove,
        maxBelow
      )
      result.forEach((p) => used.add(p.id))
      return result
    })
  }

  const displayBudgets: Record<string, SlotBudget> = isCustom
    ? (() => {
        const acc: Record<string, SlotBudget> = {}
        activeSlots.forEach((slot) => {
          if (!acc[slot.label]) acc[slot.label] = { slots: 0, budget: 0 }
          acc[slot.label].slots++
          acc[slot.label].budget += slot.budget
        })
        return acc
      })()
    : strategy.budgets

  const totalBudgeted = Object.values(displayBudgets).reduce(
    (s, b) => s + b.budget,
    0
  )

  const globalMax = useMemo(
    () =>
      Math.max(
        ...players.map((p) => Math.max(p.upside ?? 0, p.downside ?? 0)),
        1
      ),
    [players]
  )

  const slotPlayers = useMemo(() => {
    const slots = isCustom
      ? CUSTOM_TEMPLATE_SLOTS.map((slot, i) => ({
          ...slot,
          budget: customBudgets[i] ?? slot.budget,
        }))
      : strategy.slots
    const used = new Set<string>()
    return slots.map((slot) => {
      const result = getSlotPlayers(
        players,
        slot.positions,
        slot.budget,
        3,
        used,
        strategy.slotSortFn,
        maxAbove,
        maxBelow
      )
      result.forEach((p) => used.add(p.id))
      return result
    })
  }, [players, strategy, maxAbove, maxBelow, customBudgets, isCustom])

  const rosterPlayerIds = useMemo(
    () => new Set(slotPlayers.flat().map((p) => p.id)),
    [slotPlayers]
  )

  const positionalComps = useMemo(() => {
    if (!selectedPlayer) return []
    const rank = selectedPlayer.overallRank ?? 999
    return players
      .filter(
        (p) =>
          p.id !== selectedPlayer.id &&
          !rosterPlayerIds.has(p.id) &&
          p.pos === selectedPlayer.pos
      )
      .sort(
        (a, b) =>
          Math.abs((a.overallRank ?? 999) - rank) -
          Math.abs((b.overallRank ?? 999) - rank)
      )
      .slice(0, 5)
  }, [selectedPlayer, players, rosterPlayerIds])

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {/* ── Strategy Selector ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <select
          value={isCustom && !isSnapshot ? STRATEGIES[0].id : strategyId}
          onChange={(e) => {
            const val = e.target.value
            if (val.startsWith("snapshot:")) {
              const id = val.replace("snapshot:", "")
              const snap = snapshots.find((s) => s.id === id)
              if (snap) setCustomBudgets(snap.budgets)
            }
            setStrategyId(val)
          }}
          className="rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground transition-colors hover:bg-muted/80 focus:outline-none"
        >
          {STRATEGIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          {snapshots.length > 0 && (
            <optgroup label="My Templates">
              {snapshots.map((s) => (
                <option key={s.id} value={`snapshot:${s.id}`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          onClick={() => setStrategyId("custom")}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm transition-colors",
            isCustom
              ? "border-border bg-muted font-semibold text-foreground"
              : "border-dashed border-border/60 bg-muted/30 text-foreground/70 hover:bg-muted/50"
          )}
        >
          Custom
        </button>
        {showSaveInput ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTemplate()
                if (e.key === "Escape") {
                  setShowSaveInput(false)
                  setSaveName("")
                }
              }}
              placeholder="Template name…"
              className="rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
            <button
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !saveName.trim()}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {savingTemplate ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowSaveInput(false)
                setSaveName("")
              }}
              className="rounded-lg border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground/70 transition-colors hover:border-border hover:text-foreground"
          >
            Save As Template
          </button>
        )}
        <button
          onClick={() => setLiveMode((v) => !v)}
          className={cn(
            "ml-auto rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
            liveMode
              ? "border-green-400/40 bg-green-400/10 text-green-400 hover:bg-green-400/20"
              : "border-border/60 bg-muted/30 text-foreground/70 hover:bg-muted/50"
          )}
        >
          {liveMode ? "● Live" : "Live Draft"}
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Left Column — unchanged */}
        <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className={cn("mb-1.5 text-xs font-bold", strategy.accentClass)}>
              {strategy.name}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {strategy.philosophy}
            </p>
          </div>

          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                Budget Allocation
              </p>
              <span
                className={cn(
                  "font-mono text-xs font-semibold",
                  totalBudgeted === TOTAL_BUDGET
                    ? "text-green-400"
                    : "text-yellow-400"
                )}
              >
                ${totalBudgeted} / $250
              </span>
            </div>
            {Object.entries(displayBudgets).map(([key, val]) => (
              <BudgetBar key={key} posKey={key} data={val} />
            ))}
            {isCustom && (
              <button
                onClick={() =>
                  setCustomBudgets(CUSTOM_TEMPLATE_SLOTS.map((s) => s.budget))
                }
                className="mt-1 text-left text-[10px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                Reset to defaults
              </button>
            )}
          </div>

          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              Salary Window
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Max above budget</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono">$</span>
                  <input
                    type="number"
                    value={maxAbove}
                    min={0}
                    onChange={(e) =>
                      setMaxAbove(Math.max(0, Number(e.target.value)))
                    }
                    className="w-12 [appearance:textfield] rounded border border-border bg-muted px-1.5 py-0.5 text-right font-mono text-xs text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Max below budget</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono">$</span>
                  <input
                    type="number"
                    value={maxBelow}
                    min={0}
                    onChange={(e) =>
                      setMaxBelow(Math.max(0, Number(e.target.value)))
                    }
                    className="w-12 [appearance:textfield] rounded border border-border bg-muted px-1.5 py-0.5 text-right font-mono text-xs text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              Cap Notes
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Total roster</span>
                <span className="font-mono text-foreground">17 players</span>
              </div>
              <div className="flex justify-between">
                <span>Min spend (×$1)</span>
                <span className="font-mono text-foreground">$17</span>
              </div>
              <div className="flex justify-between">
                <span>Disposable</span>
                <span className="font-mono text-foreground">$233</span>
              </div>
              {strategy.budgets.BENCH && (
                <div className="flex justify-between">
                  <span>Avg bench slot</span>
                  <span className="font-mono text-foreground">
                    $
                    {(
                      strategy.budgets.BENCH.budget /
                      strategy.budgets.BENCH.slots
                    ).toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Roster Sheet */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-muted/50">
          {/* Live mode status bar */}
          {liveMode && (
            <div className="flex shrink-0 items-center justify-between border-b border-green-400/20 bg-green-400/5 px-3 py-1.5 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                <span className="font-semibold text-green-400">Live Draft</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">
                  {myTeamPicks.length} picked
                </span>
              </span>
              <span className="font-mono text-muted-foreground">
                <span className="text-foreground">${amountSpent}</span> spent ·{" "}
                <span
                  className={
                    remainingBudget < 0 ? "text-red-400" : "text-green-400"
                  }
                >
                  ${remainingBudget}
                </span>{" "}
                remaining
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
            <span className="w-16 shrink-0 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              Slot
            </span>
            <span className="w-20 shrink-0 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              {liveMode ? "Paid / Budget" : "Budget"}
            </span>
            <div className="flex min-w-0 flex-1 gap-2">
              {["Pick", "Option 1", "Option 2"].map((label) => (
                <span
                  key={label}
                  className="flex-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase"
                >
                  {liveMode ? label : label === "Pick" ? "Option 1" : label}
                </span>
              ))}
            </div>
          </div>

          {/* Slot Rows */}
          <div className="flex-1 overflow-y-auto">
            {activeSlots.map((slot, i) => {
              const lockedPick = liveMode ? liveAssignments.get(i) : undefined
              const displaySlot = liveMode
                ? { ...slot, budget: liveBudgets[i] ?? slot.budget }
                : slot
              const displayPlayers = liveMode
                ? liveSlotPlayers[i] ?? []
                : slotPlayers[i]
              return (
                <SlotRow
                  key={`${slot.label}-${i}`}
                  slot={displaySlot}
                  players={displayPlayers}
                  accentClass={strategy.accentClass}
                  selectedPlayerId={selectedPlayer?.id ?? null}
                  onPlayerSelect={setSelectedPlayer}
                  lockedPick={lockedPick}
                  plannedBudget={liveMode ? activeSlots[i].budget : undefined}
                  onBudgetChange={
                    !liveMode && isCustom
                      ? (v) => {
                          setCustomBudgets((prev) => {
                            const next = [...prev]
                            next[i] = v
                            return next
                          })
                        }
                      : undefined
                  }
                />
              )
            })}
          </div>
        </div>

        {/* Right Column — Tabbed Panel */}
        <div className="flex w-96 shrink-0 flex-col gap-3 overflow-y-auto">
          <div className="flex-1 overflow-y-auto rounded-xl bg-muted/50 p-4">
            <div className="mb-3 flex items-center">
              <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
                <button
                  onClick={() => setRightPanel("details")}
                  title="Details"
                  className={`relative flex min-w-12 items-center justify-center rounded p-1.5 transition-colors ${
                    rightPanel === "details"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setRightPanel("my-list")}
                  title="My List"
                  className={`relative flex min-w-12 items-center justify-center rounded p-1.5 transition-colors ${
                    rightPanel === "my-list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" />
                  {flaggedCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-yellow-400 px-0.5 py-px text-[8px] leading-none font-bold text-black">
                      {flaggedCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setRightPanel("picks")}
                  title="Picks"
                  className={`relative flex min-w-12 items-center justify-center rounded p-1.5 transition-colors ${
                    rightPanel === "picks"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  {picksCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 py-px text-[8px] leading-none font-bold text-primary-foreground">
                      {picksCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setRightPanel("analytics")}
                  title="Analytics"
                  className={`relative flex min-w-12 items-center justify-center rounded p-1.5 transition-colors ${
                    rightPanel === "analytics"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className={rightPanel !== "details" ? "hidden" : ""}>
              <PlayerDetail
                player={selectedPlayer}
                globalMax={globalMax}
                rankingHistory={null}
              />
            </div>
            <div className={rightPanel !== "my-list" ? "hidden" : ""}>
              <MyList
                players={players}
                onPlayerSelect={(p) => {
                  const full = players.find((pl) => pl.id === p.id) ?? null
                  setSelectedPlayer(full)
                  setRightPanel("details")
                }}
                onFlag={(id) => {
                  const p = players.find((pl) => pl.id === id)
                  if (p) handleFlag(p)
                }}
                onTarget={(id) => {
                  const p = players.find((pl) => pl.id === id)
                  if (p) handleTarget(p)
                }}
              />
            </div>
            <div className={rightPanel !== "picks" ? "hidden" : ""}>
              <DraftLog
                players={draftedPlayers}
                draftTeams={draftTeams}
                onEdit={handleEditPick}
                onDelete={handleDeletePick}
              />
            </div>
            <div className={rightPanel !== "analytics" ? "hidden" : ""}>
              <DraftAnalytics players={players as unknown as RankedPlayer[]} />
            </div>
          </div>
          {rightPanel === "details" && selectedPlayer && (
            <PositionalComps
              label={`Similar ${selectedPlayer.pos ?? ""}s`}
              players={positionalComps}
            />
          )}
        </div>
      </div>
    </div>
  )
}
