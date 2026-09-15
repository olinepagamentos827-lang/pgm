"use client"

import React, { useState, useEffect } from 'react'
import { PageShell } from '@/components/page-shell'
import { useMei } from '@/lib/mei-context'
import { formatBRL } from '@/lib/consulta-debitos'

export default function InicioPage() {
  // 1. Puxa os estados e funções reais guardados no contexto da sessão
  const { 
    cnpj, 
    nome, 
    anosDisponiveis, 
    anoSelecionado, 
    periodos, 
    setContribuinte,
    setAnoSelecionado,
    setPeriodos 
  } = useMei()

  // Controla o ano selecionado no elemento <select> da tela (padrão 2023 se houver)
  const [anoLocal, setAnoLocal] = useState<number>(2023)
  const [loading, setLoading] = useState(false)

  // Sincroniza o estado do select caso o contexto já venha com algum ano definido
  useEffect(() => {
    if (anoSelecionado) {
      setAnoLocal(anoSelecionado)
    }
  }, [anoSelecionado])

  // 2. Função de busca acionada pelo botão verde "Ok"
  const handleConsultarAno = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const basePath = process.env.NEXT_PUBLIC_BASEPATH || ""
      const cnpjLimpo = cnpj.replace(/\D/g, "")

      // Dispara a consulta dinamicamente para o ano escolhido pelo usuário no seletor
      const res = await fetch(`${basePath}/api/debitos?cnpj=${cnpjLimpo}&ano=${anoLocal}`)
      const data = await res.json()

      if (res.ok && !data.error) {
        // Atualiza globalmente o contexto para remover o fallback de "baixado" e encher a tabela
        setContribuinte({
          cnpj: cnpj,
          nome: data.nome || "MICROEMPREENDEDOR INDIVIDUAL",
          anosDisponiveis: data.anosDisponiveis || anosDisponiveis,
          anoSelecionado: anoLocal,
          periodos: data.periodos || []
        })
      } else {
        alert(data.error || "Não foi possível resgatar os períodos de apuração deste ano.")
      }
    } catch (err) {
      console.error(err)
      alert("Falha de comunicação: Erro ao conectar ao servidor de consulta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <div className="w-full bg-[#fcfcfc] pb-12 font-sans text-[#333]">
        
        {/* Seletor de Ano-Calendário Idêntico ao PGMEI Oficial */}
        <form onSubmit={handleConsultarAno} className="my-5 flex items-center justify-center gap-2 text-[13px]">
          <span>Informe o Ano-Calendário:</span>
          <select 
            value={anoLocal} 
            onChange={(e) => setAnoLocal(Number(e.target.value))}
            className="rounded border border-[#ccc] bg-white px-2 py-0.5 font-medium outline-none focus:border-[#66afe9]"
          >
            {anosDisponiveis && anosDisponiveis.length > 0 ? (
              anosDisponiveis.map((item) => (
                <option key={item.ano} value={item.ano}>
                  {item.ano} {item.naoOptante ? "- Não optante" : ""}
                </option>
              ))
            ) : (
              [2026, 2025, 2024, 2023, 2022, 2021, 2020].map(a => (
                <option key={a} value={a}>{a}</option>
              ))
            )}
          </select>
          <button 
            type="submit"
            disabled={loading}
            className="rounded border border-[#4cae4c] bg-[#5cb85c] px-3 py-0.5 font-semibold text-white shadow-sm hover:bg-[#449d44] transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? "..." : "Ok"}
          </button>
        </form>

        {/* Tabela / Planilha de Períodos de Apuração */}
        <div className="mx-auto w-full max-w-[1440px] px-3.5 sm:px-0">
          <div className="w-full rounded border border-[#cfcfcf] bg-[#eee] p-4 shadow-inner">
            <div className="w-full rounded border border-[#ededed] bg-white p-3 shadow-md">
              
              <div className="mb-2 text-left text-[12px] font-bold text-neutral-700">
                Selecione o(s) período(s) de apuração:
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-center text-[12px]">
                  <thead>
                    <tr className="bg-gradient-to-b from-[#f9f9f9] to-[#ececec] font-bold text-neutral-700 border border-[#ccc]">
                      <th className="p-2 border-r border-[#ccc] w-10">
                        <input type="checkbox" disabled className="cursor-not-allowed" />
                      </th>
                      <th className="p-2 border-r border-[#ccc] text-left">Período de Apuração</th>
                      <th className="p-2 border-r border-[#ccc]">Apurado</th>
                      <th className="p-2 border-r border-[#ccc]">Benefício INSS</th>
                      <th className="p-2 border-r border-[#ccc] bg-[#f2f2f2]" colSpan={4}>Resumo do DAS a ser gerado
                        <div className="grid grid-cols-4 font-normal text-[11px] pt-1 border-t border-[#ccc] mt-1">
                          <div>Principal</div>
                          <div>Multa</div>
                          <div>Juros</div>
                          <div className="font-bold">Total</div>
                        </div>
                      </th>
                      <th className="p-2 border-r border-[#ccc]">Data de Vencimento</th>
                      <th className="p-2">Data de Acolhimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodos && periodos.length > 0 ? (
                      periodos.map((mes) => (
                        <tr key={mes.id} className="border border-[#ccc] hover:bg-[#f9f9f9] text-neutral-800 odd:bg-white even:bg-[#fcfcfc]">
                          <td className="p-2 border-r border-[#ccc]">
                            <input type="checkbox" defaultChecked={mes.apurado} className="cursor-pointer" />
                          </td>
                          <td className="p-2 border-r border-[#ccc] text-left font-semibold">{mes.rotulo}</td>
                          <td className="p-2 border-r border-[#ccc]">{mes.apurado ? "Sim" : "Não"}</td>
                          <td className="p-2 border-r border-[#ccc]">{mes.beneficioInss ? "Sim" : "Não"}</td>
                          
                          {/* Colunas do bloco de Resumo do DAS */}
                          <td className="p-2 border-r border-[#ccc] bg-[#fff] w-[8%]">{formatBRL(mes.principal)}</td>
                          <td className="p-2 border-r border-[#ccc] bg-[#fff] w-[8%]">{formatBRL(mes.multa)}</td>
                          <td className="p-2 border-r border-[#ccc] bg-[#fff] w-[8%]">{formatBRL(mes.juros)}</td>
                          <td className="p-2 border-r border-[#ccc] bg-[#f9f9f9] w-[10%] font-bold">{formatBRL(mes.total)}</td>
                          
                          <td className="p-2 border-r border-[#ccc] font-medium">{mes.dataVencimento || '-'}</td>
                          <td className="p-2">{mes.dataAcolhimento || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-10 text-center text-gray-400 font-medium bg-white">
                          Nenhum período de apuração carregado para este ano. Selecione o ano no menu acima e clique em &quot;Ok&quot;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bloco Inferior de Ações da Planilha */}
              <div className="mt-4 flex flex-col items-center justify-between border-t border-[#eee] pt-4 sm:flex-row gap-3">
                <div className="text-[12px] text-neutral-600">
                  Informe a data para pagamento do(s) DAS: 
                  <input type="text" defaultValue={new Date().toLocaleDateString('pt-BR')} className="ml-2 rounded border border-[#ccc] px-2 py-0.5 text-center font-bold text-neutral-700 outline-none w-28 bg-[#f5f5f5]" readOnly />
                </div>
                <div className="flex flex-wrap gap-2 text-[12px] font-bold">
                  <button type="button" className="rounded border border-[#ccc] bg-gradient-to-b from-[#fff] to-[#e6e6e6] px-3 py-1 text-neutral-700 shadow-sm hover:bg-[#d4d4d4]">Atualizar Valores</button>
                  <button type="button" className="rounded border border-[#4cae4c] bg-[#5cb85c] px-3 py-1 text-white shadow-sm hover:bg-[#449d44]">Apurar/Gerar DAS</button>
                  <button type="button" className="rounded border border-[#4cae4c] bg-[#5cb85c] px-3 py-1 text-white shadow-sm hover:bg-[#449d44]">Pagar Online</button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Informações Importantes de Rodapé */}
        <div className="mx-auto mt-6 w-full max-w-[1440px] px-4 text-[11px] leading-relaxed text-neutral-500 text-left space-y-1">
          <p className="font-bold text-neutral-600">Informações Importantes:</p>
          <p>1. A opção <span className="text-[#337ab7]">“Emitir DAS”</span> gera um documento em formato PDF para pagamento na rede bancária credenciada.</p>
          <p>2. A opção <span className="text-[#337ab7]">“Pagar Online”</span> possibilita realizar o pagamento do documento de arrecadação por meio de débito em conta corrente ou cartão de crédito. No momento, o débito em conta está disponível apenas para usuários do Banco do Brasil com acesso ao Internet Banking.</p>
        </div>

      </div>
    </PageShell>
  )
}
