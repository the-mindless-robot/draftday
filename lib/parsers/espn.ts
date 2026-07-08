import pdfParse from "pdf-parse"

const entryRegex =
  /(\d{1,3})\.\s*\(([A-Z]+)(\d+)\)\s+(.+?),\s+([A-Z]{2,3}|FA)\s+\$(\d+)/g

export async function parseESPN(buffer: Uint8Array) {
  const data = await pdfParse(Buffer.from(buffer))

  const rankingsByRank = new Map()
  let match

  while ((match = entryRegex.exec(data.text)) !== null) {
    const [_fullMatch, rank, position, positionalRank, name, team, salary] =
      match

    const rankNum = Number(rank)

    // Avoid duplicate footer/example rows.
    if (rankingsByRank.has(rankNum)) {
      continue
    }

    rankingsByRank.set(rankNum, {
      rank: rankNum,
      positional_rank: Number(positionalRank),
      name: name.replace(/\s+/g, " ").trim(),
      position,
      team,
      salary: Number(salary),
    })
  }

  return [...rankingsByRank.values()].sort((a, b) => a.rank - b.rank)
}
