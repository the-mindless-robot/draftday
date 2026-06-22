import * as cheerio from "cheerio"

export function parseESPN(html: string): Record<string, string>[] {
  const $ = cheerio.load(html)

  // ESPN typically renders player tables inside .Table__TBODY or similar
  // Fall back to the most column-rich table if ESPN-specific selectors miss
  let bestTable = $("table").first()
  let maxCols = 0

  $("table").each((_, el) => {
    const cols = $(el).find("thead th, thead td").length
    if (cols > maxCols) {
      maxCols = cols
      bestTable = $(el)
    }
  })

  const headers: string[] = []
  bestTable.find("thead tr").first().find("th, td").each((_, cell) => {
    const text = $(cell).text().trim()
    headers.push(text || `col_${headers.length}`)
  })

  if (headers.length === 0) {
    bestTable.find("tr").first().find("th, td").each((_, cell) => {
      const text = $(cell).text().trim()
      headers.push(text || `col_${headers.length}`)
    })
  }

  const rows: Record<string, string>[] = []

  bestTable.find("tbody tr").each((_, tr) => {
    const cells = $(tr).find("td")
    if (cells.length === 0) return

    const row: Record<string, string> = {}
    cells.each((i, td) => {
      const key = headers[i] ?? `col_${i}`
      row[key] = $(td).text().trim()
    })
    rows.push(row)
  })

  return rows
}
