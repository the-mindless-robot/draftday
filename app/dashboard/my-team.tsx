"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { fbgPlayerUrl } from "@/lib/fbg-url"

type DraftPickInfo = {
  id: string
  salary: number
  teamId: string
  createdAt: string | Date
  team: { id: string; name: string; isMyTeam: boolean }
}

type RankedPlayer = {
  id: string
  fbgId: string
  name: string
  team: string | null
  pos: string | null
  positionalRank: number | null
  positionalTier: string | null
  scFbg250: string | null
  scFbg200: string | null
  scEspn200: string | null
  flagged: boolean
  targeted: boolean
  draftPick: DraftPickInfo | null
}

type MyPick = RankedPlayer & { draftPick: DraftPickInfo }

type RosterSlot = {
  label: string
  budget: number
  positions: string[]
}

type TeamSnapshot = {
  id: string
  name: string
  budgets: number[]
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

const POS_SLOT_ORDER: Record<string, number[]> = {
  QB:  [0],
  RB:  [1, 2, 6, 7, 10, 11, 12, 13, 14, 15],
  WR:  [3, 4, 6, 7, 10, 11, 12, 13, 14, 15],
  TE:  [5, 6, 7, 10, 11, 12, 13, 14, 15],
  K:   [9], PK: [9],
  TD:  [8], DST: [8],
}

const SKIP_SLOTS = new Set([8, 9])

// Surplus priority: WR → RB → FLEX → FLEX → TE → QB → BENCH
const SURPLUS_ORDER = [3, 4, 1, 2, 6, 7, 5, 0, 10, 11, 12, 13, 14, 15]
// Deficit priority: BENCH → QB → TE → FLEX → FLEX → RB → WR
const DEFICIT_ORDER = [15, 14, 13, 12, 11, 10, 0, 5, 7, 6, 2, 1, 4, 3]

const DEFAULT_BUDGETS = ROSTER_SLOTS.map((s) => s.budget)

function assignPicks(picks: MyPick[]): (MyPick | null)[] {
  const assigned: (MyPick | null)[] = Array(ROSTER_SLOTS.length).fill(null)
  const sorted = [...picks].sort(
    (a, b) => (a.positionalRank ?? 999) - (b.positionalRank ?? 999)
  )
  for (const pick of sorted) {
    const pos = pick.pos?.toUpperCase() ?? ""
    for (const idx of POS_SLOT_ORDER[pos] ?? []) {
      if (!assigned[idx]) { assigned[idx] = pick; break }
    }
  }
  return assigned
}

function redistributeBudget(
  base: number[],
  assigned: (MyPick | null)[]
): number[] {
  const budgets = [...base]
  let surplus = 0
  for (let i = 0; i < ROSTER_SLOTS.length; i++) {
    if (SKIP_SLOTS.has(i) || !assigned[i]) continue
    surplus += budgets[i] - assigned[i]!.draftPick.salary
    budgets[i] = assigned[i]!.draftPick.salary
  }
  if (surplus === 0) return budgets
  const order = surplus > 0 ? SURPLUS_ORDER : DEFICIT_ORDER
  const empty = order.filter((i) => !SKIP_SLOTS.has(i) && !assigned[i])
  if (empty.length === 0) return budgets
  const abs = Math.abs(surplus)
  const perSlot = Math.floor(abs / empty.length)
  const extra = abs % empty.length
  for (let j = 0; j < empty.length; j++) {
    const delta = perSlot + (j < extra ? 1 : 0)
    if (surplus > 0) {
      budgets[empty[j]] += delta
    } else {
      budgets[empty[j]] = Math.max(1, budgets[empty[j]] - delta)
    }
  }
  return budgets
}

const SUFFIXES = /\s+(Jr\.?|Sr\.?|II|III|IV|V)$/i

function lastName(player: RankedPlayer | null): string {
  if (!player) return "open"
  const stripped = player.name.replace(SUFFIXES, "").trim()
  return (stripped.split(" ").pop() ?? stripped).toLowerCase()
}

function buildStem(suggestions: (RankedPlayer | null)[]): string {
  const qb   = lastName(suggestions[0])
  const rb   = lastName(suggestions[1])
  const wr   = lastName(suggestions[3])
  const flex = lastName(suggestions[6])
  return `${qb}-${wr}-${rb}-${flex}`
}

const POS_COLORS: Record<string, { text: string; border: string }> = {
  QB:    { text: "text-blue-400",         border: "border-blue-400/30" },
  RB:    { text: "text-green-400",        border: "border-green-400/30" },
  WR:    { text: "text-yellow-400",       border: "border-yellow-400/30" },
  TE:    { text: "text-orange-400",       border: "border-orange-400/30" },
  FLEX:  { text: "text-pink-400",         border: "border-pink-400/30" },
  TD:    { text: "text-cyan-400",         border: "border-cyan-400/30" },
  PK:    { text: "text-purple-400",       border: "border-purple-400/30" },
  BENCH: { text: "text-muted-foreground", border: "border-border/40" },
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

export function MyTeam({
  players,
  myTeamPicks,
}: {
  players: RankedPlayer[]
  myTeamPicks: MyPick[]
}) {
  const assignedSlots = useMemo(() => assignPicks(myTeamPicks), [myTeamPicks])

  const [budgets, setBudgets] = useState<number[]>(DEFAULT_BUDGETS)
  const [snapshots, setSnapshots] = useState<TeamSnapshot[]>([])
  const [saving, setSaving] = useState(false)
  const [maxOver, setMaxOver] = useState(5)

  useEffect(() => {
    setBudgets(redistributeBudget(DEFAULT_BUDGETS, assignedSlots))
  }, [assignedSlots])

  const fetchSnapshots = useCallback(async () => {
    const res = await fetch("/api/team-snapshots")
    if (res.ok) setSnapshots(await res.json())
  }, [])

  useEffect(() => { fetchSnapshots() }, [fetchSnapshots])

  const suggestions = useMemo(() => {
    const draftedIds = new Set(myTeamPicks.map((p) => p.id))
    const targeted = players.filter((p) => p.targeted && !p.draftPick)
    const watching = players.filter((p) => p.flagged && !p.targeted && !p.draftPick)
    const available = players.filter((p) => !p.draftPick)
    const used = new Set<string>(draftedIds)

    function bestFit(pool: RankedPlayer[], slot: RosterSlot, budget: number): RankedPlayer | null {
      return pool
        .filter((p) => {
          if (used.has(p.id) || !p.pos || !slot.positions.includes(p.pos)) return false
          const salary = fbgAvg(p)
          return salary === null || salary <= budget + maxOver
        })
        .sort((a, b) => {
          const aVal = fbgAvg(a) ?? 0
          const bVal = fbgAvg(b) ?? 0
          return Math.abs(budget - aVal) - Math.abs(budget - bVal)
        })[0] ?? null
    }

    return ROSTER_SLOTS.map((slot, i) => {
      if (assignedSlots[i]) return null
      const budget = budgets[i] ?? slot.budget
      const pick =
        bestFit(targeted, slot, budget) ??
        bestFit(watching, slot, budget) ??
        bestFit(available, slot, budget)
      if (pick) used.add(pick.id)
      return pick
    })
  }, [players, budgets, maxOver, assignedSlots, myTeamPicks])

  async function handleSave() {
    setSaving(true)
    try {
      const displaySlots = ROSTER_SLOTS.map((_, i) => assignedSlots[i] ?? suggestions[i])
      const stem = buildStem(displaySlots)
      await fetch("/api/team-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stem, budgets }),
      })
      await fetchSnapshots()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/team-snapshots/${id}`, { method: "DELETE" })
    setSnapshots((prev) => prev.filter((s) => s.id !== id))
  }

  function handleLoad(snapshot: TeamSnapshot) {
    setBudgets(snapshot.budgets as number[])
  }

  const totalSpent = myTeamPicks.reduce((sum, p) => sum + p.draftPick.salary, 0)
  const remaining = 250 - totalSpent
  const myListCount = players.filter((p) => p.flagged).length
  const hasContent = myListCount > 0 || myTeamPicks.length > 0

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
        <p className="text-xs font-medium text-muted-foreground">No players on My List</p>
        <p className="text-[11px] text-muted-foreground/60">
          Star players in the rankings to see suggestions here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Budget summary */}
      <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
        <span>Spent</span>
        <span className="flex items-center gap-2 font-mono">
          ${totalSpent} / $250
          {totalSpent > 0 && (
            <span className="text-muted-foreground/60">({remaining} left)</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-1 rounded border border-border bg-background px-2 py-0.5 font-sans text-[10px] font-semibold text-foreground transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </span>
      </div>

      {/* Leniency control */}
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Max over budget</span>
        <div className="flex items-center gap-0.5">
          <span className="font-mono">$</span>
          <input
            type="number"
            min={0}
            value={maxOver}
            onChange={(e) => setMaxOver(Math.max(0, Number(e.target.value)))}
            className="w-10 [appearance:textfield] rounded border border-border bg-background px-1 py-0.5 text-right font-mono text-[11px] font-semibold text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="mb-1 flex items-center gap-2 border-b border-border/30 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
        <span className="w-11 shrink-0">Slot</span>
        <span className="w-9 shrink-0">Bdgt</span>
        <span className="flex-1">Player</span>
        <span className="w-9 shrink-0 text-right">Value</span>
        <span className="w-8 shrink-0 text-right">Est.</span>
        <span className="w-10 shrink-0 text-right">$Paid</span>
      </div>

      {ROSTER_SLOTS.map((slot, i) => {
        const actual = assignedSlots[i]
        const suggested = suggestions[i]
        const player = actual ?? suggested
        const colors = POS_COLORS[slot.label] ?? POS_COLORS.BENCH

        return (
          <div
            key={`${slot.label}-${i}`}
            className={`flex items-center gap-2 border-b border-border/10 py-1.5 last:border-0 ${actual ? "opacity-100" : ""}`}
          >
            {/* Slot badge */}
            <span
              className={`w-11 shrink-0 rounded border px-1 py-0.5 text-center font-mono text-[10px] font-bold ${colors.text} ${colors.border}`}
            >
              {slot.label}
            </span>

            {/* Budget / salary */}
            <div className="flex w-9 shrink-0 items-center gap-0.5">
              {actual ? (
                <span className="w-full text-right font-mono text-[11px] font-semibold text-primary">
                  ${actual.draftPick.salary}
                </span>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Player */}
            <div className="flex min-w-0 flex-1 flex-col gap-0">
              {player ? (
                <>
                  <div className="flex min-w-0 items-baseline gap-1">
                    <span className={`shrink-0 font-mono text-[10px] font-semibold ${colors.text}`}>
                      {player.pos}{player.positionalRank ?? ""}
                    </span>
                    <a
                      href={fbgPlayerUrl(player.name, player.fbgId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[11px] font-medium leading-tight hover:underline"
                    >
                      {player.name}
                    </a>
                    {actual && (
                      <span className="shrink-0 rounded bg-primary/15 px-1 py-0.5 font-mono text-[9px] font-bold text-primary leading-none">
                        DRAFTED
                      </span>
                    )}
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

            {/* Value */}
            <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
              {player ? (() => { const v = fbgAvg(player); return v != null ? `$${v.toFixed(0)}` : "—" })() : "—"}
            </span>

            {/* Est. */}
            <span className="w-8 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
              {player ? (() => { const b = parseSalary(player.scEspn200); return b != null ? `$${Math.round(b * 1.25)}` : "—" })() : "—"}
            </span>

            {/* $Paid */}
            <span className={`w-10 shrink-0 text-right font-mono text-[11px] ${actual ? "font-semibold text-primary" : "text-muted-foreground/40"}`}>
              {actual ? `$${actual.draftPick.salary}` : "—"}
            </span>
          </div>
        )
      })}

      {/* Saved snapshots */}
      {snapshots.length > 0 && (
        <div className="mt-3 flex flex-col gap-0.5">
          {snapshots.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                {s.name}
              </span>
              <button
                onClick={() => handleLoad(s)}
                className="shrink-0 text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                Load
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="shrink-0 text-muted-foreground/40 transition-colors hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
