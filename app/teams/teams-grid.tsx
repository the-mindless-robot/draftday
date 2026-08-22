"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, Users } from "lucide-react"

export type TeamWithStats = {
  id: string
  name: string
  isMyTeam: boolean
  budget: number
  spent: number
  remaining: number
  maxBid: number
  score: number
  sortedPicks: {
    id: string
    salary: number
    player: { name: string; pos: string | null }
  }[]
  totalPicks: number
}

const ROSTER_MAX = 33

function posColor(pos: string | null): string {
  switch (pos?.toUpperCase()) {
    case "QB":
      return "text-blue-400"
    case "RB":
      return "text-green-400"
    case "WR":
      return "text-yellow-400"
    case "TE":
      return "text-orange-400"
    case "K":
    case "PK":
      return "text-purple-400"
    default:
      return "text-muted-foreground"
  }
}

export function TeamsGrid({ teams }: { teams: TeamWithStats[] }) {
  const router = useRouter()

  useEffect(() => {
    const es = new EventSource("/api/draft/events")
    es.addEventListener("pick", () => router.refresh())
    return () => es.close()
  }, [router])

  return (
    <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-3 2xl:grid-cols-5">
      {teams.map((team) => {
        const pctRemaining = (team.remaining / team.budget) * 100
        const pctRoster = Math.min((team.score / ROSTER_MAX) * 100, 100)
        const budgetColor =
          team.remaining >= 150
            ? "bg-emerald-500/70"
            : team.remaining >= 75
              ? "bg-yellow-400/70"
              : "bg-red-400/70"

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
                    <span className="ml-1.5 rounded bg-primary/15 px-1 py-0.5 font-mono text-[9px] leading-none font-bold text-primary">
                      ME
                    </span>
                  )}
                </p>
                <p className="font-mono text-[11px] font-semibold text-muted-foreground">
                  ${team.spent} / ${team.budget}
                </p>
              </div>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
                MAX ${team.maxBid}
              </span>
            </div>

            {/* Budget bar */}
            <div className="mb-1.5 flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <div
                className="flex-1 overflow-hidden rounded-full bg-border/50"
                style={{ height: 4 }}
              >
                <div
                  className={`h-full rounded-full transition-all ${budgetColor}`}
                  style={{ width: `${pctRemaining}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground/60">
                ${team.remaining}
              </span>
            </div>

            {/* Roster bar */}
            <div className="mb-2.5 flex items-center gap-1.5">
              <Users className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <div
                className="flex-1 overflow-hidden rounded-full bg-border/50"
                style={{ height: 4 }}
              >
                <div
                  className="h-full rounded-full bg-emerald-500/60 transition-all"
                  style={{ width: `${pctRoster}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground/60">
                {team.totalPicks}/17
              </span>
            </div>

            {/* Pick list */}
            {team.sortedPicks.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-muted-foreground/40">
                No picks
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {team.sortedPicks.map((pick) => (
                  <div key={pick.id} className="flex items-center gap-1.5">
                    <span
                      className={`w-7 shrink-0 font-mono text-[10px] font-semibold ${posColor(pick.player.pos)}`}
                    >
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
  )
}
