import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: 'Family Expenses',
  description: 'Private family expense tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Expenses',
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-base text-ink min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
