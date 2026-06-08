import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
})

export const metadata: Metadata = {
  title: 'Spotsjef — finn billigste strømtid',
  description: 'Se norske strømpriser time for time og finn den billigste tiden å bruke strøm.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className={figtree.variable}>
      <body>{children}</body>
    </html>
  )
}
