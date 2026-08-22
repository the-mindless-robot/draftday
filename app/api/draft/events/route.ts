import pickEmitter from "@/lib/pick-events"

export const dynamic = "force-dynamic"

export async function GET() {
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      // Keep-alive ping every 15s to prevent connection timeout
      const ping = setInterval(() => send("ping", ""), 15_000)

      const onPick = () => send("pick", "")
      const onNomination = (playerName: string) => send("nomination", playerName)

      pickEmitter.on("pick", onPick)
      pickEmitter.on("nomination", onNomination)

      cleanup = () => {
        clearInterval(ping)
        pickEmitter.off("pick", onPick)
        pickEmitter.off("nomination", onNomination)
      }
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
