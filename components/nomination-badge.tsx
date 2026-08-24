"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

type Nomination = {
  playerName: string
  team: string
  pos: string
  scFbg250: string | null
  scEspn200: string | null
}

function parseSalary(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

async function fetchNomination(): Promise<Nomination | null> {
  try {
    const res = await fetch("/api/draft/nomination")
    const data = await res.json()
    return data.playerName ? data : null
  } catch {
    return null
  }
}

export function NominationBadge() {
  const [nomination, setNomination] = useState<Nomination | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetchNomination().then(setNomination)
  }, [])

  useEffect(() => {
    const es = new EventSource("/api/draft/events")
    es.addEventListener("nomination", () => {
      fetchNomination().then(setNomination)
    })
    return () => es.close()
  }, [])

  if (!nomination) return null

  function handleClick() {
    const base = pathname === "/templates" ? "/templates" : "/dashboard"
    router.push(`${base}?nominee=${encodeURIComponent(nomination!.playerName)}`)
  }

  const posColor: Record<string, string> = {
    QB: "text-blue-400",
    RB: "text-green-400",
    WR: "text-yellow-400",
    TE: "text-orange-400",
    K: "text-purple-400",
    PK: "text-purple-400",
  }

  const fbg = parseSalary(nomination.scFbg250)
  const espn = parseSalary(nomination.scEspn200)
  const espnEst = espn != null ? Math.round(espn * 1.25) : null

  return (
    <button
      onClick={handleClick}
      className="ml-auto flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs transition-colors hover:bg-primary/20"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shrink-0" />
      <span className={`font-mono font-bold shrink-0 ${posColor[nomination.pos ?? ""] ?? "text-muted-foreground"}`}>
        {nomination.pos}
      </span>
      <span className="font-semibold text-foreground">{nomination.playerName}</span>
      {nomination.team && (
        <span className="text-muted-foreground shrink-0">{nomination.team}</span>
      )}
      {(fbg != null || espnEst != null) && (
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
          {fbg != null ? `$${fbg.toFixed(0)}` : "—"}
          {" / "}
          {espnEst != null ? `$${espnEst}` : "—"}
        </span>
      )}
    </button>
  )
}
