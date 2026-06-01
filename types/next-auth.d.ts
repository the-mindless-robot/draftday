import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      roles: string[]
    } & DefaultSession["user"]
  }

  interface User {
    roles: string[]
  }
}
