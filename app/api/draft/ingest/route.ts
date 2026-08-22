import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// CORS required so the Chrome extension (running on ESPN's domain) can POST here
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function POST(req: NextRequest) {
  const { playerName, teamName, salary, pickNumber } = (await req.json()) as {
    playerName: string
    teamName: string
    salary: number
    pickNumber?: number
  }

  // 1. Resolve player — exact match first, then last-name fallback
  let player = await prisma.player.findFirst({
    where: { name: { equals: playerName, mode: "insensitive" } },
  })

  if (!player) {
    const parts = playerName.trim().split(/\s+/)
    const firstName = parts[0]
    const lastName = parts.at(-1)!
    const candidates = await prisma.player.findMany({
      where: { name: { contains: lastName, mode: "insensitive" } },
      take: 10,
    })
    player =
      candidates.find((p) =>
        p.name.toLowerCase().includes(firstName.toLowerCase())
      ) ??
      candidates[0] ??
      null
  }

  if (!player) {
    return NextResponse.json(
      { error: `Player not found: "${playerName}"` },
      { status: 404, headers: cors }
    )
  }

  // 2. Resolve team — exact match first, then partial, then create
  let team = await prisma.draftTeam.findFirst({
    where: { name: { equals: teamName, mode: "insensitive" } },
  })

  if (!team) {
    team = await prisma.draftTeam.findFirst({
      where: { name: { contains: teamName, mode: "insensitive" } },
    })
  }

  if (!team) {
    // Rename the lowest-numbered placeholder to the real ESPN team name
    const placeholder = await prisma.draftTeam.findFirst({
      where: { name: { startsWith: "Team " } },
      orderBy: { name: "asc" },
    })
    if (placeholder) {
      team = await prisma.draftTeam.update({
        where: { id: placeholder.id },
        data: { name: teamName },
      })
    } else {
      return NextResponse.json(
        { error: `Team not found and no placeholders remain: "${teamName}"` },
        { status: 404, headers: cors }
      )
    }
  }

  // 3. Idempotent — skip if player already drafted
  const existing = await prisma.draftPick.findUnique({
    where: { playerId: player.id },
  })
  if (existing) {
    return NextResponse.json({ exists: true }, { headers: cors })
  }

  const pick = await prisma.draftPick.create({
    data: {
      playerId: player.id,
      teamId: team.id,
      salary,
      pos: player.pos,
    },
    include: {
      team: { select: { id: true, name: true, isMyTeam: true } },
      player: { select: { id: true, name: true, pos: true } },
    },
  })

  return NextResponse.json(pick, { headers: cors })
}
