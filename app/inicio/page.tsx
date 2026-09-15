import React from 'react'
import { PageShell } from '@/components/page-shell'

function B({ children }: { children: React.ReactNode }) {
  return <span className="text-mei-link">{children}</span>
}

export default function InicioPage() {
  return (
    <PageShell>
  <div className="w-full rounded-[3px] border border-[#cfcfcf] bg-[#eeeeee] py-6 px-6 shadow-inner">
    <div
      className="
        w-full
        rounded-[3px]
        border
        border-[#ededed]
        bg-white
        px-4
        py-3
        shadow-[0_12px_22px_rgba(0,0,0,0.22)]
        sm:px-8
      "
    >
    <div className="w-full bg-white space-y-2 text-center text-[14px] leading-[1.25] text-[#333333]">
      <p>
        A contagem da carência (quantidade de contribuições necessárias para
        ter direito aos benefícios previdenciários) inicia-se a partir do{' '}
        <strong className="font-bold">
          PRIMEIRO PAGAMENTO EM DIA
        </strong>
        .
      </p>

      <p>
        O MEI, mesmo sem faturamento, deve pagar mensalmente o{' '}
        DAS (Guia de pagamento).
      </p>

      <p>
        Caso o DAS não tenha sido pago até a data de vencimento, o{' '}
        MEI deve emitir e pagar o novo DAS (Guia de Pagamento) com
        acréscimos legais (multa e juros).
      </p>

      <p>
        Caso tenha dúvidas sobre o PGMEI, clique em &quot;Ajuda&quot;.
      </p>
    </div>
  </div>
</div>
    </PageShell>
  )
}
