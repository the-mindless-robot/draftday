"use client"

import { useState, useEffect } from "react"
import { Star, User, Users } from "lucide-react"
import { fbgPlayerUrl } from "@/lib/fbg-url"
import { RankingsTable } from "./rankings-table"
import { PlayerDetail } from "./player-detail"
import { MyList } from "./my-list"
import { MyTeam } from "./my-team"

type RankingSnapshot = {
  overallRank: number | null
  positionalRank: number | null
  importedAt: string
}

type RankingHistory = {
  fbg: RankingSnapshot[]
  espn: RankingSnapshot[]
}

type RankedPlayer = {
  id: string
  fbgId: string
  name: string
  team: string | null
  age: number | null
  experience: number | null
  byeWeek: number | null
  overallTier: string | null
  positionalTier: string | null
  overallRank: number | null
  espnOverallRank: number | null
  positionalRank: number | null
  espnPositionalRank: number | null
  pos: string | null
  projPoints: number | null
  projGames: number | null
  upside: number | null
  downside: number | null
  scFbg250: string | null
  scFbg200: string | null
  scFbgScaled: string | null
  scEspn200: string | null
  fbgRankDelta: number | null
  espnRankDelta: number | null
  flagged: boolean
}

const FLEX_POS = ["WR", "RB", "TE"]

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

function SimilarPlayers({
  label,
  players,
}: {
  label: string
  players: RankedPlayer[]
}) {
  if (players.length === 0) return null

  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {players.map((p) => {
          const avg = fbgAvg(p)
          return (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span className={`w-10 shrink-0 font-mono font-semibold ${posColor(p.pos)}`}>
                {p.pos}{p.positionalRank ?? ""}
              </span>
              <a
                href={fbgPlayerUrl(p.name, p.fbgId)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {p.name}
                {p.team ? <span className="text-muted-foreground"> {p.team}</span> : null}
              </a>
              <span className="shrink-0 font-mono text-muted-foreground">
                #{p.overallRank ?? "—"}
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-muted-foreground">
                {avg != null ? `$${avg.toFixed(0)}` : "—"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getSimilar(
  selected: RankedPlayer,
  allPlayers: RankedPlayer[],
  positions: string[],
  excludeIds: Set<string>,
  count = 3,
): RankedPlayer[] {
  const rank = selected.overallRank ?? 999
  return allPlayers
    .filter(
      (p) =>
        p.id !== selected.id &&
        !excludeIds.has(p.id) &&
        p.pos != null &&
        positions.includes(p.pos),
    )
    .sort(
      (a, b) =>
        Math.abs((a.overallRank ?? 999) - rank) -
        Math.abs((b.overallRank ?? 999) - rank),
    )
    .slice(0, count)
}

export function DashboardClient({ players: initialPlayers }: { players: RankedPlayer[] }) {
  const [players, setPlayers] = useState(initialPlayers)
  const [selectedPlayer, setSelectedPlayer] = useState<RankedPlayer | null>(null)
  const [rankingHistory, setRankingHistory] = useState<RankingHistory | null>(null)
  const [rightPanel, setRightPanel] = useState<"details" | "my-list" | "my-team">("details")

  useEffect(() => {
    if (!selectedPlayer) {
      setRankingHistory(null)
      return
    }
    fetch(`/api/players/${selectedPlayer.id}/rankings/history`)
      .then((r) => r.json())
      .then(setRankingHistory)
      .catch(() => setRankingHistory(null))
  }, [selectedPlayer?.id])

  async function handleFlag(player: RankedPlayer) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, flagged: !p.flagged } : p))
    )
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer((prev) => prev ? { ...prev, flagged: !prev.flagged } : null)
    }
    try {
      await fetch(`/api/players/${player.id}/flag`, { method: "PATCH" })
    } catch {
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, flagged: !p.flagged } : p))
      )
    }
  }

  const globalMax = Math.max(
    ...players.map((p) => Math.max(p.upside ?? 0, p.downside ?? 0)),
    1
  )

  const positionalComps = selectedPlayer
    ? getSimilar(selectedPlayer, players, [selectedPlayer.pos ?? ""], new Set())
    : []

  const flexComps = selectedPlayer
    ? getSimilar(
        selectedPlayer,
        players,
        FLEX_POS.filter((pos) => pos !== selectedPlayer.pos),
        new Set(positionalComps.map((p) => p.id)),
      )
    : []

  const flaggedCount = players.filter((p) => p.flagged).length

  return (
    <div className="flex flex-1 gap-4 p-4 h-full overflow-hidden">
      <div className="flex flex-1 flex-col rounded-xl bg-muted/50 p-4 overflow-hidden">
        <RankingsTable
          players={players}
          selectedPlayerId={selectedPlayer?.id}
          onPlayerSelect={(p) => {
            setSelectedPlayer(p)
            setRightPanel("details")
          }}
          onFlag={handleFlag}
        />
      </div>
      <div className="flex flex-col gap-3 w-96 shrink-0 overflow-y-auto">
        <div className="flex-1 rounded-xl bg-muted/50 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex rounded-md bg-muted p-0.5 text-xs gap-0.5">
              <button
                onClick={() => setRightPanel("details")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                  rightPanel === "details"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-3 w-3" />
                Details
              </button>
              <button
                onClick={() => setRightPanel("my-list")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                  rightPanel === "my-list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className="h-3 w-3" />
                My List
                {flaggedCount > 0 && (
                  <span className="rounded-full bg-yellow-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400 leading-none">
                    {flaggedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightPanel("my-team")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                  rightPanel === "my-team"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3 w-3" />
                My Team
              </button>
            </div>
          </div>
          <div className={rightPanel !== "details" ? "hidden" : ""}>
            <PlayerDetail player={selectedPlayer} globalMax={globalMax} rankingHistory={rankingHistory} />
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
            />
          </div>
          <div className={rightPanel !== "my-team" ? "hidden" : ""}>
            <MyTeam players={players} />
          </div>
        </div>
        {rightPanel === "details" && selectedPlayer && (
          <>
            <SimilarPlayers
              label={selectedPlayer ? `Similar ${selectedPlayer.pos ?? ""}s` : "Positional comps"}
              players={positionalComps}
            />
            <SimilarPlayers
              label="Flex comps"
              players={flexComps}
            />
          </>
        )}
      </div>
    </div>
  )
}
