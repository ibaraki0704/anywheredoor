'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Welcome, {session.user?.name || session.user?.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/login"
        className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Sign up
      </Link>
    </div>
  )
}