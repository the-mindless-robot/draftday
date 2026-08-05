import pdfParse from "pdf-parse"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPage(pageData: any): Promise<string> {
  const content = await pageData.getTextContent()
  let text = ""
  let lastItem: any = null

  for (const item of content.items) {
    if (!item.str) continue
    if (lastItem !== null) {
      const dy = item.transform[5] - lastItem.transform[5]
      if (Math.abs(dy) > 2) {
        text += "\n"
      } else {
        const lastEndX =
          lastItem.transform[4] +
          (typeof lastItem.width === "number" ? lastItem.width : 0)
        if (item.transform[4] > lastEndX + 1) {
          text += " "
        }
      }
    }
    text += item.str
    lastItem = item
  }
  return text + "\n\n"
}

export async function parseESPN(buffer: Uint8Array) {
  const data = await pdfParse(Buffer.from(buffer), { pagerender: renderPage })

  const entryRegex =
    /(\d{1,3})\.\s*\(([A-Z]+)(\d+)\)\s*(.+?),\s*([A-Z]{2,4}|FA)\s*\$(\d+)/g

  const rankingsByRank = new Map()
  let match

  while ((match = entryRegex.exec(data.text)) !== null) {
    const [_fullMatch, rank, position, positionalRank, name, team, salaryDigits] = match

    const rankNum = Number(rank)
    if (rankingsByRank.has(rankNum)) continue

    rankingsByRank.set(rankNum, {
      rank: rankNum,
      positional_rank: Number(positionalRank),
      name: name.replace(/\s+/g, " ").trim(),
      position,
      team,
      salary: Number(salaryDigits) || 0,
    })
  }

  return {
    rows: [...rankingsByRank.values()].sort((a, b) => a.rank - b.rank),
    rawText: data.text,
  }
}
