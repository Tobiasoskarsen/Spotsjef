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
  title: 'Nær – trygghet for familien',
  description: 'Hjelp noen du er glad i med hverdagen: påminnelser, vær og praktiske beskjeder på en skjerm de forstår – og visshet om at det når frem.',
  applicationName: 'Nær',
  appleWebApp: {
    capable: true,
    title: 'Nær',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#faf7f1',
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
