"use client"

import { useState } from "react"
import { X } from "lucide-react"

type DraftTeam = { id: string; name: string; isMyTeam: boolean }

type DraftedPlayer = {
  id: string
  name: string
  pos: string | null
  draftPick: {
    id: string
    salary: number
    teamId: string
    createdAt: string | Date
    team: DraftTeam
  }
}

export function DraftLog({
  players,
  draftTeams,
  onEdit,
  onDelete,
}: {
  players: DraftedPlayer[]
  draftTeams: DraftTeam[]
  onEdit: (pickId: string, teamId: string, salary: number) => Promise<void>
  onDelete: (pickId: string) => Promise<void>
}) {
  const sorted = [...players].sort(
    (a, b) =>
      new Date(a.draftPick.createdAt).getTime() -
      new Date(b.draftPick.createdAt).getTime()
  )

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
        <p className="text-xs font-medium text-muted-foreground">No picks yet</p>
        <p className="text-[11px] text-muted-foreground/60">
          Draft players from the rankings table.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 grid grid-cols-[1.5rem_1fr_6rem_3.5rem_1.5rem] gap-1 border-b border-border/30 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
        <span>#</span>
        <span>Player</span>
        <span>Team</span>
        <span className="text-right">$</span>
        <span />
      </div>
      {sorted.map((p, i) => (
        <PickRow
          key={p.draftPick.id}
          index={i + 1}
          player={p}
          draftTeams={draftTeams}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function PickRow({
  index,
  player,
  draftTeams,
  onEdit,
  onDelete,
}: {
  index: number
  player: DraftedPlayer
  draftTeams: DraftTeam[]
  onEdit: (pickId: string, teamId: string, salary: number) => Promise<void>
  onDelete: (pickId: string) => Promise<void>
}) {
  const pick = player.draftPick
  const [teamId, setTeamId] = useState(pick.teamId)
  const [salary, setSalary] = useState(pick.salary)
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    if (teamId === pick.teamId && salary === pick.salary) return
    setSaving(true)
    try {
      await onEdit(pick.id, teamId, salary)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`grid grid-cols-[1.5rem_1fr_6rem_3.5rem_1.5rem] items-center gap-1 rounded px-0.5 py-1 text-xs ${saving ? "opacity-50" : ""}`}
    >
      <span className="font-mono text-[10px] text-muted-foreground">{index}</span>

      <div className="min-w-0">
        <span className="truncate font-medium">{player.name}</span>
        {player.pos && (
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">
            {player.pos}
          </span>
        )}
      </div>

      <select
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
        onBlur={handleBlur}
        className="w-full rounded border border-border bg-background px-1 py-0.5 text-[10px] text-foreground"
      >
        {draftTeams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-end gap-0.5">
        <span className="font-mono text-[10px] text-muted-foreground">$</span>
        <input
          type="number"
          min={1}
          value={salary}
          onChange={(e) => setSalary(Math.max(1, Number(e.target.value)))}
          onBlur={handleBlur}
          className="w-8 [appearance:textfield] rounded border border-border bg-background px-1 py-0.5 text-right font-mono text-[10px] font-semibold text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      <button
        onClick={() => onDelete(pick.id)}
        className="flex items-center justify-center text-muted-foreground/40 transition-colors hover:text-red-400"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
