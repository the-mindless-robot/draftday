"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

type Nomination = { playerName: string; team: string; pos: string }

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
    const url = `/dashboard?nominee=${encodeURIComponent(nomination!.playerName)}`
    router.push(url)
  }

  const posColor: Record<string, string> = {
    QB: "text-blue-400",
    RB: "text-green-400",
    WR: "text-yellow-400",
    TE: "text-orange-400",
    K: "text-purple-400",
    PK: "text-purple-400",
  }

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
    </button>
  )
}
