export { auth as middleware } from '@/lib/auth'

export const config = {
  // Everything except the login page, Auth.js routes, Next internals and
  // static files in public/ (icons, favicon, manifest, service worker) —
  // those must load before sign-in.
  matcher: ['/((?!login|api/auth|_next/static|_next/image|.*\\.(?:png|ico|svg|json|js|txt|webmanifest)$).*)'],
}
