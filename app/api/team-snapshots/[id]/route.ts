import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await prisma.teamSnapshot.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await prisma.$transaction([
    prisma.teamSnapshot.updateMany({ data: { isDefault: false } }),
    prisma.teamSnapshot.update({ where: { id }, data: { isDefault: true } }),
  ])
  return NextResponse.json({ ok: true })
}
