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
  const { name, budgets } = (await req.json()) as {
    name: string
    budgets: number[]
  }

  if (!name?.trim() || !Array.isArray(budgets)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const snapshot = await prisma.teamSnapshot.create({
    data: { name: name.trim(), budgets },
  })

  return NextResponse.json({ id: snapshot.id, name: snapshot.name })
}
