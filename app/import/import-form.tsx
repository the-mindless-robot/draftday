"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react"
import type { FBGPosition } from "@/lib/parsers/fbg"

type ParsedResult = {
  rows: Record<string, string>[]
  count: number
  totalFound: number
}

type SaveResult = {
  importId: string
  saved: number
}

type ImportRecord = {
  id: string
  source: string
  position: string
  season: number
  rowCount: number
  importedAt: string
}

const FBG_POSITIONS: { value: FBGPosition; label: string }[] = [
  { value: "overall", label: "Overall" },
  { value: "QB", label: "QB" },
  { value: "RB", label: "RB" },
  { value: "WR", label: "WR" },
  { value: "TE", label: "TE" },
  { value: "FLEX", label: "FLEX" },
  { value: "PK", label: "PK" },
  { value: "TD", label: "TD" },
]

function ToggleGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "border px-2.5 py-1 text-xs transition-colors",
              value === opt.value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ImportForm() {
  const [url, setUrl] = useState("")
  const [html, setHtml] = useState("")
  const [type, setType] = useState<"fbg" | "espn">("fbg")
  const [position, setPosition] = useState<FBGPosition>("overall")
  const [budget, setBudget] = useState<200 | 250>(250)
  const [season, setSeason] = useState(2026)
  const [showHtml, setShowHtml] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [espnFile, setEspnFile] = useState<File | null>(null)

  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<ParsedResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [history, setHistory] = useState<ImportRecord[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchHistory() {
    const res = await fetch("/api/import/history")
    if (res.ok) setHistory(await res.json())
  }

  useEffect(() => {
    fetch("/api/import/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setHistory(data) })
  }, [])

  async function handleParse(e: React.SyntheticEvent) {
    e.preventDefault()
    setParsing(true)
    setParseError(null)
    setResult(null)
    setSaveResult(null)
    setSaveError(null)

    try {
      let res: Response
      if (type === "espn" && espnFile) {
        const formData = new FormData()
        formData.append("file", espnFile)
        res = await fetch("/api/import", { method: "POST", body: formData })
      } else {
        res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url || undefined,
            html: html || undefined,
            type,
            position: type === "fbg" ? position : undefined,
          }),
        })
      }
      const data = await res.json()
      if (!res.ok) setParseError(data.error ?? "Something went wrong.")
      else setResult(data)
    } catch {
      setParseError("Network error. Please try again.")
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    setSaveError(null)
    setSaveResult(null)

    try {
      const res = await fetch("/api/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: result.rows,
          source: type,
          position: type === "fbg" ? position : "overall",
          budget,
          season,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error ?? "Save failed.")
      } else {
        setSaveResult(data)
        fetchHistory()
      }
    } catch {
      setSaveError("Network error.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/import/${id}`, { method: "DELETE" })
      if (res.ok) setHistory((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const columns = result?.rows[0] ? Object.keys(result.rows[0]) : []

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-sm font-medium">Data Import</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Parse and save player rankings to the database
        </p>
      </div>

      <form onSubmit={handleParse} className="flex flex-col gap-4">
        {/* Source */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Source</Label>
          <div className="flex gap-4">
            {(["fbg", "espn"] as const).map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <input
                  type="radio"
                  name="type"
                  value={opt}
                  checked={type === opt}
                  onChange={() => setType(opt)}
                  className="accent-primary"
                />
                <span className="text-xs font-medium tracking-wide uppercase">
                  {opt === "fbg" ? "Football Guys" : "ESPN"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* FBG-specific selectors */}
        {type === "fbg" && (
          <>
            <ToggleGroup
              label="Position"
              options={FBG_POSITIONS}
              value={position}
              onChange={setPosition}
            />
            {position !== "overall" && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Position mode — extracts tier and rank only.
              </p>
            )}
            <ToggleGroup
              label="Budget"
              options={[
                { value: 250 as const, label: "$250" },
                { value: 200 as const, label: "$200" },
              ]}
              value={budget}
              onChange={setBudget}
            />
          </>
        )}

        {/* ESPN-specific: PDF upload */}
        {type === "espn" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="espn-pdf" className="text-xs">
              Rankings PDF
            </Label>
            <input
              id="espn-pdf"
              type="file"
              accept=".pdf"
              onChange={(e) => setEspnFile(e.target.files?.[0] ?? null)}
              className="text-xs text-muted-foreground file:mr-3 file:border file:border-border file:bg-transparent file:px-2.5 file:py-1 file:text-xs file:text-foreground file:transition-colors hover:file:border-foreground/50"
            />
            <p className="text-xs text-muted-foreground">
              Upload the ESPN auction values PDF.
            </p>
          </div>
        )}

        {/* Season */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="season" className="text-xs">
            Season
          </Label>
          <Input
            id="season"
            type="number"
            value={season}
            onChange={(e) => setSeason(parseInt(e.target.value) || 2026)}
            className="w-24"
          />
        </div>

        {/* FBG: URL + HTML paste */}
        {type === "fbg" && (
          <>
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
                For login-protected pages, paste the HTML below instead.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowHtml((v) => !v)}
                className="flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {showHtml ? (
                  <ChevronUpIcon className="size-3" />
                ) : (
                  <ChevronDownIcon className="size-3" />
                )}
                {showHtml ? "Hide" : "Paste page HTML (for login-protected pages)"}
              </button>
              {showHtml && (
                <textarea
                  placeholder="In Chrome: right-click → Inspect → right-click <html> → Copy → Copy outerHTML"
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-none border border-input bg-transparent px-2.5 py-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
                />
              )}
            </div>
          </>
        )}

        <Button
          type="submit"
          disabled={parsing || (type === "espn" ? !espnFile : !url && !html)}
          className="w-fit"
        >
          {parsing && <Loader2Icon className="animate-spin" />}
          {parsing ? "Parsing..." : "Parse Table"}
        </Button>
      </form>

      {/* Parse error */}
      {parseError && (
        <div className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {parseError}
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
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {showJson ? "Show table" : "Show JSON"}
            </button>
          </div>

          {showJson ? (
            <pre className="max-h-100 overflow-auto rounded-none border border-border bg-muted/50 p-3 font-mono text-xs">
              {JSON.stringify(result.rows, null, 2)}
            </pre>
          ) : (
            <div className="max-h-100 overflow-auto border border-border">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="border-b border-border px-2.5 py-1.5 text-left font-medium whitespace-nowrap"
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
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-2.5 py-1.5 whitespace-nowrap"
                        >
                          {row[col] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={saving || !!saveResult}
            >
              {saving && <Loader2Icon className="animate-spin" />}
              {saving ? "Saving..." : saveResult ? "Saved" : "Save to Database"}
            </Button>
            {saveResult && (
              <span className="text-xs text-muted-foreground">
                {saveResult.saved} rows saved &middot; import{" "}
                <span className="font-mono">
                  {saveResult.importId.slice(0, 8)}
                </span>
              </span>
            )}
            {saveError && (
              <span className="text-xs text-destructive">{saveError}</span>
            )}
          </div>
        </div>
      )}

      {/* Import history */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium">Import History</h2>
          <div className="border border-border">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted">
                <tr>
                  {["Source", "Position", "Season", "Rows", "Imported", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="border-b border-border px-2.5 py-1.5 text-left font-medium"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-2.5 py-1.5 uppercase">{record.source}</td>
                    <td className="px-2.5 py-1.5 uppercase">
                      {record.position}
                    </td>
                    <td className="px-2.5 py-1.5">{record.season}</td>
                    <td className="px-2.5 py-1.5">{record.rowCount}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">
                      {new Date(record.importedAt).toLocaleString()}
                    </td>
                    <td className="px-2.5 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                        title="Delete import"
                      >
                        {deletingId === record.id ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-3" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
