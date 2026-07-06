import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const records = await prisma.playerRanking.findMany({
    where: { playerId: id, position: "overall" },
    orderBy: { importedAt: "asc" },
    select: {
      source: true,
      overallRank: true,
      positionalRank: true,
      importedAt: true,
    },
  })

  const fbg = records
    .filter((r) => r.source === "fbg")
    .map((r) => ({
      overallRank: r.overallRank,
      positionalRank: r.positionalRank,
      importedAt: r.importedAt.toISOString(),
    }))

  const espn = records
    .filter((r) => r.source === "espn")
    .map((r) => ({
      overallRank: r.overallRank,
      positionalRank: r.positionalRank,
      importedAt: r.importedAt.toISOString(),
    }))

  return NextResponse.json({ fbg, espn })
}
