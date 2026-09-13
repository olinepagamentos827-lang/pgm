import { BrandMark } from "@/components/brand-mark"

export function SiteFooter() {
  return (
    <footer className="w-full bg-white px-3.5 sm:px-0 select-none">
      
      {/* Contêiner da faixa cinza real */}
      <div 
        className="
          mx-auto 
          max-w-[1440px] 
          border-t 
          border-mei-panel-border 
          bg-[#E1DCDD]
          px-5 
          py-1
          sm:px-7
          flex 
          w-full 
          items-start 
          justify-between
        "
      >
       
        <span className="text-[13px] font-bold text-[#467454] mt-[4px] font-sans">
          Versão: 3.18.0
        </span>

        <div className="flex items-start">
          <img 
            src={`${process.env.__NEXT_ROUTER_BASEPATH || ''}/images/logo-simples.png`} 
            alt="Simples" 
            className="h-[50px] w-auto object-contain" 
          />
        </div>
      </div>

    </footer>
  )
}
