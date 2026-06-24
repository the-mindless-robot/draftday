import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import prisma from "@/lib/prisma"
import { TemplatesClient } from "./templates-client"

export default async function Page() {
  const players = await prisma.player.findMany({
    where: { overallRank: { not: null } },
    orderBy: { overallRank: "asc" },
    take: 300,
    select: {
      id: true,
      name: true,
      team: true,
      pos: true,
      overallRank: true,
      espnOverallRank: true,
      positionalRank: true,
      espnPositionalRank: true,
      overallTier: true,
      positionalTier: true,
      projPoints: true,
      projGames: true,
      upside: true,
      downside: true,
      age: true,
      experience: true,
      byeWeek: true,
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
            <TemplatesClient players={players} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
