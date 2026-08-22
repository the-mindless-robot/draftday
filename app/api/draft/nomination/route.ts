import { NextRequest, NextResponse } from "next/server"
import pickEmitter from "@/lib/pick-events"

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
  return NextResponse.json(currentNomination ?? {}, { headers: cors })
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
