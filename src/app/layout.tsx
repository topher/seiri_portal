import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Seiri Studios - Client Portal',
  description: 'Professional workspace management and client collaboration platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <main>{children}</main>
      </body>
    </html>
  )
}