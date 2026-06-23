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
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 gap-4 p-4">
              <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
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
