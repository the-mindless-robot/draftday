import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import prisma from "@/lib/prisma"

import { RankingsTable } from "./rankings-table"

export default async function Page() {
  const players = await prisma.player.findMany({
    where: { overallRank: { not: null } },
    orderBy: { overallRank: "asc" },
    take: 300,
    select: {
      id: true,
      name: true,
      team: true,
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
    },
  })

  return (
    <div className="[--header-height:calc(--spacing(14))] h-dvh flex flex-col">
      <SidebarProvider className="flex flex-col flex-1 overflow-hidden">
        <SiteHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="overflow-hidden">
            <div className="flex flex-1 gap-4 p-4 h-full overflow-hidden">
              <div className="flex flex-1 flex-col rounded-xl bg-muted/50 p-4 overflow-hidden">
                <RankingsTable players={players} />
              </div>
              <div className="grid auto-cols-min gap-4 md:grid-rows-3">
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
