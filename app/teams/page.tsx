import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import prisma from "@/lib/prisma"
import { DollarSign, Users } from "lucide-react"

const POS_ORDER: Record<string, number> = {
  QB: 0, RB: 1, WR: 2, TE: 3, K: 4, PK: 4, TD: 5, DST: 5,
}

// Mirrors ROSTER_SLOTS in my-team.tsx — 3pts for starter slots, 1pt for rest
const SLOT_POINTS = [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1]
const ROSTER_MAX = 33

const POS_SLOT_ORDER: Record<string, number[]> = {
  QB:  [0],
  RB:  [1, 2, 6, 7, 10, 11, 12, 13, 14, 15, 16],
  WR:  [3, 4, 6, 7, 10, 11, 12, 13, 14, 15, 16],
  TE:  [5, 6, 7, 10, 11, 12, 13, 14, 15, 16],
  K:   [9],
  PK:  [9],
  TD:  [8],
  DST: [8],
}

function rosterScore(picks: { player: { pos: string | null }; positionalRank?: number | null }[]): number {
  const filled = new Array(SLOT_POINTS.length).fill(false)
  const sorted = [...picks].sort(
    (a, b) => (a.positionalRank ?? 999) - (b.positionalRank ?? 999)
  )
  let score = 0
  for (const pick of sorted) {
    const pos = pick.player.pos?.toUpperCase() ?? ""
    for (const idx of POS_SLOT_ORDER[pos] ?? []) {
      if (!filled[idx]) {
        filled[idx] = true
        score += SLOT_POINTS[idx]
        break
      }
    }
  }
  return score
}

function posColor(pos: string | null): string {
  switch (pos?.toUpperCase()) {
    case "QB": return "text-blue-400"
    case "RB": return "text-green-400"
    case "WR": return "text-yellow-400"
    case "TE": return "text-orange-400"
    case "K":
    case "PK": return "text-purple-400"
    default: return "text-muted-foreground"
  }
}

export default async function TeamsPage() {
  const teams = await prisma.draftTeam.findMany({
    orderBy: { name: "asc" },
    include: {
      picks: {
        orderBy: { createdAt: "asc" },
        include: {
          player: { select: { id: true, name: true, pos: true } },
        },
      },
    },
  })

  const teamsWithStats = teams.map((t) => {
    const spent = t.picks.reduce((sum, p) => sum + p.salary, 0)
    const score = rosterScore(t.picks)
    const sortedPicks = [...t.picks].sort((a, b) => {
      const ao = POS_ORDER[a.player.pos?.toUpperCase() ?? ""] ?? 6
      const bo = POS_ORDER[b.player.pos?.toUpperCase() ?? ""] ?? 6
      return ao !== bo ? ao - bo : b.salary - a.salary
    })
    return { ...t, spent, remaining: t.budget - spent, score, sortedPicks }
  })

  return (
    <div className="flex h-dvh flex-col [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-1 flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="overflow-auto">
            <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-3 2xl:grid-cols-5">
              {teamsWithStats.map((team) => {
                const pctSpent = Math.min((team.spent / team.budget) * 100, 100)
                const pctRoster = Math.min((team.score / ROSTER_MAX) * 100, 100)
                const over = team.spent > team.budget

                return (
                  <div
                    key={team.id}
                    className={`flex flex-col rounded-xl bg-muted/50 p-3 ${team.isMyTeam ? "ring-1 ring-primary/40" : ""}`}
                  >
                    {/* Header */}
                    <div className="mb-2 flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className={`truncate text-xs font-semibold ${team.isMyTeam ? "text-primary" : "text-foreground"}`}>
                          {team.name}
                          {team.isMyTeam && (
                            <span className="ml-1.5 rounded bg-primary/15 px-1 py-0.5 font-mono text-[9px] font-bold text-primary leading-none">
                              ME
                            </span>
                          )}
                        </p>
                        <p className={`font-mono text-[11px] font-semibold ${over ? "text-red-400" : "text-muted-foreground"}`}>
                          ${team.spent} / ${team.budget}
                          {over && <span className="ml-1 text-red-400">over</span>}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${over ? "bg-red-500/15 text-red-400" : "bg-muted text-muted-foreground"}`}>
                        ${team.remaining}
                      </span>
                    </div>

                    {/* Budget bar */}
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <DollarSign className={`h-3 w-3 shrink-0 ${over ? "text-red-400" : "text-muted-foreground/50"}`} />
                      <div className="flex-1 overflow-hidden rounded-full bg-border/50" style={{ height: 4 }}>
                        <div
                          className={`h-full rounded-full transition-all ${over ? "bg-red-400" : "bg-primary/60"}`}
                          style={{ width: `${pctSpent}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground/60">
                        ${team.remaining}
                      </span>
                    </div>

                    {/* Roster bar */}
                    <div className="mb-2.5 flex items-center gap-1.5">
                      <Users className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                      <div className="flex-1 overflow-hidden rounded-full bg-border/50" style={{ height: 4 }}>
                        <div
                          className="h-full rounded-full bg-emerald-500/60 transition-all"
                          style={{ width: `${pctRoster}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground/60">
                        {team.score}/{ROSTER_MAX}
                      </span>
                    </div>

                    {/* Pick list */}
                    {team.sortedPicks.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-muted-foreground/40">No picks</p>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {team.sortedPicks.map((pick) => (
                          <div key={pick.id} className="flex items-center gap-1.5">
                            <span className={`w-7 shrink-0 font-mono text-[10px] font-semibold ${posColor(pick.player.pos)}`}>
                              {pick.player.pos ?? "—"}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                              {pick.player.name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] font-semibold text-muted-foreground">
                              ${pick.salary}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
