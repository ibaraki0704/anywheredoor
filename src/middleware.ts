import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Paths that require authentication
  const protectedPaths = ['/profile', '/upload']
  
  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  // If it's a protected path and user is not authenticated, redirect to login
  if (isProtectedPath && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access login/register, redirect to home
  if (req.auth && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}