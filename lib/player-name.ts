const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"])

export function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  let i = parts.length - 1
  while (i > 0 && SUFFIXES.has(parts[i].toLowerCase())) i--
  return parts[i]
}
