import { CnpjForm } from '@/components/cnpj-form'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function IndexPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans antialiased">
      
      {/* Envelope do Header: No mobile ganha a calha branca lateral [px-3.5]. No desktop fica limpo. */}
      <div className="w-full bg-white px-3.5 sm:px-0">
        <SiteHeader />
      </div>

      {/* Conteúdo Central */}
      <main className="flex-1 w-full bg-white sm:bg-transparent sm:py-0.5">
        {/* No mobile o fundo é 100% branco para descer a calha sem interrupções */}
        <div className="mx-auto w-full max-w-[1470px] px-3.5 sm:px-4 bg-white sm:bg-transparent pb-6 sm:pb-0">
          
          {/* Contêiner de fundo cinza (#F0F0F0) */}
          {/* 💡 AJUSTADO AQUI: mudado de pt-0 para pt-[2px] para gerar a fresta fina e perfeita no mobile */}
          <div className="w-full bg-transparent flex items-start justify-center pt-[2px] sm:bg-[#F0F0F0] sm:border sm:border-[#E3E3E3] sm:p-5 sm:rounded min-h-[290px] sm:pt-8 sm:pt-13">
            
            {/* O CONTEÎNER CINZA INTERNO DO MOBILE */}
            {/* Mantido w-full para ele esticar de ponta a ponta na calha branca igual à foto */}
            <div className="w-full bg-[#F0F0F0] border border-[#E3E3E3] rounded p-3 pt-6 flex justify-center sm:bg-transparent sm:border-0 sm:p-0 sm:rounded-none">
              
              {/* Painel Central do CNPJ */}
              {/* Apenas o card branco reduzido para max-w-[280px] no mobile. O seu desktop max-w-[450px] continua intocado */}
              <div className="w-full max-w-[280px] sm:max-w-[450px] bg-white border border-[#D4D4D4] rounded-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden sm:-mt-10">
                
                {/* Cabeçalho do Painel com gradiente sutil do cinza original */}
                <div 
                  className="border-b border-[#D4D4D4] px-4 py-2.5"
                  style={{ backgroundImage: "linear-gradient(to bottom, #F9F9F9, #ECECEC)" }}
                >
                  <h1 className="text-[15px] font-regular text-[#333]">
                    Informe o número completo do CNPJ
                  </h1>
                </div>

                {/* Corpo do Formulário */}
                <CnpjForm />
                
              </div>

            </div>
            
          </div>
          
        </div>
      </main>

      {/* Rodapé Adaptado */}
      <SiteFooter />
    </div>
  )
}
