"use client"

import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Search, Star, Target, Gavel } from "lucide-react"
import { Fragment, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { fbgPlayerUrl } from "@/lib/fbg-url"

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    maxUpside: number
    maxDownside: number
    activePosition: string
    onFlag?: (player: RankedPlayer) => void
    onTarget?: (player: RankedPlayer) => void
    onDraft?: (player: RankedPlayer) => void
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

const DELTA_THRESHOLD = 10

const FLEX_POS = ["RB", "WR", "TE"]
const PK_POS = ["K", "PK"]

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
  targeted: boolean
  draftPick: {
    id: string
    salary: number
    teamId: string
    createdAt: string | Date
    team: { id: string; name: string; isMyTeam: boolean }
  } | null
}

function parseSalary(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

function avgSalary(a: string | null, b: string | null): number | null {
  const va = parseSalary(a)
  const vb = parseSalary(b)
  if (va == null && vb == null) return null
  if (va == null) return vb
  if (vb == null) return va
  return (va + vb) / 2
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

function RankDeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) return null
  const improved = delta > 0
  return (
    <span
      className={`text-[10px] font-semibold tabular-nums ${improved ? "text-green-400" : "text-red-400"}`}
    >
      {improved ? `↑${delta}` : `↓${Math.abs(delta)}`}
    </span>
  )
}

const columns: ColumnDef<RankedPlayer>[] = [
  {
    id: "flag",
    header: () => null,
    cell: ({ row, table }) => {
      const player = row.original
      if (player.draftPick) {
        const initials = player.draftPick.team.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 3)
          .toUpperCase()
        return (
          <span
            className={`inline-flex h-5 items-center rounded px-1 text-[9px] font-bold tracking-wide ${
              player.draftPick.team.isMyTeam
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {initials}
          </span>
        )
      }
      return (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              table.options.meta?.onFlag?.(player)
            }}
            className="flex items-center justify-center p-0.5 transition-opacity hover:opacity-80"
          >
            <Star
              className={`h-3.5 w-3.5 ${player.flagged ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              table.options.meta?.onTarget?.(player)
            }}
            className="flex items-center justify-center p-0.5 transition-opacity hover:opacity-80"
          >
            <Target
              className={`h-3.5 w-3.5 ${player.targeted ? "fill-red-400 text-red-400" : "text-muted-foreground/40"}`}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              table.options.meta?.onDraft?.(player)
            }}
            className="flex items-center justify-center p-0.5 text-muted-foreground/40 transition-opacity hover:text-primary hover:opacity-80"
          >
            <Gavel className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    },
  },
  {
    accessorKey: "overallRank",
    header: ({ column }) => <SortableHeader column={column} label="vRank" />,
    cell: ({ row }) => {
      const rank = row.original.overallRank
      const delta = row.original.fbgRankDelta
      return (
        <span className="flex items-center gap-1">
          <span className="font-mono text-muted-foreground">{rank ?? "—"}</span>
          <RankDeltaBadge delta={delta} />
        </span>
      )
    },
  },
  {
    accessorKey: "espnOverallRank",
    header: ({ column }) => <SortableHeader column={column} label="Rank" />,
    sortingFn: (a, b) => {
      const av = a.original.espnOverallRank
      const bv = b.original.espnOverallRank
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return av - bv
    },
    cell: ({ row }) => {
      const rank = row.original.espnOverallRank
      const delta = row.original.espnRankDelta
      return (
        <span className="flex items-center gap-1">
          <span className="font-mono text-muted-foreground">{rank ?? "—"}</span>
          <RankDeltaBadge delta={delta} />
        </span>
      )
    },
  },
  {
    id: "rankDelta",
    header: ({ column }) => <SortableHeader column={column} label="Δ" />,
    accessorFn: (row) => {
      if (row.espnOverallRank == null || row.overallRank == null) return null
      return row.espnOverallRank - row.overallRank
    },
    cell: ({ getValue }) => {
      const delta = getValue() as number | null
      if (delta == null) return <span className="text-muted-foreground">—</span>
      const color =
        delta >= DELTA_THRESHOLD
          ? "text-green-400"
          : delta >= 2
            ? "text-amber-400"
            : delta <= -DELTA_THRESHOLD
              ? "text-red-400"
              : "text-muted-foreground"
      return (
        <span className={`font-mono ${color}`}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )
    },
  },
  {
    id: "salaryDelta",
    header: ({ column }) => <SortableHeader column={column} label="Δ$" />,
    accessorFn: (row) => {
      const fbg250 = parseSalary(row.scFbg250)
      const fbg200 = parseSalary(row.scFbg200)
      const espn200 = parseSalary(row.scEspn200)
      if (espn200 == null) return null
      const fbgAvg =
        fbg250 != null && fbg200 != null
          ? (fbg250 + fbg200) / 2
          : (fbg250 ?? fbg200)
      const espnAvg = espn200 * 1.125
      if (fbgAvg == null) return null
      return fbgAvg - espnAvg
    },
    cell: ({ getValue }) => {
      const delta = getValue() as number | null
      if (delta == null) return <span className="text-muted-foreground">—</span>
      const color =
        Math.abs(delta) <= 2
          ? "text-yellow-400"
          : delta > 0
            ? "text-green-400"
            : "text-red-400"
      return (
        <span className={`font-mono ${color}`}>
          {delta > 0
            ? `+$${delta.toFixed(0)}`
            : delta < 0
              ? `-$${Math.abs(delta).toFixed(0)}`
              : `$0`}
        </span>
      )
    },
  },
  {
    accessorKey: "name",
    header: () => <span>Player</span>,
    cell: ({ row }) => (
      <span className="font-medium">
        <a
          href={fbgPlayerUrl(row.original.name, row.original.fbgId)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
        >
          {row.original.name}
        </a>
        {row.original.team ? ` (${row.original.team})` : ""}
      </span>
    ),
  },
  {
    id: "pos",
    accessorFn: (row) => row.positionalRank,
    header: () => <span>Pos</span>,
    cell: ({ row }) => {
      const pos = row.original.pos
      const fbg =
        pos && row.original.positionalRank != null
          ? `${pos}${row.original.positionalRank}`
          : "—"
      const espn =
        pos && row.original.espnPositionalRank != null
          ? `${pos}${row.original.espnPositionalRank}`
          : "—"
      return (
        <span className={`font-mono font-semibold ${posColor(pos)}`}>
          {fbg} / {espn}
        </span>
      )
    },
  },

  {
    id: "salary",
    header: ({ column }) => <SortableHeader column={column} label="Value" />,
    accessorFn: (row) => avgSalary(row.scFbg250, row.scFbg200),
    cell: ({ getValue, row }) => {
      const v = getValue() as number | null
      const actual = row.original.draftPick?.salary ?? null
      if (actual != null) {
        return (
          <span className="flex items-baseline gap-1">
            <span>{v != null ? `$${v.toFixed(0)}` : "—"}</span>
            <span className="text-[10px] text-muted-foreground">/</span>
            <span className="font-semibold text-primary">${actual}</span>
          </span>
        )
      }
      return <span>{v != null ? `$${v.toFixed(0)}` : "—"}</span>
    },
  },
  {
    id: "salary_range",
    header: ({ column }) => <SortableHeader column={column} label="Range" />,
    cell: ({ row }) => {
      const hi = row.original.scFbg250 ?? null
      const low = row.original.scFbg200 ?? null
      const range = hi != null && low != null ? `${hi} - ${low}` : "—"
      return <span>{range}</span>
    },
  },
  {
    id: "estimate",
    header: ({ column }) => <SortableHeader column={column} label="$" />,
    accessorFn: (row) => {
      const base = parseSalary(row.scEspn200)
      return base != null ? Math.round(base * 1.25) : null
    },
    cell: ({ getValue, row }) => {
      const v = getValue() as number | null
      const actual = row.original.draftPick?.salary ?? null
      if (actual != null) {
        return (
          <span className="flex items-baseline gap-1">
            <span>{v != null ? `$${v}` : "—"}</span>
            <span className="text-[10px] text-muted-foreground">/</span>
            <span className="font-semibold text-primary">${actual}</span>
          </span>
        )
      }
      return <span>{v != null ? `$${v}` : "—"}</span>
    },
  },
  {
    id: "espn",
    header: ({ column }) => <SortableHeader column={column} label="$Range" />,
    accessorFn: (row) => parseSalary(row.scEspn200),
    cell: ({ row }) => {
      const base = parseSalary(row.original.scEspn200)
      if (base == null) return <span>—</span>
      const high = Math.round(base * 1.25)
      return <span>{`$${high} - $${base}`}</span>
    },
  },
  {
    accessorKey: "projPoints",
    header: ({ column }) => <SortableHeader column={column} label="Proj Pts" />,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return <span>{v != null ? v.toFixed(1) : "—"}</span>
    },
  },
  // {
  //   accessorKey: "projGames",
  //   header: () => <span>Games</span>,
  //   cell: ({ getValue }) => {
  //     const v = getValue() as number | null
  //     return <span>{v != null ? v.toFixed(1) : "—"}</span>
  //   },
  // },
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
  // {
  //   accessorKey: "byeWeek",
  //   header: () => <span>Bye</span>,
  //   cell: ({ getValue }) => <span>{(getValue() as number | null) ?? "—"}</span>,
  // },
]

export function RankingsTable({
  players,
  selectedPlayerId,
  onPlayerSelect,
  onFlag,
  onTarget,
  onDraft,
}: {
  players: RankedPlayer[]
  selectedPlayerId?: string
  onPlayerSelect?: (player: RankedPlayer) => void
  onFlag?: (player: RankedPlayer) => void
  onTarget?: (player: RankedPlayer) => void
  onDraft?: (player: RankedPlayer) => void
}) {
  "use no memo"
  const [activePosition, setActivePosition] = useState<Position>("overall")
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

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
    meta: { maxUpside, maxDownside, activePosition, onFlag, onTarget, onDraft },
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value) =>
      row.original.name.toLowerCase().includes(String(value).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Player Rankings</h2>
        <span className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} players
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {POSITIONS.map((pos) => (
            <Button
              key={pos}
              onClick={() => setActivePosition(pos)}
              variant="outline"
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
        <div className="relative ml-auto w-48">
          <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter by name…"
            className="h-7 pl-7 text-xs"
          />
        </div>
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
                    data-state={
                      row.original.id === selectedPlayerId
                        ? "selected"
                        : undefined
                    }
                    className={cn(
                      "cursor-pointer",
                      row.original.draftPick && "opacity-40"
                    )}
                    onClick={() => onPlayerSelect?.(row.original)}
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
