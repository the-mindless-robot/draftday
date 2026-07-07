"use client"

import { useMemo, useState } from "react"

type RankedPlayer = {
  id: string
  name: string
  team: string | null
  pos: string | null
  positionalRank: number | null
  positionalTier: string | null
  scFbg250: string | null
  scFbg200: string | null
  flagged: boolean
}

type RosterSlot = {
  label: string
  budget: number
  positions: string[]
}

const ROSTER_SLOTS: RosterSlot[] = [
  { label: "QB",    budget: 25, positions: ["QB"] },
  { label: "RB",    budget: 40, positions: ["RB"] },
  { label: "RB",    budget: 28, positions: ["RB"] },
  { label: "WR",    budget: 40, positions: ["WR"] },
  { label: "WR",    budget: 28, positions: ["WR"] },
  { label: "TE",    budget: 32, positions: ["TE"] },
  { label: "FLEX",  budget: 20, positions: ["RB", "WR", "TE"] },
  { label: "FLEX",  budget: 13, positions: ["RB", "WR", "TE"] },
  { label: "TD",    budget:  5, positions: ["TD"] },
  { label: "PK",    budget:  1, positions: ["PK"] },
  { label: "BENCH", budget:  5, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget:  4, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget:  4, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget:  3, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget:  1, positions: ["RB", "WR", "TE"] },
  { label: "BENCH", budget:  1, positions: ["RB", "WR", "TE"] },
]

const POS_COLORS: Record<string, { text: string; border: string }> = {
  QB:    { text: "text-blue-400",            border: "border-blue-400/30" },
  RB:    { text: "text-green-400",           border: "border-green-400/30" },
  WR:    { text: "text-yellow-400",          border: "border-yellow-400/30" },
  TE:    { text: "text-orange-400",          border: "border-orange-400/30" },
  FLEX:  { text: "text-pink-400",            border: "border-pink-400/30" },
  TD:    { text: "text-cyan-400",            border: "border-cyan-400/30" },
  PK:    { text: "text-purple-400",          border: "border-purple-400/30" },
  BENCH: { text: "text-muted-foreground",    border: "border-border/40" },
}

function parseSalary(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

function fbgAvg(p: RankedPlayer): number | null {
  const a = parseSalary(p.scFbg250)
  const b = parseSalary(p.scFbg200)
  if (a != null && b != null) return (a + b) / 2
  return a ?? b
}

export function MyTeam({ players }: { players: RankedPlayer[] }) {
  const [budgets, setBudgets] = useState<number[]>(() =>
    ROSTER_SLOTS.map((s) => s.budget)
  )

  const suggestions = useMemo(() => {
    const myList = players.filter((p) => p.flagged)
    const used = new Set<string>()

    return ROSTER_SLOTS.map((slot, i) => {
      const budget = budgets[i] ?? slot.budget
      const pick = myList
        .filter(
          (p) =>
            !used.has(p.id) &&
            p.pos != null &&
            slot.positions.includes(p.pos),
        )
        .sort((a, b) => {
          const aVal = fbgAvg(a) ?? 0
          const bVal = fbgAvg(b) ?? 0
          return Math.abs(budget - aVal) - Math.abs(budget - bVal)
        })[0] ?? null

      if (pick) used.add(pick.id)
      return pick
    })
  }, [players, budgets])

  const myListCount = players.filter((p) => p.flagged).length

  if (myListCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
        <p className="text-xs font-medium text-muted-foreground">No players on My List</p>
        <p className="text-[11px] text-muted-foreground/60">
          Star players in the rankings to see suggestions here.
        </p>
      </div>
    )
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b, 0)
  const overBudget = totalBudget > 250

  return (
    <div className="flex flex-col">
      {/* Budget total */}
      <div className={`mb-3 flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-semibold ${overBudget ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"}`}>
        <span>Budget used</span>
        <span className="font-mono">
          ${totalBudget} / $250
          {overBudget && <span className="ml-1.5">— over by ${totalBudget - 250}</span>}
        </span>
      </div>

      {/* Column headers */}
      <div className="mb-1 flex items-center gap-2 border-b border-border/30 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
        <span className="w-11 shrink-0">Slot</span>
        <span className="w-9 shrink-0">Bdgt</span>
        <span className="flex-1">Suggested</span>
        <span className="w-10 shrink-0 text-right">Spent</span>
      </div>

      {ROSTER_SLOTS.map((slot, i) => {
        const player = suggestions[i]
        const colors = POS_COLORS[slot.label] ?? POS_COLORS.BENCH

        return (
          <div
            key={`${slot.label}-${i}`}
            className="flex items-center gap-2 border-b border-border/10 py-1.5 last:border-0"
          >
            {/* Slot badge */}
            <span
              className={`w-11 shrink-0 rounded border px-1 py-0.5 text-center font-mono text-[10px] font-bold ${colors.text} ${colors.border}`}
            >
              {slot.label}
            </span>

            {/* Budget */}
            <div className="flex w-9 shrink-0 items-center gap-0.5">
              <span className="font-mono text-[11px] text-muted-foreground">$</span>
              <input
                type="number"
                min={1}
                value={budgets[i] ?? slot.budget}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value))
                  setBudgets((prev) => {
                    const next = [...prev]
                    next[i] = val
                    return next
                  })
                }}
                className="w-8 [appearance:textfield] rounded border border-border bg-background px-1 py-0.5 text-right font-mono text-[11px] font-semibold text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            {/* Suggested player */}
            <div className="flex min-w-0 flex-1 flex-col gap-0">
              {player ? (
                <>
                  <div className="flex min-w-0 items-baseline gap-1">
                    <span
                      className={`shrink-0 font-mono text-[10px] font-semibold ${colors.text}`}
                    >
                      {player.pos}{player.positionalRank ?? ""}
                    </span>
                    <span className="truncate text-[11px] font-medium leading-tight">
                      {player.name}
                    </span>
                  </div>
                  {(player.team || player.positionalTier) && (
                    <span className="text-[10px] leading-none text-muted-foreground/60">
                      {[player.team, player.positionalTier].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground/40">—</span>
              )}
            </div>

            {/* Spent — populated when draft functionality is added */}
            <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground/40">
              —
            </span>
          </div>
        )
      })}
    </div>
  )
}
