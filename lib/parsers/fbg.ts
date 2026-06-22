import * as cheerio from "cheerio"

export function parseFBG(html: string): Record<string, string>[] {
  const $ = cheerio.load(html)

  const table = $("#rankings-table")
  if (table.length === 0) {
    throw new Error("Could not find #rankings-table. Make sure you copied the full rendered page HTML.")
  }

  // Build headers — the Salary Cap <th> has a <select> inside, so pull from <label>
  const headers: string[] = []
  table.find("thead tr").first().find("th, td").each((_, cell) => {
    const label = $(cell).find("label").text().trim()
    const text = label || $(cell).clone().children().remove().end().text().trim()
    headers.push(text || `col_${headers.length}`)
  })

  const rows: Record<string, string>[] = []
  let currentTier = ""

  table.find("tbody tr").each((_, tr) => {
    const $tr = $(tr)

    // Capture tier label and move on
    if ($tr.hasClass("tier-row")) {
      currentTier = $tr.find("td").first().text().trim()
      return
    }

    // Only process player rows
    if (!$tr.hasClass("player-row")) return

    const row: Record<string, string> = {
      playerId: $tr.attr("data-playerid") ?? "",
      tier: currentTier,
    }

    $tr.find("td").each((i, td) => {
      const $td = $(td)

      // Skip the hidden draft column
      if ($td.hasClass("draft-col")) return

      const key = headers[i] ?? `col_${i}`

      // Player name cell — extract clean name and team separately
      if ($td.hasClass("name")) {
        row[key] = $td.find("a b").text().trim()
        row["Team"] = $td.find(".team-abbr").text().trim()
        return
      }

      // Downside / Upside — bar icons pollute .text(), use span.value instead
      if ($td.hasClass("downside-col") || $td.hasClass("upside-col")) {
        row[key] = $td.find("span.value").text().trim()
        return
      }

      row[key] = $td.text().trim()
    })

    rows.push(row)
  })

  return rows
}
