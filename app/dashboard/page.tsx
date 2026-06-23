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
      name: true,
      team: true,
      age: true,
      experience: true,
      byeWeek: true,
      overallTier: true,
      positionalTier: true,
      overallRank: true,
      positionalRank: true,
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
    <div className="[--header-height:calc(--spacing(14))] h-dvh flex flex-col">
      <SidebarProvider className="flex flex-col flex-1 overflow-hidden">
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
