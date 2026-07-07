import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const snapshots = await prisma.teamSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, budgets: true, createdAt: true },
  })
  return NextResponse.json(snapshots)
}

export async function POST(req: NextRequest) {
  const { stem, budgets } = (await req.json()) as {
    stem: string
    budgets: number[]
  }

  if (!stem || !Array.isArray(budgets)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const existing = await prisma.teamSnapshot.findMany({
    where: { name: { startsWith: `${stem}-v` } },
    select: { name: true },
  })

  const nextVersion =
    existing.length === 0
      ? 0
      : Math.max(
          ...existing.map((s) => {
            const m = s.name.match(/-v(\d+)$/)
            return m ? parseInt(m[1], 10) : 0
          }),
        ) + 1

  const snapshot = await prisma.teamSnapshot.create({
    data: { name: `${stem}-v${nextVersion}`, budgets },
  })

  return NextResponse.json({ id: snapshot.id, name: snapshot.name })
}
