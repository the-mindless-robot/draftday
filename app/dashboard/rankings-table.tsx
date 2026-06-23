"use client"

import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Fragment, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { SortableHeader } from "@/components/ui/data-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    maxUpside: number
    maxDownside: number
    activePosition: string
  }
}

const POSITIONS = [
  "overall",
  "QB",
  "RB",
  "WR",
  "TE",
  "TD",
  "PK",
  "FLEX",
] as const
type Position = (typeof POSITIONS)[number]

const FLEX_POS = ["RB", "WR", "TE"]
const PK_POS = ["K", "PK"]

type RankedPlayer = {
  id: string
  name: string
  team: string | null
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
}

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

function ScaleBar({
  value,
  max,
  barColor,
}: {
  value: number
  max: number
  barColor: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute top-0 left-0 h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums">{value.toFixed(1)}</span>
    </div>
  )
}

const columns: ColumnDef<RankedPlayer>[] = [
  {
    accessorKey: "overallRank",
    header: ({ column }) => <SortableHeader column={column} label="Rank" />,
    cell: ({ getValue }) => {
      return (
        <span className="font-mono text-muted-foreground">
          {(getValue() as number) ?? "—"}
        </span>
      )
    },
  },
  {
    accessorKey: "pos",
    header: () => <span>Pos</span>,
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
  {
    accessorKey: "name",
    header: () => <span>Name</span>,
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.name}
        {row.original.team ? ` (${row.original.team})` : ""}
      </span>
    ),
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
    header: () => <span>Games</span>,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return <span>{v != null ? v.toFixed(1) : "—"}</span>
    },
  },
  {
    accessorKey: "upside",
    header: ({ column }) => <SortableHeader column={column} label="Upside" />,
    cell: ({ getValue, table }) => {
      const v = getValue() as number | null
      if (v == null) return <span className="text-muted-foreground">—</span>
      return (
        <ScaleBar
          value={v}
          max={table.options.meta?.maxUpside ?? 1}
          barColor="bg-green-400"
        />
      )
    },
  },
  {
    accessorKey: "downside",
    header: ({ column }) => <SortableHeader column={column} label="Downside" />,
    cell: ({ getValue, table }) => {
      const v = getValue() as number | null
      if (v == null) return <span className="text-muted-foreground">—</span>
      return (
        <ScaleBar
          value={v}
          max={table.options.meta?.maxDownside ?? 1}
          barColor="bg-red-400"
        />
      )
    },
  },
  {
    accessorKey: "byeWeek",
    header: () => <span>Bye</span>,
    cell: ({ getValue }) => <span>{(getValue() as number | null) ?? "—"}</span>,
  },
]

export function RankingsTable({ players }: { players: RankedPlayer[] }) {
  "use no memo"
  const [activePosition, setActivePosition] = useState<Position>("overall")
  const [sorting, setSorting] = useState<SortingState>([])

  const data = useMemo(() => {
    if (activePosition === "overall") return players

    const allowed =
      activePosition === "FLEX"
        ? FLEX_POS
        : activePosition === "PK"
          ? PK_POS
          : [activePosition]

    const sortKey = activePosition === "FLEX" ? "overallRank" : "positionalRank"

    return [...players]
      .filter((p) => p.pos != null && allowed.includes(p.pos))
      .sort((a, b) => (a[sortKey] ?? Infinity) - (b[sortKey] ?? Infinity))
  }, [players, activePosition])

  const maxUpside = useMemo(
    () => Math.max(...data.map((p) => p.upside ?? 0), 1),
    [data]
  )
  const maxDownside = useMemo(
    () => Math.max(...data.map((p) => p.downside ?? 0), 1),
    [data]
  )

  const table = useReactTable({
    data,
    columns,
    meta: { maxUpside, maxDownside, activePosition },
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Player Rankings</h2>
        <span className="text-xs text-muted-foreground">
          {data.length} players
        </span>
      </div>

      <div className="flex gap-1">
        {POSITIONS.map((pos) => (
          <Button
            key={pos}
            onClick={() => setActivePosition(pos)}
            variant={"outline"}
            className={cn(
              "px-2.5 py-1 text-xs font-medium transition-colors",
              activePosition === pos
                ? "bg-primary!"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {pos === "overall" ? "Overall" : pos}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
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
            const tier =
              activePosition === "overall"
                ? row.original.overallTier
                : row.original.positionalTier
            const prevTier =
              i > 0
                ? activePosition === "overall"
                  ? rows[i - 1].original.overallTier
                  : rows[i - 1].original.positionalTier
                : tier
            const showDivider = i > 0 && tier !== prevTier

            return (
              <Fragment key={row.id}>
                {showDivider && (
                  <TableRow className="border-none hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">
                          {tier ?? "Untiered"}
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
    </div>
  )
}
