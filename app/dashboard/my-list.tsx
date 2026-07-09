"use client"

import { Star, Target } from "lucide-react"
import { fbgPlayerUrl } from "@/lib/fbg-url"

type RankedPlayer = {
  id: string
  fbgId: string
  name: string
  team: string | null
  pos: string | null
  positionalRank: number | null
  overallRank: number | null
  scFbg250: string | null
  scFbg200: string | null
  scEspn200: string | null
  flagged: boolean
  targeted: boolean
  draftPick: { id: string; salary: number; team: { isMyTeam: boolean } } | null
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

function normPos(pos: string | null): string {
  return pos?.toUpperCase() === "K" ? "PK" : (pos?.toUpperCase() ?? "—")
}

function PlayerRow({
  player,
  onPlayerSelect,
  onFlag,
  onTarget,
}: {
  player: RankedPlayer
  onPlayerSelect?: (p: RankedPlayer) => void
  onFlag?: (id: string) => void
  onTarget?: (id: string) => void
}) {
  const isDrafted = player.draftPick !== null
  const isMyPick = player.draftPick?.team.isMyTeam ?? false

  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/50 ${isMyPick ? "bg-primary/8 opacity-70" : isDrafted ? "opacity-30" : ""}`}
      onClick={() => onPlayerSelect?.(player)}
    >
      <span className={`w-8 shrink-0 font-mono font-semibold ${posColor(player.pos)}`}>
        {player.pos}{player.positionalRank ?? ""}
      </span>
      <a
        href={fbgPlayerUrl(player.name, player.fbgId)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="min-w-0 flex-1 truncate font-medium hover:underline"
      >
        {player.name}
        {player.team ? <span className="text-muted-foreground"> {player.team}</span> : null}
      </a>
      {isMyPick && (
        <span className="shrink-0 rounded bg-primary/15 px-1 py-0.5 font-mono text-[9px] font-bold text-primary leading-none">
          DRAFTED
        </span>
      )}
      <span className="shrink-0 font-mono text-muted-foreground">
        #{player.overallRank ?? "—"}
      </span>
      <span className="w-8 shrink-0 text-right font-mono text-muted-foreground">
        {(() => { const v = fbgAvg(player); return v != null ? `$${v.toFixed(0)}` : "—" })()}
      </span>
      <span className="w-8 shrink-0 text-right font-mono text-muted-foreground/60">
        {(() => { const b = parseSalary(player.scEspn200); return b != null ? `$${Math.round(b * 1.25)}` : "—" })()}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onTarget?.(player.id) }}
        className="shrink-0 p-0.5 transition-opacity hover:opacity-80"
      >
        <Target
          className={`h-3.5 w-3.5 ${player.targeted ? "fill-red-400 text-red-400" : "text-muted-foreground/40"}`}
        />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onFlag?.(player.id) }}
        className="shrink-0 p-0.5 transition-opacity hover:opacity-60"
      >
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      </button>
    </div>
  )
}

export function MyList({
  players,
  onPlayerSelect,
  onFlag,
  onTarget,
}: {
  players: RankedPlayer[]
  onPlayerSelect?: (player: RankedPlayer) => void
  onFlag?: (id: string) => void
  onTarget?: (id: string) => void
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

  const allPos = [
    ...POS_ORDER,
    ...Array.from(new Set(flagged.map((p) => normPos(p.pos)))).filter(
      (p) => !POS_ORDER.includes(p)
    ),
  ]

  const groups = allPos
    .map((pos) => {
      const inPos = flagged
        .filter((p) => normPos(p.pos) === pos)
        .sort((a, b) => (a.overallRank ?? 999) - (b.overallRank ?? 999))
      return { pos, targets: inPos.filter((p) => p.targeted), watching: inPos.filter((p) => !p.targeted) }
    })
    .filter((g) => g.targets.length > 0 || g.watching.length > 0)

  const targetCount = flagged.filter((p) => p.targeted).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {flagged.length} player{flagged.length !== 1 ? "s" : ""} — {targetCount} targeted
      </p>
      {groups.map(({ pos, targets, watching }) => (
        <div key={pos}>
          <p className={`mb-2 text-[10px] font-semibold tracking-wider uppercase ${posColor(pos)}`}>
            {pos}
          </p>
          <div className="flex flex-col gap-0.5">
            {targets.length > 0 && (
              <>
                {watching.length > 0 && (
                  <p className="mb-0.5 flex items-center gap-1 px-2 text-[9px] font-semibold tracking-wider text-red-400/70 uppercase">
                    <Target className="h-2.5 w-2.5" /> Targets
                  </p>
                )}
                {targets.map((p) => (
                  <PlayerRow key={p.id} player={p} onPlayerSelect={onPlayerSelect} onFlag={onFlag} onTarget={onTarget} />
                ))}
              </>
            )}
            {watching.length > 0 && (
              <>
                {targets.length > 0 && (
                  <p className="mb-0.5 mt-1 flex items-center gap-1 px-2 text-[9px] font-semibold tracking-wider text-muted-foreground/40 uppercase">
                    <Star className="h-2.5 w-2.5" /> Watching
                  </p>
                )}
                {watching.map((p) => (
                  <PlayerRow key={p.id} player={p} onPlayerSelect={onPlayerSelect} onFlag={onFlag} onTarget={onTarget} />
                ))}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
