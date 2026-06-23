import { cn } from "@/lib/utils"

type RankedPlayer = {
  id: string
  name: string
  team: string | null
  age: number | null
  experience: number | null
  byeWeek: number | null
  overallTier: string | null
  positionalTier: string | null
  overallRank: number | null
  positionalRank: number | null
  pos: string | null
  projPoints: number | null
  projGames: number | null
  upside: number | null
  downside: number | null
  scFbg250: string | null
  scFbg200: string | null
  scFbgScaled: string | null
  scEspn200: string | null
}

function posColor(pos: string | null): string {
  switch (pos?.toUpperCase()) {
    case "QB":
      return "bg-blue-400/20 text-blue-400 border-blue-400/30"
    case "RB":
      return "bg-green-400/20 text-green-400 border-green-400/30"
    case "WR":
      return "bg-yellow-400/20 text-yellow-400 border-yellow-400/30"
    case "TE":
      return "bg-orange-400/20 text-orange-400 border-orange-400/30"
    case "K":
    case "PK":
      return "bg-purple-400/20 text-purple-400 border-purple-400/30"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] leading-tight tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-xs leading-snug font-medium">{value ?? "—"}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
      {children}
    </p>
  )
}

function BiBar({
  upside,
  downside,
  max,
}: {
  upside: number | null
  downside: number | null
  max: number
}) {
  const upPct = upside != null ? Math.min((upside / max) * 50, 50) : 0
  const downPct = downside != null ? Math.min((downside / max) * 50, 50) : 0

  return (
    <div className="space-y-1">
      <div className="flex text-[10px] text-muted-foreground">
        <span className="flex-1">Upside</span>
        <span className="flex-1 text-right">Downside</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-6 text-right text-xs tabular-nums text-green-400">
          {upside?.toFixed(1) ?? "—"}
        </span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute top-0 h-full bg-green-400"
            style={{ right: "50%", width: `${upPct}%` }}
          />
          <div
            className="absolute top-0 h-full bg-red-400"
            style={{ left: "50%", width: `${downPct}%` }}
          />
        </div>
        <span className="w-6 text-xs tabular-nums text-red-400">
          {downside?.toFixed(1) ?? "—"}
        </span>
      </div>
    </div>
  )
}

export function PlayerDetail({ player, globalMax }: { player: RankedPlayer | null; globalMax: number }) {
  if (!player) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a player to view details
      </div>
    )
  }

  const teamBye = [
    player.team,
    player.byeWeek != null ? `Bye ${player.byeWeek}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="shrink-0">
          <p className={cn("rounded border px-2 py-1 text-xl leading-none font-bold tabular-nums", posColor(player.pos))}>
            {player.positionalRank != null ? (
              <>
                <span>{player.pos ?? ""}</span>
                <span className="text-foreground">{player.positionalRank}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm leading-tight font-semibold">
            {player.name}
          </h3>
          <p className="text-xs leading-tight text-muted-foreground">
            {teamBye || "—"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center rounded-sm border border-muted-foreground p-1">
          <p className="text-xl leading-none font-bold tabular-nums">
            {player.overallRank ?? "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">overall</p>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Rankings */}
      <div>
        <SectionLabel>Rankings</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <KV label="Overall Rank" value={player.overallRank} />
          <KV label="Overall Tier" value={player.overallTier} />
          <KV
            label="Pos Rank"
            value={
              player.positionalRank != null
                ? `${player.pos ?? ""}${player.positionalRank}`
                : null
            }
          />
          <KV label="Pos Tier" value={player.positionalTier} />
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Projections */}
      <div>
        <SectionLabel>Projections</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <KV label="Proj Points" value={player.projPoints?.toFixed(1)} />
          <KV label="Proj Games" value={player.projGames?.toFixed(1)} />
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Risk */}
      <div>
        <SectionLabel>Risk Profile</SectionLabel>
        <BiBar upside={player.upside} downside={player.downside} max={globalMax} />
      </div>

      <div className="h-px bg-border/50" />

      {/* Salary */}
      <div>
        <SectionLabel>Salary Cap</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <KV label="FBG $250k" value={player.scFbg250} />
          <KV label="FBG $200k" value={player.scFbg200} />
          <KV label="FBG Scaled" value={player.scFbgScaled} />
          <KV label="ESPN $200k" value={player.scEspn200} />
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Bio */}
      <div>
        <SectionLabel>Bio</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <KV label="Age" value={player.age} />
          <KV
            label="Experience"
            value={
              player.experience != null
                ? `${player.experience} yr${player.experience !== 1 ? "s" : ""}`
                : null
            }
          />
        </div>
      </div>
    </div>
  )
}
