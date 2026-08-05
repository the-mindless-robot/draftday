import * as pdfjsLib from "pdfjs-dist"
import type { TextItem } from "pdfjs-dist/types/src/display/api"

// No worker thread needed in Node.js
pdfjsLib.GlobalWorkerOptions.workerSrc = ""

const entryRegex =
  /(\d{1,3})\.\s*\(([A-Z]+)(\d+)\)\s*(.+?),\s*([A-Z]{2,4})\$(\d+)/g

export async function parseESPN(buffer: Uint8Array) {
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise

  // columns[0..3] accumulate text from all pages
  const columns: string[] = ["", "", "", ""]

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const columnWidth = viewport.width / 4

    const content = await page.getTextContent()
    const items = (content.items as TextItem[])
      .filter((item) => item.str.trim())
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        col: Math.min(Math.floor(item.transform[4] / columnWidth), 3),
      }))

    // Build text per column for this page
    for (let c = 0; c < 4; c++) {
      const colItems = items
        .filter((item) => item.col === c)
        .sort((a, b) => b.y - a.y || a.x - b.x)

      // Group items on the same line (y within ±2pt)
      const lines: string[] = []
      let lineItems: Array<{ text: string; x: number }> = []
      let lastY = Infinity

      for (const item of colItems) {
        if (Math.abs(item.y - lastY) > 2 && lineItems.length > 0) {
          lineItems.sort((a, b) => a.x - b.x)
          lines.push(lineItems.map((i) => i.text).join(""))
          lineItems = []
        }
        lineItems.push({ text: item.text, x: item.x })
        lastY = item.y
      }
      if (lineItems.length > 0) {
        lineItems.sort((a, b) => a.x - b.x)
        lines.push(lineItems.map((i) => i.text).join(""))
      }

      columns[c] += lines.join("\n") + "\n"
    }
  }

  const rankingsByRank = new Map()

  columns.forEach((columnText, colIdx) => {
    entryRegex.lastIndex = 0
    let match

    while ((match = entryRegex.exec(columnText)) !== null) {
      const [, rank, position, positionalRank, name, team, salaryDigits] = match
      const rankNum = Number(rank)

      if (rankingsByRank.has(rankNum)) continue

      // Column 0 carries 2-digit salaries ($40–79); columns 1-3 carry 1-digit ($0–9)
      const salaryLen = colIdx === 0 ? 2 : 1
      const salary = Number(salaryDigits.slice(0, salaryLen))

      rankingsByRank.set(rankNum, {
        rank: rankNum,
        positional_rank: Number(positionalRank),
        name: name.replace(/\s+/g, " ").trim(),
        position,
        team,
        salary,
      })
    }
  })

  return {
    rows: [...rankingsByRank.values()].sort((a, b) => a.rank - b.rank),
    rawText: columns.join("\n\n--- COLUMN BREAK ---\n\n"),
  }
}
