import { NextRequest, NextResponse } from "next/server"
import { parseFBG, type FBGPosition } from "@/lib/parsers/fbg"
import { parseESPN } from "@/lib/parsers/espn"

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? ""
  const ROW_CAP = 300

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const allRows = await parseESPN(new Uint8Array(arrayBuffer))

      if (allRows.length === 0) {
        return NextResponse.json(
          { error: "No rankings found in the PDF." },
          { status: 422 }
        )
      }

      const rows = allRows.slice(0, ROW_CAP)
      return NextResponse.json({ rows, count: rows.length, totalFound: allRows.length })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to parse PDF."
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const body = await req.json()
  const { url, html, type, position } = body as {
    url?: string
    html?: string
    type: "fbg" | "espn"
    position?: FBGPosition
  }

  let rawHtml = html

  if (!rawHtml && url) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      })
      if (!res.ok) {
        return NextResponse.json(
          {
            error: `Fetch failed (${res.status}). If the page requires a login, paste the page HTML instead.`,
          },
          { status: 400 }
        )
      }
      rawHtml = await res.text()
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not fetch the URL. For login-protected pages, paste the page HTML instead.",
        },
        { status: 400 }
      )
    }
  }

  if (!rawHtml) {
    return NextResponse.json(
      { error: "Provide a URL or paste the page HTML." },
      { status: 400 }
    )
  }

  try {
    const allRows = parseFBG(rawHtml, position ?? "overall")

    if (allRows.length === 0) {
      return NextResponse.json(
        { error: "No table rows found. Try pasting the full page HTML." },
        { status: 422 }
      )
    }

    const validRows = allRows.filter((r) => r.playerId)
    const rows = validRows.slice(0, ROW_CAP)
    return NextResponse.json({
      rows,
      count: rows.length,
      totalFound: allRows.length,
      skipped: allRows.length - validRows.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to parse table from HTML."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
