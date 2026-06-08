import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'
import PwaRegister from '@/components/PwaRegister'

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
})

export const metadata: Metadata = {
  title: 'Flyt — finn billigste strømtid',
  description: 'Se norske strømpriser time for time og finn den billigste tiden å bruke strøm med Flyt.',
  applicationName: 'Flyt',
  appleWebApp: {
    capable: true,
    title: 'Flyt',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#080b11',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className={figtree.variable}>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
