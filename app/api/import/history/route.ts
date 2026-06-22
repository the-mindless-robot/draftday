import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const imports = await prisma.rankingImport.findMany({
    orderBy: { importedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(imports)
}
