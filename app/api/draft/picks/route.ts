import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { playerId, teamId, salary, pos } = await req.json() as {
    playerId: string
    teamId: string
    salary: number
    pos?: string
  }

  const pick = await prisma.draftPick.create({
    data: { playerId, teamId, salary, pos },
    include: {
      team: { select: { id: true, name: true, isMyTeam: true } },
      player: { select: { id: true, name: true, pos: true, fbgId: true } },
    },
  })

  return NextResponse.json(pick)
}
