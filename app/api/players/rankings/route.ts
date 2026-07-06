import { NextResponse } from "next/server"
import type { FBGPosition } from "@/lib/parsers/fbg"
import prisma from "@/lib/prisma"

const select = {
  id: true,
  name: true,
  team: true,
  byeWeek: true,
  overallTier: true,
  positionalTier: true,
  overallRank: true,
  positionalRank: true,
  espnOverallRank: true,
  espnPositionalRank: true,
  fbgRankDelta: true,
  espnRankDelta: true,
  pos: true,
  projPoints: true,
  projGames: true,
  upside: true,
  downside: true,
  scFbg250: true,
  scFbg200: true,
  scFbgScaled: true,
  scEspn200: true,
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const position = (searchParams.get("position") ?? "overall") as FBGPosition

  if (position === "overall") {
    const players = await prisma.player.findMany({
      where: { overallRank: { not: null } },
      orderBy: { overallRank: "asc" },
      take: 300,
      select,
    })
    return NextResponse.json(players)
  }

  // Positional tier comes from positional imports; ranks come from the overall import.
  // Filter by pos and sort by positionalRank — all on the Player record.
  const posFilter =
    position === "FLEX" ? { in: ["RB", "WR", "TE"] } :
    position === "PK"   ? { in: ["K", "PK"] }        :
    position

  const players = await prisma.player.findMany({
    where: { pos: posFilter, positionalRank: { not: null } },
    orderBy: { positionalRank: "asc" },
    select,
  })

  return NextResponse.json(players)
}
