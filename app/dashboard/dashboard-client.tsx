"use client"

import { useState } from "react"
import { RankingsTable } from "./rankings-table"
import { PlayerDetail } from "./player-detail"

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

export function DashboardClient({ players }: { players: RankedPlayer[] }) {
  const [selectedPlayer, setSelectedPlayer] = useState<RankedPlayer | null>(null)

  const globalMax = Math.max(
    ...players.map((p) => Math.max(p.upside ?? 0, p.downside ?? 0)),
    1
  )

  return (
    <div className="flex flex-1 gap-4 p-4 h-full overflow-hidden">
      <div className="flex flex-1 flex-col rounded-xl bg-muted/50 p-4 overflow-hidden">
        <RankingsTable
          players={players}
          selectedPlayerId={selectedPlayer?.id}
          onPlayerSelect={setSelectedPlayer}
        />
      </div>
      <div className="flex flex-col gap-3 w-96 shrink-0">
        <div className="flex-1 rounded-xl bg-muted/50 p-4 overflow-hidden">
          <PlayerDetail player={selectedPlayer} globalMax={globalMax} />
        </div>
        <div className="h-28 rounded-xl bg-muted/50" />
        <div className="h-28 rounded-xl bg-muted/50" />
      </div>
    </div>
  )
}
