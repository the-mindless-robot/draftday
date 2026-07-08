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

function stripNameSuffix(name: string): string {
  return name.replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "").trim()
}

function splitPos(val: string | undefined): {
  pos: string | null
  positionalRank: number | null
} {
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
      const importedFbgIds: string[] = []

      for (const row of rows) {
        if (source === "espn") {
          const espnPosMap: Record<string, string> = { DST: "TD", K: "PK" }
          const pos = espnPosMap[String(row.position)] ?? String(row.position)

          const espnTeamMap: Record<string, string> = { JAC: "JAX" }
          const team = espnTeamMap[String(row.team)] ?? String(row.team)

          const espnNameMap: Record<string, string> = {
            "Kenneth Walker III": "Ken Walker",
          }
          const rawName = String(row.name)
            .trim()
            .replace(/\b(Jr|Sr)\./gi, "$1")
          const name = espnNameMap[rawName] ?? rawName

          const buildWhere = (n: string) =>
            pos === "TD"
              ? {
                  team: { equals: team, mode: "insensitive" as const },
                  pos: { equals: pos, mode: "insensitive" as const },
                }
              : {
                  name: { equals: n, mode: "insensitive" as const },
                  team: { equals: team, mode: "insensitive" as const },
                  pos: { equals: pos, mode: "insensitive" as const },
                }

          const buildWhereStartsWith = (n: string) => ({
            name: { startsWith: n, mode: "insensitive" as const },
            team: { equals: team, mode: "insensitive" as const },
            pos: { equals: pos, mode: "insensitive" as const },
          })

          const player =
            (await tx.player.findFirst({ where: buildWhere(name) })) ??
            (pos !== "TD"
              ? ((await tx.player.findFirst({
                  where: buildWhere(stripNameSuffix(name)),
                })) ??
                (await tx.player.findFirst({
                  where: buildWhereStartsWith(name),
                })))
              : null)

          if (!player) {
            const stripped = stripNameSuffix(name)
            const loose = await tx.player.findMany({
              where: { name: { contains: stripped, mode: "insensitive" } },
              select: { name: true, team: true, pos: true },
            })
            console.warn(
              `[ESPN import] no match — tried: "${name}" / "${stripped}" @ ${team}/${pos}\n` +
                `  DB candidates by name: ${loose.length ? JSON.stringify(loose) : "none"}`
            )
            continue
          }

          const newEspnOverallRank = Number(row.rank) || null
          const firstEspnRanking = await tx.playerRanking.findFirst({
            where: { playerId: player.id, source: "espn", position: "overall" },
            orderBy: { importedAt: "asc" },
            select: { overallRank: true },
          })
          const espnRankDelta =
            firstEspnRanking?.overallRank != null && newEspnOverallRank != null
              ? firstEspnRanking.overallRank - newEspnOverallRank
              : null

          await tx.player.update({
            where: { id: player.id },
            data: {
              espnOverallRank: newEspnOverallRank,
              espnPositionalRank: Number(row.positional_rank) || null,
              scEspn200: String(row.salary) || null,
              espnRankDelta,
            },
          })

          await tx.playerRanking.create({
            data: {
              playerId: player.id,
              importId,
              source,
              position: "overall",
              season,
              importedAt,
              overallRank: Number(row.rank) || null,
              positionalRank: Number(row.positional_rank) || null,
              pos,
            },
          })

          saved++
          continue
        }

        if (!row.playerId) continue

        if (position === "overall") {
          importedFbgIds.push(row.playerId)

          const scField =
            budget === 250
              ? { scFbg250: row["Salary Cap"] || null }
              : { scFbg200: row["Salary Cap"] || null }

          const { pos, positionalRank } = splitPos(row.Pos)
          const newOverallRank = toInt(row.Rank)

          const firstFbgRanking = await tx.playerRanking.findFirst({
            where: {
              player: { fbgId: row.playerId },
              source: "fbg",
              position: "overall",
            },
            orderBy: { importedAt: "asc" },
            select: { overallRank: true },
          })
          const fbgRankDelta =
            firstFbgRanking?.overallRank != null && newOverallRank != null
              ? firstFbgRanking.overallRank - newOverallRank
              : null

          const rankFields = {
            ...(pos !== null && { pos }),
            overallRank: newOverallRank,
            ...(positionalRank !== null && { positionalRank }),
            projPoints: toFloat(row.Points),
            projGames: toFloat(row.Games),
            upside: toFloat(row.Upside),
            downside: toFloat(row.Downside),
            fbgRankDelta,
          }

          const player = await tx.player.upsert({
            where: { fbgId: row.playerId },
            update: {
              name: row.Player,
              team: row.Team || null,
              age: toInt(row.Age),
              experience: toInt(row.Exp),
              byeWeek: toInt(row.Bye),
              overallTier: row.tier || null,
              ...rankFields,
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
              ...rankFields,
              ...scField,
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
              overallRank: rankFields.overallRank,
              pos: rankFields.pos,
              positionalRank: rankFields.positionalRank,
              projPoints: rankFields.projPoints,
              projGames: rankFields.projGames,
              upside: rankFields.upside,
              downside: rankFields.downside,
            },
          })
        } else {
          await tx.player.upsert({
            where: { fbgId: row.playerId },
            update: { positionalTier: row.tier || null },
            create: {
              fbgId: row.playerId,
              name: row.playerName || row.playerId,
              positionalTier: row.tier || null,
            },
          })
        }

        saved++
      }

      // Evict stale overall data for players absent from this import so stale
      // ranks and tiers don't pollute ordering and tier dividers in the dashboard.
      if (source === "fbg" && position === "overall" && importedFbgIds.length > 0) {
        await tx.player.updateMany({
          where: {
            fbgId: { notIn: importedFbgIds },
            overallRank: { not: null },
          },
          data: { overallRank: null, overallTier: null },
        })
      }

      return { importId, saved }
    },
    { timeout: 60000 }
  )
}
