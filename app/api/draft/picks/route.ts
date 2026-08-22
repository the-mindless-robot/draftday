import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import pickEmitter from "@/lib/pick-events"

export async function GET() {
  const picks = await prisma.draftPick.findMany({
    include: {
      team: { select: { id: true, name: true, isMyTeam: true } },
    },
  })
  return NextResponse.json(
    picks.map((p) => ({
      playerId: p.playerId,
      pick: {
        id: p.id,
        salary: p.salary,
        teamId: p.teamId,
        createdAt: p.createdAt,
        team: p.team,
      },
    }))
  )
}

export async function DELETE() {
  await prisma.draftPick.deleteMany({})
  pickEmitter.emit("pick")
  return new Response(null, { status: 204 })
}

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
