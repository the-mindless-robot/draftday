import 'dotenv/config'
import prisma from '../lib/prisma'

const teams = [
  { name: 'JOHNSONS', isMyTeam: true },
  { name: 'Team 1' },
  { name: 'Team 2' },
  { name: 'Team 3' },
  { name: 'Team 4' },
  { name: 'Team 5' },
  { name: 'Team 6' },
  { name: 'Team 7' },
  { name: 'Team 8' },
  { name: 'Team 9' },
]

for (const team of teams) {
  await prisma.draftTeam.upsert({
    where: { name: team.name },
    update: {},
    create: team,
  })
}

console.log('Seeded 10 draft teams')
await prisma.$disconnect()
