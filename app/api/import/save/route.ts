import { NextRequest, NextResponse } from "next/server"
import { saveImport } from "@/lib/db/save-import"
import type { FBGPosition } from "@/lib/parsers/fbg"

export async function POST(req: NextRequest) {
  const { rows, source, position, budget, season } = await req.json() as {
    rows: Record<string, string>[]
    source: "fbg" | "espn"
    position: FBGPosition
    budget: 200 | 250
    season: number
  }

  if (!rows?.length) {
    return NextResponse.json({ error: "No rows to save." }, { status: 400 })
  }

  try {
    const result = await saveImport({ rows, source, position, budget, season })
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save to database."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
