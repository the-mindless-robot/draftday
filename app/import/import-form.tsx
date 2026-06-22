"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDownIcon, ChevronUpIcon, Loader2Icon } from "lucide-react"

type ParsedResult = {
  rows: Record<string, string>[]
  count: number
  totalFound: number
}

export function ImportForm() {
  const [url, setUrl] = useState("")
  const [html, setHtml] = useState("")
  const [type, setType] = useState<"fbg" | "espn">("fbg")
  const [showHtml, setShowHtml] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url || undefined, html: html || undefined, type }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
      } else {
        setResult(data)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const columns = result?.rows[0] ? Object.keys(result.rows[0]) : []

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl w-full">
      <div>
        <h1 className="text-sm font-medium">Data Import</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Parse a player table into structured data
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Source type */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Source</Label>
          <div className="flex gap-4">
            {(["fbg", "espn"] as const).map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="radio"
                  name="type"
                  value={opt}
                  checked={type === opt}
                  onChange={() => setType(opt)}
                  className="accent-primary"
                />
                <span className="text-xs uppercase tracking-wide font-medium">
                  {opt === "fbg" ? "Football Guys" : "ESPN"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* URL input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="url" className="text-xs">
            Page URL
          </Label>
          <Input
            id="url"
            type="url"
            placeholder="https://www.footballguys.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Works for public pages. For login-protected pages, paste the HTML below.
          </p>
        </div>

        {/* HTML paste toggle */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setShowHtml((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit transition-colors"
          >
            {showHtml ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
            {showHtml ? "Hide" : "Paste page HTML (for login-protected pages)"}
          </button>

          {showHtml && (
            <textarea
              placeholder="Paste the full page HTML here (Ctrl+U in your browser, then Ctrl+A, Ctrl+C)"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={8}
              className="w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 resize-y dark:bg-input/30"
            />
          )}
        </div>

        <Button type="submit" disabled={loading || (!url && !html)} className="w-fit">
          {loading && <Loader2Icon className="animate-spin" />}
          {loading ? "Parsing..." : "Parse Table"}
        </Button>
      </form>

      {/* Error */}
      {error && (
        <div className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {result.totalFound > result.count
                ? `Showing ${result.count} of ${result.totalFound} rows (capped at 300)`
                : `${result.count} rows`}{" "}
              &middot; {columns.length} columns
            </span>
            <button
              type="button"
              onClick={() => setShowJson((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showJson ? "Show table" : "Show JSON"}
            </button>
          </div>

          {showJson ? (
            <pre className="overflow-auto max-h-[500px] rounded-none border border-border bg-muted/50 p-3 text-xs font-mono">
              {JSON.stringify(result.rows, null, 2)}
            </pre>
          ) : (
            <div className="overflow-auto max-h-[500px] border border-border">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-2.5 py-1.5 text-left font-medium border-b border-border whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      {columns.map((col) => (
                        <td key={col} className="px-2.5 py-1.5 whitespace-nowrap">
                          {row[col] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
