import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pickId: string }> }
) {
  const { pickId } = await params
  const { teamId, salary } = await req.json() as { teamId?: string; salary?: number }

  const pick = await prisma.draftPick.update({
    where: { id: pickId },
    data: {
      ...(teamId !== undefined && { teamId }),
      ...(salary !== undefined && { salary }),
    },
    include: {
      team: { select: { id: true, name: true, isMyTeam: true } },
      player: { select: { id: true, name: true, pos: true, fbgId: true } },
    },
  })

  return NextResponse.json(pick)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pickId: string }> }
) {
  const { pickId } = await params
  await prisma.draftPick.delete({ where: { id: pickId } })
  return new NextResponse(null, { status: 204 })
}
