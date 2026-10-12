import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const allowedEmails = (process.env.ALLOWED_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

const isAllowed = (email?: string | null) => !!email && allowedEmails.includes(email.toLowerCase())

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      return isAllowed(user.email)
    },
    // Re-checked on every session read, so removing someone from
    // ALLOWED_EMAILS revokes their existing session too — not just new
    // sign-ins. Returning null clears the session cookie.
    jwt({ token }) {
      return isAllowed(token.email) ? token : null
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    // Used by middleware: without it Auth.js lets every request through.
    authorized({ auth }) {
      return !!auth?.user
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
})
