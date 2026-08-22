import { EventEmitter } from "events"

declare global {
  // eslint-disable-next-line no-var
  var __pickEmitter: EventEmitter | undefined
}

// Singleton so hot-reload in dev doesn't create duplicate emitters
const pickEmitter: EventEmitter =
  globalThis.__pickEmitter ?? (globalThis.__pickEmitter = new EventEmitter())

pickEmitter.setMaxListeners(50)

export default pickEmitter
