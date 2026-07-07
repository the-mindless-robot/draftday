const SUFFIX = /\s+(Jr\.?|Sr\.?|II|III|IV|V)$/i

export function fbgPlayerUrl(name: string, fbgId: string): string {
  const namePath = name
    .replace(SUFFIX, "")
    .trim()
    .replace(/'/g, "%26apos%3B")
    .replace(/ /g, "+")
  return `https://www.footballguys.com/player/${namePath}/${fbgId}`
}
