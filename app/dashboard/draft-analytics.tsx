import type { RankedPlayer } from "./dashboard-client"

function parseSalary(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

const POSITIONS = [
  { label: "QB", match: ["QB"] },
  { label: "RB", match: ["RB"] },
  { label: "WR", match: ["WR"] },
  { label: "TE", match: ["TE"] },
  { label: "K", match: ["K", "PK"] },
  { label: "DST", match: ["DST", "TD"] },
]

const POS_COLORS: Record<string, string> = {
  QB: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  RB: "text-green-400 border-green-400/30 bg-green-400/10",
  WR: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  TE: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  K: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  DST: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
}

export function DraftAnalytics({ players }: { players: RankedPlayer[] }) {
  const sections = POSITIONS.map(({ label, match }) => {
    const atPos = players.filter(
      (p) => p.pos != null && match.includes(p.pos.toUpperCase())
    )
    const drafted = atPos.filter((p) => p.draftPick !== null)
    const available = atPos
      .filter((p) => p.draftPick === null && p.positionalRank != null)
      .sort((a, b) => (a.positionalRank ?? 999) - (b.positionalRank ?? 999))

    const currentTier = available[0]?.positionalTier ?? null
    const leftInTier = currentTier
      ? available.filter((p) => p.positionalTier === currentTier).length
      : 0
    const next5 = available.slice(0, 5)

    return { label, drafted, available, currentTier, leftInTier, next5 }
  })

  return (
    <div className="flex flex-col gap-4">
      {sections.map(({ label, drafted, currentTier, leftInTier, next5 }) => {
        const colors = POS_COLORS[label] ?? ""

        return (
          <div key={label}>
            {/* Position header */}
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${colors}`}
              >
                {label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {drafted.length} drafted
              </span>
              {currentTier && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                    {currentTier}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">
                    {leftInTier} left
                  </span>
                </>
              )}
            </div>

            {/* Next 5 available */}
            {next5.length === 0 ? (
              <p className="py-1 text-[11px] text-muted-foreground/40">
                None available
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {next5.map((p) => {
                  const fbg = parseSalary(p.scFbg250)
                  const espnRaw = parseSalary(p.scEspn200)
                  const est =
                    espnRaw != null ? Math.round(espnRaw * 1.25) : null
                  const diff =
                    fbg != null && est != null ? fbg - est : null
                  const diffColor =
                    diff == null
                      ? "text-muted-foreground/40"
                      : diff > 0
                        ? "text-green-400"
                        : diff < 0
                          ? "text-red-400"
                          : "text-muted-foreground/40"
                  const tierChanged =
                    p.positionalTier !== next5[0].positionalTier

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-1.5 ${tierChanged ? "opacity-50" : ""}`}
                    >
                      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground/50">
                        {p.positionalRank}
                      </span>
                      <span
                        className={`flex-1 truncate text-[11px] font-medium ${p.targeted ? "text-primary" : p.flagged ? "text-yellow-400" : ""}`}
                      >
                        {p.name}
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                        {fbg != null ? `$${fbg.toFixed(0)}` : "—"}
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground/60">
                        {est != null ? `$${est}` : "—"}
                      </span>
                      <span className={`w-8 shrink-0 text-right font-mono text-[10px] ${diffColor}`}>
                        {diff != null ? `${diff > 0 ? "+" : ""}${diff}` : "—"}
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground/50">
                        {p.lastYearSalary != null ? `$${p.lastYearSalary}` : "—"}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
