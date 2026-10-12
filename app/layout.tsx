import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'Family Expenses',
  description: 'Private family expense tracker',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Expenses',
  },
}

export const viewport: Viewport = {
  themeColor: '#10121D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Draw under the iOS status bar (statusBarStyle is black-translucent);
  // sticky headers and BottomNav pad themselves with the safe-area insets.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-base text-ink min-h-screen">
        <SessionProvider>
          {children}
          {/* Lives in the layout so it stays put (no flicker) while pages load. */}
          <BottomNav />
        </SessionProvider>
      </body>
    </html>
  )
}
