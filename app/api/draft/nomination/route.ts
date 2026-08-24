import { NextRequest, NextResponse } from "next/server"
import pickEmitter from "@/lib/pick-events"
import prisma from "@/lib/prisma"
import { extractLastName } from "@/lib/player-name"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

let currentNomination: { playerName: string; team: string; pos: string } | null = null

export async function GET() {
  if (!currentNomination) return NextResponse.json({}, { headers: cors })

  const { playerName } = currentNomination
  let player = await prisma.player.findFirst({
    where: { name: { equals: playerName, mode: "insensitive" } },
    select: { scFbg250: true, scEspn200: true },
  })

  if (!player) {
    const lastName = extractLastName(playerName)
    const firstName = playerName.trim().split(/\s+/)[0]
    const candidates = await prisma.player.findMany({
      where: { name: { contains: lastName, mode: "insensitive" } },
      select: { name: true, scFbg250: true, scEspn200: true },
      take: 10,
    })
    const hit = candidates.find((p) => p.name.toLowerCase().includes(firstName.toLowerCase()))
      ?? candidates[0]
    player = hit ?? null
  }

  return NextResponse.json(
    { ...currentNomination, scFbg250: player?.scFbg250 ?? null, scEspn200: player?.scEspn200 ?? null },
    { headers: cors }
  )
}

export async function POST(req: NextRequest) {
  const { playerName, team, pos } = (await req.json()) as {
    playerName: string
    team: string
    pos: string
  }
  currentNomination = { playerName, team, pos }
  pickEmitter.emit("nomination", playerName)
  return NextResponse.json(currentNomination, { headers: cors })
}
