import { cn } from "@/lib/utils"

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

function parseSalary(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

function DeltaKV({
  label,
  delta,
  prefix = "",
  invert = false,
}: {
  label: string
  delta: number | null
  prefix?: string
  invert?: boolean
}) {
  const color =
    delta == null || delta === 0
      ? "text-muted-foreground"
      : delta > 0 !== invert
        ? "text-green-400"
        : "text-red-400"
  return (
    <KV
      label={label}
      value={
        delta != null ? (
          <span className={color}>
            {delta > 0
              ? `+${prefix}${delta.toFixed(0)}`
              : `${prefix}${delta.toFixed(0)}`}
          </span>
        ) : null
      }
    />
  )
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
        <span className="w-6 text-right text-xs text-green-400 tabular-nums">
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
        <span className="w-6 text-xs text-red-400 tabular-nums">
          {downside?.toFixed(1) ?? "—"}
        </span>
      </div>
    </div>
  )
}

function seasonWindow(year: number) {
  const ms = (m: number) =>
    new Date(`${year}-${String(m).padStart(2, "0")}-01T00:00:00`).getTime()
  return {
    start: ms(6),
    end: ms(10),
    months: [
      { label: "Jun", ms: ms(6) },
      { label: "Jul", ms: ms(7) },
      { label: "Aug", ms: ms(8) },
      { label: "Sep", ms: ms(9) },
    ],
  }
}

type ChartPoint = { time: number; delta: number }

function dedupeByDay(snapshots: RankingSnapshot[]): RankingSnapshot[] {
  const byDay = new Map<string, RankingSnapshot>()
  for (const s of snapshots) {
    const day = s.importedAt.slice(0, 10)
    const existing = byDay.get(day)
    if (!existing || s.importedAt > existing.importedAt) byDay.set(day, s)
  }
  return [...byDay.values()]
    .filter((s) => s.overallRank != null)
    .sort((a, b) => a.importedAt.localeCompare(b.importedAt))
}

function buildCumulativeDeltas(snapshots: RankingSnapshot[]): ChartPoint[] {
  if (snapshots.length === 0) return []
  const initialRank = snapshots[0].overallRank!
  return snapshots.map((s) => ({
    time: new Date(s.importedAt).getTime(),
    delta: initialRank - s.overallRank!,
  }))
}

function RankHistoryChart({
  fbg,
  espn,
}: {
  fbg: RankingSnapshot[]
  espn: RankingSnapshot[]
}) {
  const fbgPts = buildCumulativeDeltas(dedupeByDay(fbg))
  const espnPts = buildCumulativeDeltas(dedupeByDay(espn))

  const allPts = [...fbgPts, ...espnPts]
  if (allPts.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground italic">
        No ranking data available.
      </p>
    )
  }

  const year = new Date(allPts[0].time).getFullYear()
  const { start: xStart, end: xEnd, months } = seasonWindow(year)

  const W = 280
  const H = 90
  const pL = 28
  const pR = 8
  const pT = 8
  const pB = 18
  const cW = W - pL - pR
  const cH = H - pT - pB

  const xRange = xEnd - xStart
  const toX = (ms: number) => pL + ((ms - xStart) / xRange) * cW

  const allDeltas = allPts.map((p) => p.delta)
  const maxAbs = Math.max(...allDeltas.map(Math.abs), 3)
  const yPad = maxAbs * 0.15
  const yTop = maxAbs + yPad
  const yRange = yTop - -(maxAbs + yPad)
  const toY = (d: number) => pT + ((yTop - d) / yRange) * cH

  const ptsStr = (pts: ChartPoint[]) =>
    pts
      .map((p) => `${toX(p.time).toFixed(1)},${toY(p.delta).toFixed(1)}`)
      .join(" ")

  const tickStep = Math.ceil(maxAbs / 2)
  const yTicks = [-tickStep, 0, tickStep].filter(
    (v) => Math.abs(v) <= maxAbs + yPad
  )

  return (
    <div>
      <div className="mb-1 flex items-center gap-3">
        {fbgPts.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-blue-400">
            <span className="inline-block h-0.5 w-3 rounded bg-blue-400" />
            FBG
          </span>
        )}
        {espnPts.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-orange-400">
            <span className="inline-block h-0.5 w-3 rounded bg-orange-400" />
            ESPN
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/50">
          ↑ improved · ↓ dropped
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Y-axis ticks + grid lines */}
        {yTicks.map((v) => {
          const y = toY(v)
          return (
            <g key={v}>
              <line
                x1={pL}
                y1={y}
                x2={W - pR}
                y2={y}
                stroke="currentColor"
                strokeOpacity={v === 0 ? 0.25 : 0.08}
                strokeWidth={v === 0 ? 1 : 0.75}
                strokeDasharray={v === 0 ? "3 3" : undefined}
              />
              <text
                x={pL - 3}
                y={y + 2}
                fontSize="7"
                fill="currentColor"
                fillOpacity="0.4"
                textAnchor="end"
              >
                {v > 0 ? `+${v}` : v}
              </text>
            </g>
          )
        })}

        {/* Vertical month guide lines */}
        {months.map(({ label, ms }) => {
          const x = toX(ms)
          if (x < pL || x > W - pR) return null
          return (
            <line
              key={`grid-${label}`}
              x1={x.toFixed(1)}
              y1={pT}
              x2={x.toFixed(1)}
              y2={H - pB}
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="0.75"
            />
          )
        })}

        {/* FBG line + dots */}
        {fbgPts.length > 1 && (
          <polyline
            points={ptsStr(fbgPts)}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {fbgPts.map((p, i) => (
          <circle
            key={`fbg-${i}`}
            cx={toX(p.time).toFixed(1)}
            cy={toY(p.delta).toFixed(1)}
            r="2.5"
            fill="#60a5fa"
            opacity="0.9"
          />
        ))}

        {/* ESPN line + dots */}
        {espnPts.length > 1 && (
          <polyline
            points={ptsStr(espnPts)}
            fill="none"
            stroke="#fb923c"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {espnPts.map((p, i) => (
          <circle
            key={`espn-${i}`}
            cx={toX(p.time).toFixed(1)}
            cy={toY(p.delta).toFixed(1)}
            r="2.5"
            fill="#fb923c"
            opacity="0.9"
          />
        ))}

        {/* Month labels */}
        {months.map(({ label, ms }) => {
          const x = toX(ms)
          if (x < pL || x > W - pR) return null
          return (
            <text
              key={label}
              x={x.toFixed(1)}
              y={H - 3}
              fontSize="7"
              fill="currentColor"
              fillOpacity="0.4"
              textAnchor="middle"
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export function PlayerDetail({
  player,
  globalMax,
  rankingHistory,
}: {
  player: RankedPlayer | null
  globalMax: number
  rankingHistory: RankingHistory | null
}) {
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
          <p
            className={cn(
              "rounded border px-2 py-1 text-xl leading-none font-bold tabular-nums",
              posColor(player.pos)
            )}
          >
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

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex flex-col items-center justify-center rounded-sm border border-muted-foreground p-1">
            <p className="text-xl leading-none font-bold tabular-nums">
              {player.overallRank ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">FBG</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-sm border border-muted-foreground p-1">
            <p className="text-xl leading-none font-bold tabular-nums">
              {player.espnOverallRank ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">ESPN</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Salary */}
      <div>
        <SectionLabel>Salary Cap</SectionLabel>
        {(() => {
          const fbg250 = parseSalary(player.scFbg250)
          const fbg200 = parseSalary(player.scFbg200)
          const espn200 = parseSalary(player.scEspn200)
          const espn250 = espn200 != null ? Math.round(espn200 * 1.25) : null
          const fbgAvg =
            fbg250 != null && fbg200 != null
              ? (fbg250 + fbg200) / 2
              : (fbg250 ?? fbg200)
          const delta = espn200 != null && fbgAvg != null ? espn200 - fbgAvg : null
          const fbgRange =
            player.scFbg250 != null && player.scFbg200 != null
              ? `${player.scFbg250} – ${player.scFbg200}`
              : (player.scFbg250 ?? player.scFbg200)
          const espnRange =
            espn250 != null && espn200 != null
              ? `$${espn250} – $${espn200}`
              : espn200 != null
                ? `$${espn200}`
                : null
          return (
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              <KV label="FBG Range" value={fbgRange} />
              <KV label="ESPN Range" value={espnRange} />
              <DeltaKV label="Δ Salary" delta={delta} prefix="$" invert />
            </div>
          )
        })()}
      </div>

      <div className="h-px bg-border/50" />

      {/* Rankings */}
      <div>
        <SectionLabel>Rankings</SectionLabel>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          <KV label="FBG" value={player.overallRank} />
          <KV label="ESPN" value={player.espnOverallRank} />
          <DeltaKV
            label="Δ"
            delta={
              player.espnOverallRank != null && player.overallRank != null
                ? player.espnOverallRank - player.overallRank
                : null
            }
          />
          <KV
            label="FBG Pos"
            value={
              player.positionalRank != null
                ? `${player.pos ?? ""}${player.positionalRank}`
                : null
            }
          />
          <KV
            label="ESPN Pos"
            value={
              player.espnPositionalRank != null
                ? `${player.pos ?? ""}${player.espnPositionalRank}`
                : null
            }
          />
          <DeltaKV
            label="Δ"
            delta={
              player.espnPositionalRank != null && player.positionalRank != null
                ? player.espnPositionalRank - player.positionalRank
                : null
            }
          />
          <KV label="Overall Tier" value={player.overallTier} />
          <KV label="Pos Tier" value={player.positionalTier} />
        </div>
      </div>

      {rankingHistory?.fbg?.length || rankingHistory?.espn?.length ? (
        <>
          <div className="h-px bg-border/50" />
          <div>
            <SectionLabel>Rank Movement</SectionLabel>
            <RankHistoryChart
              fbg={rankingHistory?.fbg ?? []}
              espn={rankingHistory?.espn ?? []}
            />
          </div>
        </>
      ) : null}

      <div className="h-px bg-border/50" />

      {/* Risk */}
      <div>
        <SectionLabel>Risk Profile</SectionLabel>
        <BiBar
          upside={player.upside}
          downside={player.downside}
          max={globalMax}
        />
      </div>

      <div className="h-px bg-border/50" />

      {/* Bio */}
      <div className="flex pb-4">
        <div>
          <SectionLabel>Bio</SectionLabel>
          <div className="grid grid-cols-4 gap-x-4 gap-y-2">
            <KV label="Age" value={player.age} />
            <KV
              label="Exp."
              value={
                player.experience != null
                  ? `${player.experience} yr${player.experience !== 1 ? "s" : ""}`
                  : null
              }
            />
          </div>
        </div>
        <div>
          <SectionLabel>Projections</SectionLabel>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <KV label="Proj Points" value={player.projPoints?.toFixed(1)} />
            <KV label="Proj Games" value={player.projGames?.toFixed(1)} />
          </div>
        </div>
      </div>
    </div>
  )
}
