import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import prisma from "@/lib/prisma"

import { DashboardClient } from "./dashboard-client"

export default async function Page() {
  const players = await prisma.player.findMany({
    where: { overallRank: { not: null } },
    orderBy: { overallRank: "asc" },
    take: 300,
    select: {
      id: true,
      fbgId: true,
      name: true,
      team: true,
      age: true,
      experience: true,
      byeWeek: true,
      overallTier: true,
      positionalTier: true,
      overallRank: true,
      espnOverallRank: true,
      positionalRank: true,
      espnPositionalRank: true,
      fbgRankDelta: true,
      espnRankDelta: true,
      flagged: true,
      pos: true,
      projPoints: true,
      projGames: true,
      upside: true,
      downside: true,
      scFbg250: true,
      scFbg200: true,
      scFbgScaled: true,
      scEspn200: true,
    },
  })

  return (
    <div className="flex h-dvh flex-col [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-1 flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="overflow-hidden">
            <DashboardClient players={players} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
