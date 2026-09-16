'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  type ConsultaDebitosResponse,
  formatBRL,
} from '@/lib/consulta-debitos'
import { useMei } from '@/lib/mei-context'
import { PaymentModal, type PagamentoInfo } from '@/components/payment-modal'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const texto = await r.text()

  console.log('[DEBUG FRONT DEBITOS]', texto)

  if (!r.ok) {
    throw new Error('Falha na consulta')
  }

  return JSON.parse(texto) as ConsultaDebitosResponse
}

export function EmitirGuia() {
  const { cnpj, nome } = useMei()

  const [anoSelect, setAnoSelect] = useState('')
  const [anoConsultado, setAnoConsultado] = useState<number | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [beneficio, setBeneficio] = useState<Set<string>>(new Set())
  const [dataPagamento, setDataPagamento] = useState('31/08/2026')
  const [pagamento, setPagamento] = useState<PagamentoInfo | null>(null)

  const key = cnpj
    ? `/api/debitos?cnpj=${encodeURIComponent(cnpj)}&nome=${encodeURIComponent(nome)}`
    : null

  const { data, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true, // Força a busca dos dados assim que a tela abre
  })

  const periodos = useMemo(() => {
    if (!data?.periodos || !anoConsultado) return []
    return data.periodos.filter((p) => p.id.startsWith(`${anoConsultado}-`))
  }, [data?.periodos, anoConsultado])

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
    if (todosAcupadosSelecionados) {
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
    const vencimento =
      sels.map((p) => p.dataVencimento).filter(Boolean).slice(-1)[0] ?? '-'
    const numero = `07.08.${anoConsultado}.${Math.floor(1000000 + Math.random() * 8999999)}-${Math.floor(Math.random() * 9)}`

    const digits = cnpj.replace(/\D/g, '')
    const pixCode = `00020101021226880014br.gov.bcb.pix2568pix-qrcode.comercialbrasil/${digits}/${numero}/${totalSelecionado
      .toFixed(2)
      .replace('.', '')}5925COMERCIAL BRASIL6009SAO PAULO62070503***6304A1B2`

    setPagamento({
      cnpj,
      numero,
      periodoRotulo: rotulos,
      vencimento,
      valorTotal: totalSelecionado,
      pixCode,
    })
  }
  return (
    <>
      {/* PAINEL EXTERNO */}
      <div
        className="
          mt-6
          rounded-[2px]
          border
          border-[#d3d3d3]
          bg-[#f0f0f0]
          p-4
          shadow-[0_1px_3px_rgba(0,0,0,0.05)]
          font-[Arial,sans-serif]
        "
      >
        {/* SELETOR DE ANO-CALENDÁRIO */}
        <div
          className="
            mb-4
            flex
            flex-wrap
            items-center
            justify-center
            gap-2
            py-2
            text-[#333333]
          "
        >
          <label htmlFor="ano" className="text-[13px] font-bold text-[#333333]">
            Informe o Ano-Calendário:
          </label>

          <select
            id="ano"
            value={anoSelect}
            onChange={(e) => setAnoSelect(e.target.value)}
            className="
              h-[28px]
              w-[80px]
              cursor-pointer
              rounded-[4px]
              border
              border-[#c8c8c8]
              bg-[linear-gradient(to_bottom,#ffffff_0%,#f1f1f1_55%,#dddddd_100%)]
              px-2
              py-0
              text-[13px]
              text-neutral-800
              shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.12)]
              outline-none
            "
          >
            <option value="">&nbsp;</option>
            {data?.anosDisponiveis?.map((item) => (
              <option key={item.ano} value={item.ano} disabled={item.bloqueado}>
                {item.ano}
                {item.bloqueado ? ' Não optante' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleConsultar}
            className="
              h-[28px]
              cursor-pointer
              rounded-[4px]
              border
              border-[#398439]
              bg-[linear-gradient(to_bottom,#55b355_0%,#48a348_100%)]
              px-2
              text-[13px]
              font-medium
              text-white
            "
          >
            Ok
          </button>
        </div>

        {/* CONTEÚDO APÓS CONSULTA */}
        {anoConsultado != null && (
          <div className="mx-8 mt-4 rounded-[4px] border border-[#dcdcdc] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.40)]">
            
            <div 
              className="
                -mx-4 
                -mt-4 
                mb-4 
                flex 
                h-[37px] 
                items-center 
                border-b 
                border-[#dcdcdc] 
                bg-[#eeeeee] 
                px-3 
                rounded-t-[4px]
              "
            >
              <h2 className="text-[14px] font-normal text-[#333333]">
                Selecione o(s) período(s) de apuração:
              </h2>
            </div>

            {isLoading ? (
              <p className="py-8 text-center text-sm text-neutral-500">
                Carregando débitos...
              </p>
            ) : (
              <div className="mx-3 overflow-x-auto">
                <table
                  className="
                    w-full
                    min-w-[950px]
                    border-collapse
                    font-[Arial,sans-serif]
                    text-[12px]
                    text-[#333333]
                  "
                >
                  <thead className="bg-white">
                    <tr className="h-[28px] border-b border-[#d0d0d0] bg-[#e6e6e6] text-[#0A4C62] font-bold">
                      <th rowSpan={2} className="w-[35px] px-1 py-0 text-center align-middle">
                        <input
                          type="checkbox"
                          className="h-[13px] w-[13px] cursor-pointer"
                          aria-label="Selecionar todos"
                          checked={todosApuradosSelecionados}
                          onChange={toggleTodos}
                        />
                      </th>
                      <th rowSpan={2} className="w-[180px] px-2 py-0 text-left align-middle">
                        Período de Apuração
                      </th>
                      <th rowSpan={2} className="w-[90px] px-2 py-0 text-center align-middle">
                        Apurado
                      </th>
                      <th rowSpan={2} className="w-[105px] px-2 py-0 text-center align-middle">
                        Benefício INSS
                      </th>
                      <th colSpan={4} className="px-2 pr-2 py-0 text-right align-middle">
                        Resumo do DAS a ser gerado
                      </th>
                      <th colSpan={2} className="px-2 py-0" />
                    </tr>
                    <tr className="h-[28px] border-b border-[#d0d0d0] bg-[#e6e6e6] text-[#0A4C62] font-bold">
                      <th className="px-2 py-0 text-center align-middle">Principal</th>
                      <th className="px-2 py-0 text-center align-middle">Multa</th>
                      <th className="px-2 py-0 text-center align-middle">Juros</th>
                      <th className="px-2 py-0 text-center align-middle">Total</th>
                      <th className="px-2 py-0 text-center align-middle">Data de Vencimento</th>
                      <th className="px-2 py-0 text-center align-middle">Data de Acolhimento</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {periodos.map((p) => (
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
                          \${selecionados.has(p.id) ? 'bg-[#fef8e8]' : 'bg-white hover:bg-[#f5f5f5]'}
                        `}
                      >
                        <td className="px-1 py-0 text-center align-middle">
                          <input
                            type="checkbox"
                            className="h-[13px] w-[13px] cursor-pointer disabled:cursor-not-allowed"
                            disabled={!p.apurado}
                            checked={selecionados.has(p.id)}
                            onChange={() => toggleSelecionado(p.id)}
                          />
                        </td>
                        <td className="px-2 py-0 text-left align-middle">{p.rotulo}</td>
                        <td className="px-2 py-0 text-center align-middle text-[#666666]">{p.apurado ? "Sim" : "Não"}</td>
                        <td className="px-2 py-0 text-center align-middle">
                          <input
                            type="checkbox"
                            className="h-[13px] w-[13px] cursor-pointer disabled:cursor-not-allowed"
                            disabled={!p.apurado}
                            checked={beneficio.has(p.id)}
                            onChange={() => toggleBeneficio(p.id)}
                          />
                        </td>
                        <td className="px-2 py-0 text-right align-middle pr-4">{(p.principal ?? 0) > 0 ? formatBRL(p.principal) : "-"}</td>
                        <td className="px-2 py-0 text-right align-middle pr-4">{(p.multa ?? 0) > 0 ? formatBRL(p.multa) : "-"}</td>
                        <td className="px-2 py-0 text-right align-middle pr-4">{(p.juros ?? 0) > 0 ? formatBRL(p.juros) : "-"}</td>
                        <td className="px-2 py-0 text-right align-middle pr-4 font-regular">{(p.total ?? 0) > 0 ? formatBRL(p.total) : "-"}</td>
                        <td className="px-2 py-0 text-center align-middle">{p.dataVencimento ?? "-"}</td>
                        <td className="px-2 py-0 text-center align-middle">{p.dataAcolhimento ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* FAIXA CINZA OFICIAL INFERIOR */}
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

          </div>
        )}

        {/* TEXTO DE INFORMAÇÕES IMPORTANTES */}
        {anoConsultado != null && (
          <div className="mt-5 px-6 pb-4 text-[12px] leading-relaxed">
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
      </div>

      {/* Modal global */}
      <PaymentModal info={pagamento} onClose={() => setPagamento(null)} />
    </>
  )
}
