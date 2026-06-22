import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.rankingImport.delete({ where: { id } })
    return NextResponse.json({ deleted: id })
  } catch {
    return NextResponse.json({ error: "Import not found." }, { status: 404 })
  }
}
