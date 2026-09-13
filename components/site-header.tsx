import { BrandMark } from "@/components/brand-mark"

type SiteHeaderProps = {
  internal?: boolean
}

export function SiteHeader({
  internal = false,
}: SiteHeaderProps) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''

  return (
    <header
      className={`w-full bg-white font-sans select-none ${
        internal ? 'px-3.5 sm:px-0' : ''
      }`}
    >
      <div className="mx-auto w-full max-w-[1440px]">
        
        <div className="h-[2px] w-full bg-[#5cb85c]" />

        {/* 👇 Injetada a classe .bg-fundo-header e removido o atributo style */}
        <div
          className="
            w-full
            border-b
            border-[#D1DFCD]
            bg-cover
            bg-right-top
            bg-no-repeat
            px-6
            pt-5
            pb-4
            sm:px-4
            bg-fundo-header
          "
        >
          <div>
            <div className="relative inline-flex h-[30px] items-center rounded-[3px] bg-[#5cb85c] pl-11 pr-4 shadow-sm">
              <img
                src={`${basePath}/images/logo-1.png`}
                alt="Logo"
                className="absolute left-2.5 top-1/2 h-[32px] w-auto -translate-y-1/2 object-contain"
              />

              <span className="leading-none text-[18px] font-bold uppercase tracking-tight text-white">
                PGMEI
              </span>
            </div>

            <p className="mt-2.5 max-w-[310px] font-sans text-[17.5px] font-medium leading-[1.25] tracking-normal text-[#467454] sm:max-w-none sm:text-[18px]">
              Programa Gerador de DAS do Microempreendedor Individual
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
