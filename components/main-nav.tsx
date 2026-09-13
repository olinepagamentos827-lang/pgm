'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useMei } from '@/lib/mei-context'

export function MainNav() {
  const router = useRouter()
  const { reset } = useMei()

  const [openMenuMobile, setOpenMenuMobile] = useState(false)
  const [openConsulta, setOpenConsulta] = useState(false)

  const consultaRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        consultaRef.current &&
        !consultaRef.current.contains(e.target as Node)
      ) {
        setOpenConsulta(false)
      }
    }

    document.addEventListener('mousedown', onClick)

    return () => {
      document.removeEventListener('mousedown', onClick)
    }
  }, [])

  function handleSair() {
    reset()
    router.push('/')
  }

  const glyphStyle = {
    color: '#666666',
    fontSize: '14px',
  }

  return (
    <div className="w-full bg-white px-3.5 sm:px-0">
      <div className="mx-auto w-full max-w-[1440px]">
        {/* Linha branca entre header e navegação */}
        <div className="h-[1px] w-full bg-white" />

        {/* NAV */}
        <nav className="relative w-full rounded-sm border border-mei-panel-border bg-[#e2f0d9] sm:bg-mei-nav">
          {/* MENU MOBILE */}
          <div className="flex w-full justify-end px-4 py-1.5 sm:hidden">
            <button
              type="button"
              onClick={() => setOpenMenuMobile((v) => !v)}
              aria-label="Abrir menu"
              className={`
                flex
                h-[36px]
                w-[48px]
                flex-col
                items-center
                justify-center
                gap-[5px]
                rounded-[4px]
                border
                border-[#cfcfcf]
                p-0
                shadow-none
                cursor-pointer
                transition-colors
                ${
                  openMenuMobile
                    ? 'bg-[#e5e5e5]'
                    : 'bg-transparent'
                }
              `}
            >
              <span className="block h-[2px] w-[23px] bg-[#777]" />
              <span className="block h-[2px] w-[23px] bg-[#777]" />
              <span className="block h-[2px] w-[23px] bg-[#777]" />
            </button>
          </div>

          {/* CONTAINER DOS LINKS */}
          <div
  className={`
    ${openMenuMobile ? 'flex' : 'hidden'}
    w-full
    flex-col
    items-stretch
    justify-between
    px-2
    pb-4
    text-mei-nav-text

    sm:flex
    sm:min-h-[52px]
    sm:flex-row
    sm:items-center
    sm:px-4
    sm:pb-0
  `}
>
            {/* ESQUERDA */}
            <ul className="m-0 flex w-full list-none flex-col items-stretch p-0 sm:w-auto sm:flex-row sm:items-center">
              {/* INÍCIO */}
              <li className="border-b border-b-0 sm:border-b-0">
                <Link
                  href="/inicio"
                  className="
                    flex
                    items-center
                    gap-1.5
                    px-4
                    py-3
                    text-[15px]
                    leading-none
                    text-current
                    no-underline
                    transition-colors
                    hover:text-[#333]
                  "
                  onClick={() => setOpenMenuMobile(false)}
                >
                  <span
                    className="glyphicon glyphicon-home relative top-[1px] leading-none"
                    style={glyphStyle}
                    aria-hidden="true"
                  />

                  <span className="leading-none">
                    Início
                  </span>
                </Link>
              </li>

              {/* EMITIR GUIA DAS */}
              <li className="border-b-0">
                <Link
                  href="/emitir"
                  className="
                    flex
                    items-center
                    gap-1.5
                    px-4
                    py-3
                    text-[15px]
                    leading-none
                    text-current
                    no-underline
                    transition-colors
                    hover:text-[#333]
                  "
                  onClick={() => setOpenMenuMobile(false)}
                >
                  <span
                    className="glyphicon glyphicon-check relative top-[1px] leading-none"
                    style={glyphStyle}
                    aria-hidden="true"
                  />

                  <span className="leading-none">
                    Emitir Guia de Pagamento (DAS)
                  </span>
                </Link>
              </li>

              {/* CONSULTA EXTRATO / PENDÊNCIAS */}
              <li
                ref={consultaRef}
                className={`
                  relative
                  border-b
                  border-b-0
                  sm:border-b-0

                  ${
                    openConsulta && openMenuMobile
                      ? '-mx-2'
                      : ''
                  }
                `}
              >
                <button
                  type="button"
                  onClick={() => setOpenConsulta((v) => !v)}
                  aria-expanded={openConsulta}
                  className={`
                    flex
                    w-full
                    items-center
                    justify-start
                    gap-1.5
                    border-0
                    px-4
                    py-3
                    text-left
                    text-[15px]
					cursor-pointer
                    leading-none
                    transition-colors
                    focus:outline-none
                    sm:justify-start

                    ${
  openConsulta
    ? `
      bg-[linear-gradient(to_bottom,#eeeeee_0%,#e3e3e3_48%,#d4d4d4_100%)]
      text-[#555]
      shadow-[inset_0_2px_5px_rgba(0,0,0,0.13)]
      sm:min-h-[52px]
    `
    : 'hover:text-[#333]'
}

                    ${
                      openConsulta && !openMenuMobile
                        ? `
                          relative
                          z-30
                          -mb-[1px]
                          border
                          border-mei-panel-border
                          border-b-0
                          rounded-t-[3px]
                        `
                        : ''
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5 leading-none">
                    <span
                      className="glyphicon glyphicon-lock relative top-[1px] leading-none"
                      style={glyphStyle}
                      aria-hidden="true"
                    />

                    <span className="leading-none">
                      Consulta Extrato/Pendências
                    </span>

                    <span
                      className="glyphicon glyphicon-chevron-down relative top-[1px] leading-none"
                      style={{
                        ...glyphStyle,
                        fontSize: '10px',
                        opacity: 0.7,
                        marginLeft: '-1px',
                      }}
                      aria-hidden="true"
                    />
                  </span>
                </button>

                               {/* SUBMENU */}
                {openConsulta && (
                  <div
                    className="
                      z-50
                      flex
                      w-full
                      flex-col
                      bg-transparent
                      opacity-50 sm:opacity-100
                      sm:overflow-visible

                      sm:absolute
                      sm:left-0
                      sm:top-full
                      sm:min-w-[240px]
                      sm:rounded-b
                      sm:border
                      sm:border-mei-panel-border
                      sm:bg-white
                      sm:py-0.5
                      sm:shadow-md
                    "
                  >
                    {/* 1. Consulta Extrato */}
                    <div className="group relative w-full !z-50 sm:overflow-visible">
                      <div
                        className="
                          flex
                          items-center
                          gap-1.5
                          px-8
                          py-2.5
                          text-[13px]
                          leading-none
                          text-neutral-400
                          select-none
                          cursor-not-allowed
                          sm:px-3
                          sm:py-2
                          sm:hover:bg-neutral-50
                        "
                      >
                        <span
                          className="glyphicon glyphicon-list-alt relative top-[1px] leading-none"
                          style={glyphStyle}
                          aria-hidden="true"
                        />
                        <span className="leading-none">Consulta Extrato</span>
                      </div>

                      {/* BALÃO DE ACESSO RESTRITO */}
                      <div className="pointer-events-none absolute !z-[9999] hidden w-[260px] rounded-md border border-neutral-200 bg-white p-3 shadow-lg transition-all duration-150 group-hover:sm:block bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2">
                        <div className="border-b border-neutral-100 pb-1.5 text-[14px] font-regular text-neutral-600">
                          Acesso restrito
                        </div>
                        <div className="mt-1.5 text-[14px] font-medium leading-[1.4] text-neutral-600 whitespace-normal text-left">
                          A opção Consulta Extrato/Pendências é habilitada apenas no PGMEI - versão completa, que exige controle de acesso.
                        </div>
                        {/* Setinha apontando para baixo */}
                        <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-[5px] rotate-45 border-r border-b border-neutral-200 bg-white" />
                      </div>
                    </div>

                    {/* 2. Consulta Pendência no Simei */}
                    <div className="group relative w-full !z-50 sm:overflow-visible">
                      <div
                        className="
                          flex
                          items-center
                          gap-1.5
                          px-8
                          py-2.5
                          text-[13px]
                          leading-none
                          text-neutral-400
                          select-none
                          cursor-not-allowed
                          sm:px-3
                          sm:py-2
                          sm:hover:bg-neutral-50
                        "
                      >
                        <span
                          className="glyphicon glyphicon-check relative top-[1px] leading-none"
                          style={glyphStyle}
                          aria-hidden="true"
                        />
                        <span className="leading-none">Consulta Pendência no Simei</span>
                      </div>

                      {/* BALÃO DE ACESSO RESTRITO */}
                      <div className="pointer-events-none absolute !z-[9999] hidden w-[260px] rounded-md border border-neutral-200 bg-white p-3 shadow-lg transition-all duration-150 group-hover:sm:block bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2">
                        <div className="border-b border-neutral-100 pb-1.5 text-[14px] font-regular text-neutral-600">
                          Acesso restrito
                        </div>
                        <div className="mt-1.5 text-[14px] font-medium leading-[1.4] text-neutral-600 whitespace-normal text-left">
                          A opção Consulta Extrato/Pendências é habilitada apenas no PGMEI - versão completa, que exige controle de acesso.
                        </div>
                        {/* Setinha apontando para baixo */}
                        <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-[5px] rotate-45 border-r border-b border-neutral-200 bg-white" />
                      </div>
                    </div>

                    {/* 3. Consulta DAS Emitidos */}
                    <div className="group relative w-full !z-50 sm:overflow-visible">
                      <div
                        className="
                          flex
                          items-center
                          gap-1.5
                          px-8
                          py-2.5
                          text-[13px]
                          leading-none
                          text-neutral-400
                          select-none
                          cursor-not-allowed
                          sm:px-3
                          sm:py-2
                          sm:hover:bg-neutral-50
                        "
                      >
                        <span
                          className="glyphicon glyphicon-barcode relative top-[1px] leading-none"
                          style={glyphStyle}
                          aria-hidden="true"
                        />
                        <span className="leading-none">Consulta DAS Emitidos</span>
                      </div>

                      {/* BALÃO DE ACESSO RESTRITO */}
                      <div className="pointer-events-none absolute !z-[9999] hidden w-[260px] rounded-sm border border-neutral-200 bg-white p-3 shadow-lg transition-all duration-150 group-hover:sm:block bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2">
                        <div className="border-b border-neutral-100 pb-1.5 text-[14px] font-regular text-neutral-600">
                          Acesso restrito
                        </div>
                        <div className="mt-1.5 text-[14px] font-regular leading-[1.4] text-neutral-600 whitespace-normal text-left">
                          A opção Consulta Extrato/Pendências é habilitada apenas no PGMEI - versão completa, que exige controle de acesso.
                        </div>
                       
                        <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-[5px] rotate-45 border-r border-b border-neutral-200 bg-white" />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            </ul>


            {/* DIREITA */}
            <ul className="m-0 flex w-full list-none flex-col items-stretch p-0 sm:w-auto sm:flex-row sm:items-center">
                            {/* AJUDA */}
              <li className="border-b-0">
                <a
                  href="https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/MANUAL_PGMEI_2018.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    flex
                    items-center
                    gap-1.5
                    px-4
                    py-3
                    text-[15px]
                    leading-none
                    text-current
                    no-underline
                    transition-colors
                    hover:text-[#333]
                  "
                  onClick={() => setOpenMenuMobile(false)}
                >
                  <span
                    className="glyphicon glyphicon-info-sign relative top-[1px] leading-none"
                    style={glyphStyle}
                    aria-hidden="true"
                  />

                  <span className="leading-none">
                    Ajuda
                  </span>
                </a>
              </li>


              {/* SAIR */}
              <li>
                <button
                  type="button"
                  onClick={handleSair}
                  className="
                    flex
                    w-full
                    items-center
                    gap-1.5
                    border-0
                    bg-transparent
                    px-4
                    py-3
                    text-left
                    text-[15px]
                    leading-none
                    transition-colors
                    hover:text-[#333]
                  "
                >
                  <span
                    className="glyphicon glyphicon-log-out relative top-[1px] leading-none"
                    style={glyphStyle}
                    aria-hidden="true"
                  />

                  <span className="leading-none">
                    Sair
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>
  )
}