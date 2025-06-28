import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  // For now, we'll use JWT sessions instead of database sessions
  // adapter: PostgresAdapter(pool),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user by email
          const result = await pool.query(
            'SELECT id, email, password_hash, username, display_name, avatar_url FROM users WHERE email = $1',
            [credentials.email]
          )

          const user = result.rows[0]
          if (!user) {
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          )

          if (!isPasswordValid) {
            return null
          }

          // Return user object that will be stored in the session
          return {
            id: user.id,
            email: user.email,
            name: user.display_name || user.username,
            image: user.avatar_url,
          }
        } catch (error) {
          console.error('Error during authentication:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    signUp: "/register",
  },
  debug: process.env.NODE_ENV === "development",
})