import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MamaVege HR',
  description: 'MamaVege HR Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
