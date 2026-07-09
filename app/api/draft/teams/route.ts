import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const teams = await prisma.draftTeam.findMany({
    orderBy: { name: "asc" },
    include: {
      picks: {
        orderBy: { createdAt: "asc" },
        include: {
          player: { select: { id: true, name: true, pos: true, fbgId: true } },
        },
      },
    },
  })

  const result = teams.map((t) => ({
    ...t,
    budgetSpent: t.picks.reduce((sum, p) => sum + p.salary, 0),
    budgetRemaining: t.budget - t.picks.reduce((sum, p) => sum + p.salary, 0),
  }))

  return NextResponse.json(result)
}
