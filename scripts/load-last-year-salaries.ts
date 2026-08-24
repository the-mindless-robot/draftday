import "dotenv/config"
import * as fs from "fs"
import * as path from "path"
import prisma from "../lib/prisma"
import { extractLastName } from "../lib/player-name"

type DraftEntry = {
  playerName: string
  nflTeam: string
  pos: string
  salary: number
  fantasyTeam: string
}

const entries: DraftEntry[] = JSON.parse(
  fs.readFileSync(path.resolve(".data/last-year-salaries.json"), "utf-8")
)

let matched = 0
let skipped = 0

for (const entry of entries) {
  const { playerName, salary } = entry

  // Exact match first
  let player = await prisma.player.findFirst({
    where: { name: { equals: playerName, mode: "insensitive" } },
    select: { id: true, name: true },
  })

  // Fuzzy: last name + first name
  if (!player) {
    const lastName = extractLastName(playerName)
    const firstName = playerName.trim().split(/\s+/)[0]
    const candidates = await prisma.player.findMany({
      where: { name: { contains: lastName, mode: "insensitive" } },
      select: { id: true, name: true },
      take: 10,
    })
    player =
      candidates.find((p) =>
        p.name.toLowerCase().includes(firstName.toLowerCase())
      ) ??
      candidates[0] ??
      null
  }

  if (!player) {
    console.warn(`  SKIP  "${playerName}"`)
    skipped++
    continue
  }

  await prisma.player.update({
    where: { id: player.id },
    data: { lastYearSalary: salary },
  })

  console.log(`  OK    "${playerName}" → "${player.name}" $${salary}`)
  matched++
}

console.log(`\nDone: ${matched} updated, ${skipped} skipped`)
