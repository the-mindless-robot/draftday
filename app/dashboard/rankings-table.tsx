"use client"

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Fragment, useEffect, useState } from "react"

import { SortableHeader } from "@/components/ui/data-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type RankedPlayer = {
  id: string
  name: string
  team: string | null
  byeWeek: number | null
  overallTier: string | null
  overallRank: number | null
  pos: string | null
  positionalRank: number | null
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
    header: ({ column }) => <span>Name</span>,
    cell: (props) => (
      <span className="font-medium">
        {props.row.original.name}{" "}
        {props.row.original.team ? `(${props.row.original.team})` : ""}
      </span>
    ),
  },
  {
    accessorKey: "pos",
    header: ({ column }) => <span>Pos</span>,
    cell: ({ row }) => {
      const pos = row.original.pos
      const rank = row.original.positionalRank
      const label = pos ? `${pos}${rank ?? ""}` : "—"
      return (
        <span className={`font-mono font-semibold ${posColor(pos)}`}>
          {label}
        </span>
      )
    },
  },
  // {
  //   accessorKey: "team",
  //   header: ({ column }) => <span>Team</span>,
  //   cell: ({ getValue }) => <span>{(getValue() as string | null) ?? "—"}</span>,
  // },
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
    header: ({ column }) => <span>Games</span>,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return <span>{v != null ? v.toFixed(1) : "—"}</span>
    },
  },
  {
    accessorKey: "upside",
    header: ({ column }) => <span>Upside</span>,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return (
        <span className="text-green-400">{v != null ? v.toFixed(1) : "—"}</span>
      )
    },
  },
  {
    accessorKey: "downside",
    header: ({ column }) => <span>Downside</span>,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return (
        <span className="text-red-400">{v != null ? v.toFixed(1) : "—"}</span>
      )
    },
  },
  {
    accessorKey: "byeWeek",
    header: ({ column }) => <span>Bye</span>,
    cell: ({ getValue }) => <span>{(getValue() as number | null) ?? "—"}</span>,
  },
]

export function RankingsTable() {
  "use no memo"
  const [data, setData] = useState<RankedPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const res = await fetch("/api/players/rankings")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setData(await res.json())
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchRankings()
  }, [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Player Rankings</h2>
        <span className="text-xs text-muted-foreground">
          {data.length} players
        </span>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const tier = row.original.overallTier
            const prevTier = i > 0 ? rows[i - 1].original.overallTier : tier
            const showDivider = i > 0 && tier !== prevTier

            return (
              <Fragment key={row.id}>
                {showDivider && (
                  <TableRow className="border-none hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">
                          {tier ? `Tier ${tier}` : "Untiered"}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                <TableRow
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
