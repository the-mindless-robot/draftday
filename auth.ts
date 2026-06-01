import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const roles = auth?.user?.roles ?? []
      if (nextUrl.pathname.startsWith("/")) {
        return roles.includes("user")
      }
      return !!auth
    },
    async signIn({ profile }) {
      const user = await prisma.user.findUnique({
        where: { email: profile?.email ?? "" },
      })
      return !!user
    },
    async session({ session, user }) {
      session.user.roles = user.roles
      return session
    },
  },
})
