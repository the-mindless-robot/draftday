import prisma from "@/lib/prisma"
import type { FBGPosition } from "@/lib/parsers/fbg"

function toInt(val: string | undefined): number | null {
  if (!val || val === "-") return null
  const n = parseInt(val.replace(/[^0-9]/g, ""), 10)
  return isNaN(n) ? null : n
}

function toFloat(val: string | undefined): number | null {
  if (!val || val === "-") return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function splitPos(val: string | undefined): { pos: string | null; positionalRank: number | null } {
  if (!val) return { pos: null, positionalRank: null }
  const match = val.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) return { pos: val, positionalRank: null }
  return { pos: match[1], positionalRank: parseInt(match[2], 10) }
}

export async function saveImport({
  rows,
  source,
  position,
  budget,
  season,
}: {
  rows: Record<string, string>[]
  source: "fbg" | "espn"
  position: FBGPosition
  budget: 200 | 250
  season: number
}): Promise<{ importId: string; saved: number }> {
  return prisma.$transaction(
    async (tx) => {
      const { id: importId, importedAt } = await tx.rankingImport.create({
        data: { source, position, season, rowCount: rows.length },
      })

      let saved = 0

      for (const row of rows) {
        if (!row.playerId) continue

        if (position === "overall") {
          const scField =
            budget === 250
              ? { scFbg250: row["Salary Cap"] || null }
              : { scFbg200: row["Salary Cap"] || null }

          const player = await tx.player.upsert({
            where: { fbgId: row.playerId },
            update: {
              name: row.Player,
              team: row.Team || null,
              age: toInt(row.Age),
              experience: toInt(row.Exp),
              byeWeek: toInt(row.Bye),
              overallTier: row.tier || null,
              ...scField,
            },
            create: {
              fbgId: row.playerId,
              name: row.Player,
              team: row.Team || null,
              age: toInt(row.Age),
              experience: toInt(row.Exp),
              byeWeek: toInt(row.Bye),
              overallTier: row.tier || null,
              ...scField,
            },
          })

          const { pos, positionalRank } = splitPos(row.Pos)

          await tx.playerRanking.create({
            data: {
              playerId: player.id,
              importId,
              source,
              position,
              season,
              importedAt,
              overallRank: toInt(row.Rank),
              pos,
              positionalRank,
              projPoints: toFloat(row.Points),
              projGames: toFloat(row.Games),
              downside: toFloat(row.Downside),
              upside: toFloat(row.Upside),
            },
          })
        } else {
          const player = await tx.player.upsert({
            where: { fbgId: row.playerId },
            update: { positionalTier: row.tier || null },
            create: {
              fbgId: row.playerId,
              name: row.playerName || row.playerId,
              positionalTier: row.tier || null,
            },
          })

          await tx.playerRanking.create({
            data: {
              playerId: player.id,
              importId,
              source,
              position,
              season,
              importedAt,
              positionalRank: toInt(row.rank),
            },
          })
        }

        saved++
      }

      return { importId, saved }
    },
    { timeout: 60000 }
  )
}
