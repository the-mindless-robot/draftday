import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params
  const { name, budget } = await req.json() as { name?: string; budget?: number }

  const team = await prisma.draftTeam.update({
    where: { id: teamId },
    data: {
      ...(name !== undefined && { name }),
      ...(budget !== undefined && { budget }),
    },
  })

  return NextResponse.json(team)
}
