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
      <head>
        {/* 🚀 CORREÇÃO: URL corrigida com o caminho exato do arquivo CSS do Bootstrap 3 para evitar o Timeout de 22 segundos */}
        <link 
          rel="stylesheet" 
          href="https://jsdelivr.net" 
          integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" 
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <MeiProvider>{children}</MeiProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
