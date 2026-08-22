import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import prisma from "@/lib/prisma"
import { TeamsGrid } from "./teams-grid"

const TOTAL_SLOTS = 17

const POS_ORDER: Record<string, number> = {
  QB: 0, RB: 1, WR: 2, TE: 3, K: 4, PK: 4, TD: 5, DST: 5,
}

const SLOT_POINTS = [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1]

const POS_SLOT_ORDER: Record<string, number[]> = {
  QB:  [0],
  RB:  [1, 2, 6, 7, 10, 11, 12, 13, 14, 15, 16],
  WR:  [3, 4, 6, 7, 10, 11, 12, 13, 14, 15, 16],
  TE:  [5, 6, 7, 10, 11, 12, 13, 14, 15, 16],
  K:   [9],
  PK:  [9],
  TD:  [8],
  DST: [8],
}

function rosterScore(picks: { player: { pos: string | null } }[]): number {
  const filled = new Array(SLOT_POINTS.length).fill(false)
  let score = 0
  for (const pick of picks) {
    const pos = pick.player.pos?.toUpperCase() ?? ""
    for (const idx of POS_SLOT_ORDER[pos] ?? []) {
      if (!filled[idx]) {
        filled[idx] = true
        score += SLOT_POINTS[idx]
        break
      }
    }
  }
  return score
}

export default async function TeamsPage() {
  const teams = await prisma.draftTeam.findMany({
    include: {
      picks: {
        orderBy: { createdAt: "asc" },
        include: {
          player: { select: { id: true, name: true, pos: true } },
        },
      },
    },
  })

  const teamsWithStats = teams
    .map((t) => {
      const spent = t.picks.reduce((sum, p) => sum + p.salary, 0)
      const remaining = t.budget - spent
      const spotsLeft = TOTAL_SLOTS - t.picks.length
      const maxBid = spotsLeft > 0 ? remaining - (spotsLeft - 1) : remaining
      const score = rosterScore(t.picks)
      const sortedPicks = [...t.picks].sort((a, b) => {
        const ao = POS_ORDER[a.player.pos?.toUpperCase() ?? ""] ?? 6
        const bo = POS_ORDER[b.player.pos?.toUpperCase() ?? ""] ?? 6
        return ao !== bo ? ao - bo : b.salary - a.salary
      })
      return {
        id: t.id,
        name: t.name,
        isMyTeam: t.isMyTeam,
        budget: t.budget,
        spent,
        remaining,
        maxBid,
        score,
        sortedPicks,
        totalPicks: t.picks.length,
      }
    })
    .sort((a, b) => b.maxBid - a.maxBid)

  return (
    <div className="flex h-dvh flex-col [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-1 flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="overflow-auto">
            <TeamsGrid teams={teamsWithStats} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
