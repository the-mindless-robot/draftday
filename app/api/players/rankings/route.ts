import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const players = await prisma.player.findMany({
    include: {
      rankings: {
        where: { position: "overall" },
        orderBy: { importedAt: "desc" },
        take: 1,
      },
    },
  })

  const ranked = players
    .filter((p) => p.rankings.length > 0 && p.rankings[0].overallRank != null)
    .map((p) => {
      const r = p.rankings[0]
      return {
        id: p.id,
        name: p.name,
        team: p.team,
        byeWeek: p.byeWeek,
        overallTier: p.overallTier,
        overallRank: r.overallRank,
        pos: r.pos,
        projPoints: r.projPoints,
        projGames: r.projGames,
        upside: r.upside,
        downside: r.downside,
      }
    })
    .sort((a, b) => (a.overallRank ?? Infinity) - (b.overallRank ?? Infinity))
    .slice(0, 300)

  return NextResponse.json(ranked)
}
