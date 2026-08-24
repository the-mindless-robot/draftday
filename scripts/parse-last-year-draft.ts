import * as fs from "fs"
import * as path from "path"
import * as cheerio from "cheerio"

const html = fs.readFileSync(
  path.resolve(".data/last-years-data.html"),
  "utf-8"
)

const $ = cheerio.load(html)

type DraftEntry = {
  playerName: string
  nflTeam: string
  pos: string
  salary: number
  fantasyTeam: string
}

const entries: DraftEntry[] = []

$(".draftRecapTable").each((_i, teamBlock) => {
  const fantasyTeam = $(teamBlock).find("span.teamName").first().text().trim()

  $(teamBlock)
    .find("tbody tr")
    .each((_j, row) => {
      const playerName = $(row).find("a.AnchorLink").first().text().trim()
      const nflTeam = $(row)
        .find("span.fw-normal")
        .first()
        .text()
        .replace(",", "")
        .trim()
      const pos = $(row).find("span.fw-medium").first().text().trim()
      const salaryText = $(row).find("span.fr").first().text().trim()
      const salary = parseInt(salaryText.replace("$", ""), 10)

      if (!playerName || isNaN(salary)) return

      entries.push({ playerName, nflTeam, pos, salary, fantasyTeam })
    })
})

const outPath = path.resolve(".data/last-year-salaries.json")
fs.writeFileSync(outPath, JSON.stringify(entries, null, 2))

console.log(`Parsed ${entries.length} picks → ${outPath}`)
