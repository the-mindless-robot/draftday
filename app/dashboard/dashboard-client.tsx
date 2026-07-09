"use client"

import { useState, useEffect, useMemo } from "react"
import { Star, User, Users, ListChecks } from "lucide-react"
import { fbgPlayerUrl } from "@/lib/fbg-url"
import { RankingsTable } from "./rankings-table"
import { PlayerDetail } from "./player-detail"
import { MyList } from "./my-list"
import { MyTeam } from "./my-team"
import { DraftLog } from "./draft-log"

type RankingSnapshot = {
  overallRank: number | null
  positionalRank: number | null
  importedAt: string
}

type RankingHistory = {
  fbg: RankingSnapshot[]
  espn: RankingSnapshot[]
}

export type DraftTeamInfo = {
  id: string
  name: string
  budget: number
  isMyTeam: boolean
}

export type DraftPickInfo = {
  id: string
  salary: number
  teamId: string
  createdAt: string | Date
  team: { id: string; name: string; isMyTeam: boolean }
}

export type RankedPlayer = {
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
  draftPick: DraftPickInfo | null
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

function SimilarPlayers({ label, players }: { label: string; players: RankedPlayer[] }) {
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

// Draft form shown in the detail panel when drafting a player
function DraftForm({
  player,
  draftTeams,
  onConfirm,
  onCancel,
}: {
  player: RankedPlayer
  draftTeams: DraftTeamInfo[]
  onConfirm: (teamId: string, salary: number) => Promise<void>
  onCancel: () => void
}) {
  const [teamId, setTeamId] = useState(draftTeams[0]?.id ?? "")
  const [salary, setSalary] = useState(() => {
    const avg = parseSalary(player.scFbg250)
    const b = parseSalary(player.scFbg200)
    if (avg != null && b != null) return Math.round((avg + b) / 2)
    return avg ?? b ?? 1
  })
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm(teamId, salary)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
        Draft {player.name}
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="w-12 shrink-0 text-[11px] text-muted-foreground">Team</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {draftTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-12 shrink-0 text-[11px] text-muted-foreground">Salary</label>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground">$</span>
            <input
              type="number"
              min={1}
              value={salary}
              onChange={(e) => setSalary(Math.max(1, Number(e.target.value)))}
              className="w-16 [appearance:textfield] rounded border border-border bg-background px-2 py-1 text-right font-mono text-xs font-semibold text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={saving || !teamId}
            className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Drafting…" : "Confirm Draft"}
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function DashboardClient({
  players: initialPlayers,
  draftTeams: initialDraftTeams,
}: {
  players: RankedPlayer[]
  draftTeams: DraftTeamInfo[]
}) {
  const [players, setPlayers] = useState(initialPlayers)
  const [draftTeams, setDraftTeams] = useState(initialDraftTeams)
  const [selectedPlayer, setSelectedPlayer] = useState<RankedPlayer | null>(null)
  const [rankingHistory, setRankingHistory] = useState<RankingHistory | null>(null)
  const [rightPanel, setRightPanel] = useState<"details" | "my-list" | "my-team" | "picks">("details")
  const [draftingPlayer, setDraftingPlayer] = useState<RankedPlayer | null>(null)

  useEffect(() => {
    if (!selectedPlayer) { setRankingHistory(null); return }
    fetch(`/api/players/${selectedPlayer.id}/rankings/history`)
      .then((r) => r.json())
      .then(setRankingHistory)
      .catch(() => setRankingHistory(null))
  }, [selectedPlayer?.id])

  // ── Draft handlers ────────────────────────────────────────────────────────

  function handleDraftClick(player: RankedPlayer) {
    setDraftingPlayer(player)
    setSelectedPlayer(player)
    setRightPanel("details")
  }

  async function handleDraftConfirm(teamId: string, salary: number) {
    if (!draftingPlayer) return
    const res = await fetch("/api/draft/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: draftingPlayer.id,
        teamId,
        salary,
        pos: draftingPlayer.pos,
      }),
    })
    const pick = await res.json() as DraftPickInfo
    setPlayers((prev) =>
      prev.map((p) => (p.id === draftingPlayer.id ? { ...p, draftPick: pick } : p))
    )
    setDraftingPlayer(null)
  }

  async function handleEditPick(pickId: string, teamId: string, salary: number) {
    const res = await fetch(`/api/draft/picks/${pickId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, salary }),
    })
    const updated = await res.json() as DraftPickInfo
    setPlayers((prev) =>
      prev.map((p) => (p.draftPick?.id === pickId ? { ...p, draftPick: updated } : p))
    )
  }

  async function handleDeletePick(pickId: string) {
    await fetch(`/api/draft/picks/${pickId}`, { method: "DELETE" })
    setPlayers((prev) =>
      prev.map((p) => (p.draftPick?.id === pickId ? { ...p, draftPick: null } : p))
    )
  }

  // ── Flag / Target handlers ────────────────────────────────────────────────

  async function handleFlag(player: RankedPlayer) {
    const wasFlagged = player.flagged
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id
          ? { ...p, flagged: !wasFlagged, ...(wasFlagged && { targeted: false }) }
          : p
      )
    )
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer((prev) =>
        prev ? { ...prev, flagged: !wasFlagged, ...(wasFlagged && { targeted: false }) } : null
      )
    }
    try {
      await fetch(`/api/players/${player.id}/flag`, { method: "PATCH" })
    } catch {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, flagged: wasFlagged, targeted: player.targeted } : p
        )
      )
    }
  }

  async function handleTarget(player: RankedPlayer) {
    const wasTargeted = player.targeted
    const wasFlagged = player.flagged
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id
          ? { ...p, targeted: !wasTargeted, ...(!wasTargeted && { flagged: true }) }
          : p
      )
    )
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer((prev) =>
        prev ? { ...prev, targeted: !wasTargeted, ...(!wasTargeted && { flagged: true }) } : null
      )
    }
    try {
      await fetch(`/api/players/${player.id}/target`, { method: "PATCH" })
    } catch {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, targeted: wasTargeted, flagged: wasFlagged } : p
        )
      )
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const globalMax = Math.max(
    ...players.map((p) => Math.max(p.upside ?? 0, p.downside ?? 0)),
    1
  )

  const draftedPlayers = useMemo(
    () => players.filter((p) => p.draftPick !== null) as (RankedPlayer & { draftPick: DraftPickInfo })[],
    [players]
  )

  const myTeamPicks = useMemo(
    () => draftedPlayers.filter((p) => p.draftPick.team.isMyTeam),
    [draftedPlayers]
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
  const picksCount = draftedPlayers.length

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
          onTarget={handleTarget}
          onDraft={handleDraftClick}
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
              <button
                onClick={() => setRightPanel("picks")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                  rightPanel === "picks"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListChecks className="h-3 w-3" />
                Picks
                {picksCount > 0 && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                    {picksCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className={rightPanel !== "details" ? "hidden" : ""}>
            {draftingPlayer && rightPanel === "details" && (
              <DraftForm
                player={draftingPlayer}
                draftTeams={draftTeams}
                onConfirm={handleDraftConfirm}
                onCancel={() => setDraftingPlayer(null)}
              />
            )}
            <PlayerDetail
              player={selectedPlayer}
              globalMax={globalMax}
              rankingHistory={rankingHistory}
            />
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
              onTarget={(id) => {
                const p = players.find((pl) => pl.id === id)
                if (p) handleTarget(p)
              }}
            />
          </div>
          <div className={rightPanel !== "my-team" ? "hidden" : ""}>
            <MyTeam players={players} myTeamPicks={myTeamPicks} />
          </div>
          <div className={rightPanel !== "picks" ? "hidden" : ""}>
            <DraftLog
              players={draftedPlayers}
              draftTeams={draftTeams}
              onEdit={handleEditPick}
              onDelete={handleDeletePick}
            />
          </div>
        </div>
        {rightPanel === "details" && selectedPlayer && (
          <>
            <SimilarPlayers
              label={selectedPlayer ? `Similar ${selectedPlayer.pos ?? ""}s` : "Positional comps"}
              players={positionalComps}
            />
            <SimilarPlayers label="Flex comps" players={flexComps} />
          </>
        )}
      </div>
    </div>
  )
}
