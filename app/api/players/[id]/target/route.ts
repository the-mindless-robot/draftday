import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const player = await prisma.player.findUnique({
    where: { id },
    select: { targeted: true },
  })

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.player.update({
    where: { id },
    data: {
      targeted: !player.targeted,
      flagged: true,
    },
    select: { targeted: true, flagged: true },
  })

  return NextResponse.json(updated)
}
