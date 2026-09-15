'use client'

import { useMemo, useState, useEffect } from 'react'
import useSWR from 'swr'
import { type ConsultaDebitosResponse, formatBRL } from '@/lib/consulta-debitos'
import { useMei } from '@/lib/mei-context'
import { PaymentModal, type PagamentoInfo } from '@/components/payment-modal'

// Lista de anos estática mantida conforme o design original do componente
const ANOS = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Falha na consulta')
    return r.json() as Promise<ConsultaDebitosResponse>
  })

export function EmitirGuia() {
  // Puxa as propriedades corretas do Context global para sincronizar o app
  const { cnpj, anosDisponiveis, setContribuinte } = useMei()

  const [anoSelect, setAnoSelect] = useState('')
  const [anoConsultado, setAnoConsultado] = useState<number | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [beneficio, setBeneficio] = useState<Set<string>>(new Set())
  const [dataPagamento, setDataPagamento] = useState('31/08/2026')
  const [pagamento, setPagamento] = useState<PagamentoInfo | null>(null)

  // Removido o parâmetro estático de nome da URL para aceitar o resgate dinâmico do back-end
  const key =
    anoConsultado != null
      ? `/api/debitos?cnpj=${encodeURIComponent(cnpj.replace(/\D/g, ""))}&ano=${anoConsultado}`
      : null

  const { data, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  })

  // Sincroniza a resposta de sucesso para atualizar o nome real do MEI na CnpjBar e destravar a planilha
  useEffect(() => {
    if (data && !data.error) {
      setContribuinte({
        cnpj: cnpj,
        nome: data.nome || "MICROEMPREENDEDOR INDIVIDUAL",
        anosDisponiveis: data.anosDisponiveis || anosDisponiveis,
        anoSelecionado: anoConsultado,
        periodos: data.periodos || []
      })
    }
  }, [data, anoConsultado])

  const periodos = data?.periodos ?? []

  const todosApuradosSelecionados = useMemo(() => {
    const apurados = periodos.filter((p) => p.apurado)
    return apurados.length > 0 && apurados.every((p) => selecionados.has(p.id))
  }, [periodos, selecionados])

  const totalSelecionado = useMemo(() => {
    return periodos
      .filter((p) => selecionados.has(p.id))
      .reduce((acc, p) => acc + (p.total ?? 0), 0)
  }, [periodos, selecionados])

  function handleConsultar() {
    if (!anoSelect) return

    // Verifica se o ano selecionado foi marcado como "Não Optante" no Context antes de realizar a consulta
    const anoAlvo = anosDisponiveis?.find(item => item.ano === Number(anoSelect))
    if (anoAlvo && anoAlvo.naoOptante) {
      alert(`O contribuinte não é optante pelo SIMEI no ano-calendário ${anoSelect}.`)
      return
    }

    setSelecionados(new Set())
    setBeneficio(new Set())
    setAnoConsultado(Number(anoSelect))
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodos() {
    if (todosApuradosSelecionados) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(periodos.filter((p) => p.apurado).map((p) => p.id)))
    }
  }

  function toggleBeneficio(id: string) {
    setBeneficio((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function abrirPagamento() {
    const sels = periodos.filter((p) => selecionados.has(p.id))
    if (sels.length === 0) {
      alert('Selecione ao menos um período de apuração.')
      return
    }
    const rotulos = sels.map((p) => p.rotulo).join(', ')
    const vencimento = sels.map((p) => p.dataVencimento).filter(Boolean).slice(-1)[0] ?? '-'
    const numero = `07.08.${anoConsultado}.${Math.floor(1000000 + Math.random() * 8999999)}-${Math.floor(Math.random() * 9)}`

    const digits = cnpj.replace(/\D/g, '')
    const pixCode = `00020101021226880014br.gov.bcb.pix2568pix-qrcode.comercialbrasil/${digits}/${numero}/${totalSelecionado.toFixed(2).replace('.', '')}5925COMERCIAL BRASIL6009SAO PAULO62070503***6304A1B2`

    setPagamento({
      cnpj,
      numero,
      periodoRotulo: rotulos,
      vencimento,
      valorTotal: totalSelecionado,
      pixCode,
    })
  }
                  {/* CORPO DA PLANILHA — RENDERIZAÇÃO DINÂMICA DOS VALORES REAIS */}
                  <tbody className="bg-white">
                    {periodos && periodos.length > 0 ? (
                      periodos.map((p) => (
                        <tr
                          key={p.id}
                          className={`
                            h-[27px]
                            border-b
                            last:border-b-0
                            border-[#dddddd]
                            text-[12px]
                            text-[#333333]
                            transition-colors
                            ${p.apurado && selecionados.has(p.id) ? 'bg-[#fef8e8]' : 'bg-white hover:bg-[#f5f5f5]'}
                          `}
                        >
                          {/* SELETOR INDIVIDUAL DA LINHA */}
                          <td className="px-1 py-0 text-center align-middle">
                            <input
                              type="checkbox"
                              className="h-[13px] w-[13px] cursor-pointer disabled:cursor-not-allowed"
                              disabled={!p.apurado}
                              checked={p.apurado && selecionados.has(p.id)}
                              onChange={() => toggleSelecionado(p.id)}
                            />
                          </td>

                          {/* PERÍODO DE APURAÇÃO (EX: 01/2023) */}
                          <td className="px-2 py-0 text-left align-middle font-bold text-neutral-700">
                            {p.rotulo}
                          </td>

                          {/* FLAG APURADO */}
                          <td className="px-2 py-0 text-center align-middle text-[#666666]">
                            {p.apurado ? "Sim" : "Não"}
                          </td>

                          {/* SELETOR BENEFÍCIO INSS */}
                          <td className="px-2 py-0 text-center align-middle">
                            <input
                              type="checkbox"
                              className="h-[13px] w-[13px] cursor-pointer disabled:cursor-not-allowed"
                              disabled={!p.apurado}
                              checked={p.apurado && beneficio.has(p.id)}
                              onChange={() => toggleBeneficio(p.id)}
                            />
                          </td>

                          {/* RESUMO DOS VALORES MONETÁRIOS DO DAS */}
                          <td className="px-2 py-0 text-right align-middle pr-4 border-r border-[#dddddd]">
                            {(p.principal ?? 0) > 0 ? formatBRL(p.principal) : "-"}
                          </td>
                          <td className="px-2 py-0 text-right align-middle pr-4 border-r border-[#dddddd]">
                            {(p.multa ?? 0) > 0 ? formatBRL(p.multa) : "-"}
                          </td>
                          <td className="px-2 py-0 text-right align-middle pr-4 border-r border-[#dddddd]">
                            {(p.juros ?? 0) > 0 ? formatBRL(p.juros) : "-"}
                          </td>
                          <td className="px-2 py-0 text-right align-middle pr-4 font-bold bg-[#fafafa] border-r border-[#dddddd]">
                            {(p.total ?? 0) > 0 ? formatBRL(p.total) : "-"}
                          </td>

                          {/* VENCIMENTOS */}
                          <td className="px-2 py-0 text-center align-middle border-r border-[#dddddd] font-medium">
                            {p.dataVencimento ?? "-"}
                          </td>
                          <td className="px-2 py-0 text-center align-middle">
                            {p.dataAcolhimento ?? "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      /* RENDERIZAÇÃO SE O ANO VIER SEM DÉBITOS OU ADESÃO AO SIMEI */
                      <tr>
                        <td colSpan={10} className="p-10 text-center text-neutral-400 font-medium bg-white">
                          Nenhum período de apuração carregado para este ano. Selecione outro ano no menu superior.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {/* FAIXA CINZA OFICIAL INFERIOR (DATA E BOTÕES DE AÇÃO) */}
            <div 
              className="
                -mx-4 
                -mb-4 
                mt-6 
                border-t 
                border-[#dcdcdc] 
                bg-[#eeeeee] 
                px-4 
                py-5 
                rounded-b-[4px]
              "
            >
              {/* DATA DE PAGAMENTO */}
              <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-[#333333]">
                <label htmlFor="dataPagamento" className="text-[13px] font-bold text-[#333333]">
                  Informe a data para pagamento do(s) DAS:
                </label>
                <input
                  id="dataPagamento"
                  value={dataPagamento}
                  disabled
                  className="
                    h-[26px]
                    w-36
                    border
                    border-[#c8c8c8]
                    bg-[#ededed]
                    px-2
                    text-center
                    text-[13px]
                    text-[#555555]
                    outline-none
                    cursor-not-allowed
                  "
                />
              </div>

              {/* BOTÕES DE AÇÃO EM TOM VERDE */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled
                  className="
                    h-[30px]
                    rounded-[4px]
                    border
                    border-[#2d672d]
                    bg-[linear-gradient(to_bottom,#4cae4c_0%,#398439_100%)]
                    px-3
                    text-[13px]
                    font-medium
                    text-white
                    opacity-65
                    brightness-95
                    cursor-not-allowed
                  "
                >
                  Atualizar Valores
                </button>

                <button
                  type="button"
                  onClick={abrirPagamento}
                  className="
                    h-[30px]
                    cursor-pointer
                    rounded-[4px]
                    border
                    border-[#2d672d]
                    bg-[linear-gradient(to_bottom,#4cae4c_0%,#398439_100%)]
                    px-4
                    text-[13px]
                    font-medium
                    text-white
                    shadow-[0_1px_2px_rgba(0,0,0,0.2)]
                    hover:brightness-105
                    active:scale-[0.98]
                  "
                >
                  Apurar/Gerar DAS
                </button>

                <button
                  type="button"
                  disabled
                  className="
                    h-[30px]
                    rounded-[4px]
                    border
                    border-[#2d672d]
                    bg-[linear-gradient(to_bottom,#4cae4c_0%,#398439_100%)]
                    px-3
                    text-[13px]
                    font-medium
                    text-white
                    opacity-65
                    brightness-95
                    cursor-not-allowed
                  "
                >
                  Pagar Online
                </button>
              </div>

            </div>
          </div> /* FECHAMENTO DO ÚNICO CARD BRANCO ELEVADO */
        )}

        {/* TEXTO DE INFORMAÇÕES IMPORTANTES — AGORA DE FATO DENTRO DO CONTEÍNER CINZA */}
        {anoConsultado != null && (
          <div className="mt-5 px-6 pb-4 text-[12px] leading-[1.4] text-left">
            <p className="mb-2 font-normal text-[#006699]">
              Informações importantes:
            </p>
            <ol className="ml-6 list-decimal space-y-2 text-[#006699]">
              <li>
                A opção &quot;Emitir DAS&quot; gera um documento em formato PDF para pagamento na rede bancária credenciada.
              </li>
              <li>
                A opção &quot;Pagar Online&quot; possibilita realizar o pagamento do documento de arrecadação por meio do débito em conta corrente ou cartão de crédito. No momento, o débito em conta está disponível apenas para usuários do Banco do Brasil com acesso ao Internet Banking.
              </li>
              <li>
                Ao optar por &quot;Pagar Online&quot; por meio do débito em conta, o comprovante de pagamento pode ser impresso após a confirmação da transação pelo banco. Se escolher cartão de crédito, o comprovante de arrecadação estará disponível até o segundo dia útil após o pagamento. A impressão pode ser feita pelo Portal e-CAC, acessando &quot;Pagamentos e Parcelamentos&quot; &gt; &quot;Consulta de Comprovante de Pagamento - DARF, DAS e DJE&quot;, ou pelo Portal de Serviços da RFB.
              </li>
            </ol>
          </div>
        )}

      </div> {/* FECHAMENTO REAL DO PAINEL EXTERNO CINZA */}

      {/* Modal global de Pagamento Pix */}
      {pagamento && (
        <PaymentModal info={pagamento} onClose={() => setPagamento(null)} />
      )}
    </>
  )
}
