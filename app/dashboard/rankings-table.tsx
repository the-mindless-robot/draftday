"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { useEffect, useState } from "react"

import { DataTable, SortableHeader } from "@/components/ui/data-table"

type RankedPlayer = {
  id: string
  name: string
  team: string | null
  byeWeek: number | null
  overallTier: string | null
  overallRank: number | null
  pos: string | null
  projPoints: number | null
  projGames: number | null
  upside: number | null
  downside: number | null
}

function posColor(pos: string | null): string {
  const p = pos?.replace(/\d+$/, "").toUpperCase()
  switch (p) {
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

const columns: ColumnDef<RankedPlayer>[] = [
  {
    accessorKey: "overallRank",
    header: ({ column }) => <SortableHeader column={column} label="Rank" />,
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {getValue() as number}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="Player" />,
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "pos",
    header: ({ column }) => <SortableHeader column={column} label="Pos" />,
    cell: ({ getValue }) => {
      const pos = getValue() as string | null
      return (
        <span className={`font-mono font-semibold ${posColor(pos)}`}>
          {pos ?? "—"}
        </span>
      )
    },
  },
  {
    accessorKey: "team",
    header: ({ column }) => <SortableHeader column={column} label="Team" />,
    cell: ({ getValue }) => <span>{(getValue() as string | null) ?? "—"}</span>,
  },
  {
    accessorKey: "byeWeek",
    header: ({ column }) => <SortableHeader column={column} label="Bye" />,
    cell: ({ getValue }) => <span>{(getValue() as number | null) ?? "—"}</span>,
  },
  {
    accessorKey: "overallTier",
    header: ({ column }) => <SortableHeader column={column} label="Tier" />,
    cell: ({ getValue }) => <span>{(getValue() as string | null) ?? "—"}</span>,
  },
  {
    accessorKey: "projPoints",
    header: ({ column }) => <SortableHeader column={column} label="Proj Pts" />,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return <span>{v != null ? v.toFixed(1) : "—"}</span>
    },
  },
  {
    accessorKey: "projGames",
    header: ({ column }) => <SortableHeader column={column} label="Games" />,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return <span>{v != null ? v.toFixed(1) : "—"}</span>
    },
  },
  {
    accessorKey: "upside",
    header: ({ column }) => <SortableHeader column={column} label="Upside" />,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return (
        <span className="text-green-400">{v != null ? v.toFixed(1) : "—"}</span>
      )
    },
  },
  {
    accessorKey: "downside",
    header: ({ column }) => <SortableHeader column={column} label="Downside" />,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return (
        <span className="text-red-400">{v != null ? v.toFixed(1) : "—"}</span>
      )
    },
  },
]

export function RankingsTable() {
  const [data, setData] = useState<RankedPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // useEffect(() => {
  //   fetch("/api/players/rankings")
  //     .then((r) => {
  //       if (!r.ok) throw new Error(`HTTP ${r.status}`)
  //       const players = r.json()
  //       console.log(`Found players`, players)
  //       return players
  //     })
  //     .then(setData)
  //     .catch((e) => setError(e.message))
  //     .finally(() => setLoading(false))
  // }, [])

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const res = await fetch("/api/players/rankings")
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const players = await res.json()
        console.log("PLAYERS", players)
        setData(players)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading rankings…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load rankings: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Player Rankings</h2>
        <span className="text-xs text-muted-foreground">
          {data.length} players
        </span>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  )
}
