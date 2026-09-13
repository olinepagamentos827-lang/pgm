import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Open_Sans } from 'next/font/google'
import { MeiProvider } from '@/lib/mei-context'
import './globals.css'

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pgmei - Programa Gerador DAS do Microempreendedor Individual',
  description:
    'Consulta de débitos e emissão de guias para o Microempreendedor Individual - Simples Nacional.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#74b325',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${openSans.variable} bg-background`}>
      <body className="antialiased">
        <MeiProvider>
          {children}
        </MeiProvider>

        {process.env.NODE_ENV === 'production' && (
          <Analytics />
        )}
      </body>
    </html>
  )
}
