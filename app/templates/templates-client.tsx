"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type Player = {
  id: string
  name: string
  team: string | null
  pos: string | null
  overallRank: number | null
  positionalRank: number | null
  projPoints: number | null
  scFbg250: string | null
  scFbg200: string | null
  scEspn200: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSalary(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

function fbgSalary(p: Player): number | null {
  const a = parseSalary(p.scFbg250)
  const b = parseSalary(p.scFbg200)
  if (a != null && b != null) return (a + b) / 2
  return a ?? b
}

// Explicit class strings so Tailwind picks them up at build time
const POS_COLORS: Record<string, { text: string; bg: string }> = {
  QB:    { text: "text-blue-400",         bg: "bg-blue-400" },
  RB:    { text: "text-green-400",        bg: "bg-green-400" },
  WR:    { text: "text-yellow-400",       bg: "bg-yellow-400" },
  TE:    { text: "text-orange-400",       bg: "bg-orange-400" },
  PK:    { text: "text-purple-400",       bg: "bg-purple-400" },
  K:     { text: "text-purple-400",       bg: "bg-purple-400" },
  TD:    { text: "text-sky-400",          bg: "bg-sky-400" },
  FLEX:  { text: "text-indigo-400",       bg: "bg-indigo-400" },
  BENCH: { text: "text-muted-foreground", bg: "bg-muted-foreground/30" },
  STARS: { text: "text-amber-400",        bg: "bg-amber-400" },
  REST:  { text: "text-muted-foreground", bg: "bg-muted-foreground/30" },
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
  budgets: Record<string, SlotBudget>
  priorityPositions: string[]
}

const STRATEGIES: StrategyDef[] = [
  {
    id: "rb-heavy",
    name: "Bellcow or Bust",
    tagline: "Lock elite RBs, fill the rest cheap",
    philosophy:
      "Running backs depreciate fastest in ADP but dominate weekly floors. Lock in 2–3 elite bellcows across your RB and FLEX slots, then stream everything else at minimum cost. Win the position everyone else punts.",
    accentClass: "text-green-400",
    priorityPositions: ["RB"],
    budgets: {
      RB:    { slots: 4, budget: 145, label: "2 RB + 2 FLEX" },
      WR:    { slots: 2, budget: 45 },
      TE:    { slots: 1, budget: 20 },
      QB:    { slots: 1, budget: 10,  label: "Stream" },
      TD:    { slots: 1, budget: 5 },
      PK:    { slots: 1, budget: 1 },
      BENCH: { slots: 6, budget: 24,  label: "Handcuffs" },
    },
  },
  {
    id: "air-raid",
    name: "Air Raid",
    tagline: "Stack WRs, punt RBs, ride the pass game",
    philosophy:
      "WRs offer more consistent weekly floors in the modern pass-heavy era. Stack a premium QB with 4 WR slots and let them dominate both FLEX spots. RBs are volatile and replaceable — don't pay the premium.",
    accentClass: "text-yellow-400",
    priorityPositions: ["WR", "QB"],
    budgets: {
      WR:    { slots: 4, budget: 140, label: "2 WR + 2 FLEX" },
      QB:    { slots: 1, budget: 30,  label: "Premium — stack with WRs" },
      RB:    { slots: 2, budget: 30,  label: "Cheap committee backs" },
      TE:    { slots: 1, budget: 10,  label: "Stream" },
      TD:    { slots: 1, budget: 5 },
      PK:    { slots: 1, budget: 1 },
      BENCH: { slots: 6, budget: 34 },
    },
  },
  {
    id: "stars-scrubs",
    name: "Stars & Scrubs",
    tagline: "2–3 studs, everything else at $1",
    philosophy:
      "Concentrate 70%+ of your budget on the 2–3 highest-projected players regardless of position. Fill the remaining 12 slots with high-upside bench fliers at minimum cost. Accept variance — you're swinging for the ceiling.",
    accentClass: "text-purple-400",
    priorityPositions: ["RB", "WR", "TE"],
    budgets: {
      STARS: { slots: 3,  budget: 175, label: "Any pos — overall rank 1–20" },
      REST:  { slots: 12, budget: 75,  label: "Fill all remaining slots" },
    },
  },
  {
    id: "te-premium",
    name: "Kelce Effect",
    tagline: "Elite TE gives you a weekly structural edge",
    philosophy:
      "An elite TE playing like a WR2 gives you a structural advantage opponents can't overcome every week. Pair with a premium QB for a stack, then balance RB and WR across your remaining slots. Pay the TE tax — it compounds.",
    accentClass: "text-orange-400",
    priorityPositions: ["TE", "QB"],
    budgets: {
      TE:    { slots: 1, budget: 65, label: "Elite TE1 only" },
      QB:    { slots: 1, budget: 35, label: "Premium — stack with TE" },
      RB:    { slots: 3, budget: 55, label: "2 RB + 1 FLEX" },
      WR:    { slots: 3, budget: 55, label: "2 WR + 1 FLEX" },
      TD:    { slots: 1, budget: 5 },
      PK:    { slots: 1, budget: 1 },
      BENCH: { slots: 6, budget: 34 },
    },
  },
]

const POSITION_TABS = ["QB", "RB", "WR", "TE", "FLEX", "TD", "PK"] as const

function getPositionFilter(tab: string) {
  return (p: Player): boolean => {
    switch (tab) {
      case "TOP":  return true
      case "FLEX": return ["RB", "WR", "TE"].includes(p.pos ?? "")
      case "TD":   return p.pos === "TD" || p.pos === "DST"
      case "PK":   return p.pos === "K" || p.pos === "PK"
      default:     return p.pos === tab
    }
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BudgetBar({ posKey, data }: { posKey: string; data: SlotBudget }) {
  const colors = POS_COLORS[posKey] ?? POS_COLORS.BENCH
  const pct = (data.budget / TOTAL_BUDGET) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={cn("text-xs font-mono font-bold w-12 shrink-0", colors.text)}>
            {posKey}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">
            {data.slots} slot{data.slots !== 1 ? "s" : ""}
            {data.label ? ` · ${data.label}` : ""}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">${data.budget}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", colors.bg)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PlayerRow({ player, index }: { player: Player; index: number }) {
  const salary = fbgSalary(player)
  const espn = parseSalary(player.scEspn200)
  const delta = espn != null && salary != null ? espn - salary : null
  const colors = POS_COLORS[player.pos ?? ""] ?? { text: "text-muted-foreground" }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
      <span className="w-5 text-right text-[10px] font-mono text-muted-foreground shrink-0">
        {index + 1}
      </span>
      <span className={cn("w-10 text-[10px] font-mono font-semibold shrink-0", colors.text)}>
        {player.pos}{player.positionalRank ?? ""}
      </span>
      <span className="flex-1 min-w-0 text-xs font-medium truncate">
        {player.name}
        {player.team && (
          <span className="text-muted-foreground font-normal"> {player.team}</span>
        )}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-12 text-right">
        {player.projPoints != null ? `${player.projPoints.toFixed(0)} pts` : "—"}
      </span>
      <span className="text-xs font-mono shrink-0 w-10 text-right">
        {salary != null ? `$${salary.toFixed(0)}` : "—"}
      </span>
      <span
        className={cn(
          "text-[10px] font-mono shrink-0 w-10 text-right",
          delta == null
            ? "text-muted-foreground"
            : delta > 0
              ? "text-red-400/70"
              : "text-green-400",
        )}
      >
        {delta == null
          ? "—"
          : delta > 0
            ? `+$${delta.toFixed(0)}`
            : `-$${Math.abs(delta).toFixed(0)}`}
      </span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TemplatesClient({ players }: { players: Player[] }) {
  const [strategyId, setStrategyId] = useState(STRATEGIES[0].id)
  const [activeTab, setActiveTab] = useState<string>("RB")

  const strategy = STRATEGIES.find((s) => s.id === strategyId) ?? STRATEGIES[0]
  const totalBudgeted = Object.values(strategy.budgets).reduce((s, b) => s + b.budget, 0)

  const positionTabs =
    strategyId === "stars-scrubs"
      ? ["TOP", ...POSITION_TABS]
      : [...POSITION_TABS]

  const filteredPlayers = useMemo(() => {
    const filter = getPositionFilter(activeTab)
    return [...players]
      .filter(filter)
      .sort((a, b) => {
        if (activeTab === "TOP") return (a.overallRank ?? 999) - (b.overallRank ?? 999)
        return (a.positionalRank ?? 999) - (b.positionalRank ?? 999)
      })
      .slice(0, 25)
  }, [players, activeTab])

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4">

      {/* ── Strategy Selector ── */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {STRATEGIES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setStrategyId(s.id)
              setActiveTab(s.id === "stars-scrubs" ? "TOP" : s.priorityPositions[0])
            }}
            className={cn(
              "rounded-xl p-3 text-left transition-colors border",
              s.id === strategyId
                ? "bg-muted border-border"
                : "bg-muted/30 border-transparent hover:bg-muted/50",
            )}
          >
            <p className={cn("text-xs font-bold", s.accentClass)}>{s.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{s.tagline}</p>
          </button>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">

        {/* Left Column — Strategy Details */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* Philosophy */}
          <div className="rounded-xl bg-muted/50 p-4">
            <p className={cn("text-xs font-bold mb-1.5", strategy.accentClass)}>
              {strategy.name}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {strategy.philosophy}
            </p>
          </div>

          {/* Budget Allocation */}
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                Budget Allocation
              </p>
              <span
                className={cn(
                  "text-xs font-mono font-semibold",
                  totalBudgeted === TOTAL_BUDGET ? "text-green-400" : "text-yellow-400",
                )}
              >
                ${totalBudgeted} / $250
              </span>
            </div>
            {Object.entries(strategy.budgets).map(([key, val]) => (
              <BudgetBar key={key} posKey={key} data={val} />
            ))}
          </div>

          {/* Cap Notes */}
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase mb-2">
              Cap Notes
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Total roster</span>
                <span className="font-mono text-foreground">15 players</span>
              </div>
              <div className="flex justify-between">
                <span>Min spend (×$1)</span>
                <span className="font-mono text-foreground">$15</span>
              </div>
              <div className="flex justify-between">
                <span>Disposable</span>
                <span className="font-mono text-foreground">$235</span>
              </div>
              {strategy.budgets.BENCH && (
                <div className="flex justify-between">
                  <span>Avg bench slot</span>
                  <span className="font-mono text-foreground">
                    ${(strategy.budgets.BENCH.budget / strategy.budgets.BENCH.slots).toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Player List */}
        <div className="flex-1 flex flex-col rounded-xl bg-muted/50 overflow-hidden min-w-0">

          {/* Position Tabs */}
          <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 shrink-0">
            {positionTabs.map((tab) => {
              const isPriority = strategy.priorityPositions.includes(tab)
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded transition-colors font-medium",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {tab}
                  {isPriority && (
                    <span className={cn("ml-0.5 text-[8px] align-super", strategy.accentClass)}>
                      ★
                    </span>
                  )}
                </button>
              )
            })}
            <div className="flex-1" />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 pr-2 shrink-0">
              <span className="w-12 text-right">Proj</span>
              <span className="w-10 text-right">FBG$</span>
              <span className="w-10 text-right">ΔESPN</span>
            </div>
          </div>

          <div className="h-px bg-border/50 mx-2 shrink-0" />

          {/* Players */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredPlayers.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                No players found for this position
              </div>
            ) : (
              filteredPlayers.map((p, i) => <PlayerRow key={p.id} player={p} index={i} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
