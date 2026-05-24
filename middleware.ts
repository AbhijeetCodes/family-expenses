export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*).*)'],
}
