"use client"

import { Star } from "lucide-react"
import { fbgPlayerUrl } from "@/lib/fbg-url"

type RankedPlayer = {
  id: string
  fbgId: string
  name: string
  team: string | null
  pos: string | null
  positionalRank: number | null
  overallRank: number | null
  flagged: boolean
}

const POS_ORDER = ["QB", "RB", "WR", "TE", "K", "PK"]

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

export function MyList({
  players,
  onPlayerSelect,
  onFlag,
}: {
  players: RankedPlayer[]
  onPlayerSelect?: (player: RankedPlayer) => void
  onFlag?: (id: string) => void
}) {
  const flagged = players.filter((p) => p.flagged)

  if (flagged.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Star className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No players flagged yet.</p>
        <p className="text-xs text-muted-foreground/60">Click the star on any player to add them.</p>
      </div>
    )
  }

  const grouped = POS_ORDER.reduce<Record<string, RankedPlayer[]>>((acc, pos) => {
    const group = flagged.filter((p) => p.pos?.toUpperCase() === pos || (pos === "K" && p.pos?.toUpperCase() === "PK"))
    if (group.length > 0) acc[pos] = group
    return acc
  }, {})

  const otherPos = flagged.filter(
    (p) => !POS_ORDER.some((pos) => p.pos?.toUpperCase() === pos || (pos === "K" && p.pos?.toUpperCase() === "PK"))
  )
  if (otherPos.length > 0) grouped["—"] = otherPos

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{flagged.length} player{flagged.length !== 1 ? "s" : ""} flagged</p>
      {Object.entries(grouped).map(([pos, group]) => (
        <div key={pos}>
          <p className={`mb-1.5 text-[10px] font-semibold tracking-wider uppercase ${posColor(pos)}`}>
            {pos}
          </p>
          <div className="flex flex-col gap-1">
            {group
              .sort((a, b) => (a.overallRank ?? 999) - (b.overallRank ?? 999))
              .map((p) => (
                <div
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/50"
                  onClick={() => onPlayerSelect?.(p)}
                >
                  <span className={`w-8 shrink-0 font-mono font-semibold ${posColor(p.pos)}`}>
                    {p.pos}{p.positionalRank ?? ""}
                  </span>
                  <a
                    href={fbgPlayerUrl(p.name, p.fbgId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {p.name}
                    {p.team ? <span className="text-muted-foreground"> {p.team}</span> : null}
                  </a>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    #{p.overallRank ?? "—"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onFlag?.(p.id)
                    }}
                    className="shrink-0 p-0.5 transition-opacity hover:opacity-60"
                  >
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
