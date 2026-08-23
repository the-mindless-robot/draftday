import "dotenv/config"
import prisma from "../lib/prisma"

async function main() {
  const teams = await prisma.draftTeam.findMany({
    where: { isMyTeam: false },
    orderBy: { id: "asc" },
  })

  for (let i = 0; i < teams.length; i++) {
    await prisma.draftTeam.update({
      where: { id: teams[i].id },
      data: { name: `Team ${i + 1}` },
    })
    console.log(`${teams[i].name} → Team ${i + 1}`)
  }

  console.log("Done.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
