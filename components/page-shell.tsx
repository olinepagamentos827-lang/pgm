'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { CnpjBar } from '@/components/cnpj-bar'
import { MainNav } from '@/components/main-nav'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { useMei } from '@/lib/mei-context'

export function PageShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isReady } = useMei()

  useEffect(() => {
    if (!isReady) router.replace('/')
  }, [isReady, router])

  if (!isReady) return null

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader internal />

<MainNav />

{/* Pequena fresta branca entre MainNav e CNPJ */}
<div className="h-[0.8px] w-full bg-white" />

<CnpjBar />

      <main className="w-full flex-1 py-4 px-3.5 sm:px-0">
        <div className="mx-auto w-full max-w-[1440px]">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}