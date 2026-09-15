'use client'

import { useMei } from '@/lib/mei-context'

export function CnpjBar() {
  const { cnpj, nome } = useMei()

  return (
    <div className="w-full bg-white px-3.5 sm:px-0">
      <div className="mx-auto w-full max-w-[1440px]">
        <div
          className="
            w-full
            border
            border-mei-panel-border
            bg-white
            px-4
            sm:px-5
            rounded-sm
          "
        >
          <div
            className="
              flex
              flex-col
              gap-[2px]
              py-[9px]
              text-left
              text-[14px]
              leading-[19px]
              text-neutral-800
              md:flex-row
              md:items-center
              md:gap-0
              md:py-[8px]
              md:text-[13px]
            "
          >
            <div>
              <span className="font-bold">CNPJ:</span>{' '}
              {cnpj || '—'}
            </div>

            <span className="hidden md:inline">&nbsp;&nbsp;&nbsp;&nbsp;</span>

            <div>
              <span className="font-bold">Nome:</span>{' '}
              {nome || 'CARREGANDO...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
