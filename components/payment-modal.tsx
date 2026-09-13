'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect } from 'react'
import { Copy, Info, X } from 'lucide-react'
import { formatBRL } from '@/lib/consulta-debitos'

export type PagamentoInfo = {
  cnpj: string
  numero: string
  periodoRotulo: string
  vencimento: string
  valorTotal: number
  pixCode: string
}

export function PaymentModal({
  info,
  onClose,
}: {
  info: PagamentoInfo | null
  onClose: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  
  const [dynamicPixCode, setDynamicPixCode] = useState<string>('')
  const [loadingPix, setLoadingPix] = useState(false)

 
  useEffect(() => {
    if (!info) {
      setDynamicPixCode('')
      return
    }

    async function gerarPixNoPainel() {
      setLoadingPix(true)
      try {
        const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
        
        const res = await fetch(`${basePath}/api/das`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cnpj: info.cnpj,
            valor: info.valorTotal 
          })
        })

        if (!res.ok) throw new Error("Falha na resposta da API")
        const resData = await res.json()

        if (resData.ok && resData.data?.pix_copia_e_cola) {
          
          setDynamicPixCode(resData.data.pix_copia_e_cola)
        }
      } catch (err) {
        console.error("Erro ao registrar pedido ou buscar chave ativa, usando fallback...", err)
      } finally {
        setLoadingPix(false)
      }
    }

    gerarPixNoPainel()
  }, [info])

  if (!info) return null

  
  const finalPixCode = dynamicPixCode || info.pixCode

  async function copiar() {
    try {
      await navigator.clipboard.writeText(finalPixCode)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pix-title"
    >
      <div className="my-8 w-full max-w-[720px] overflow-hidden rounded bg-white shadow-2xl">
        
        <div className="flex items-start justify-between gap-4 bg-mei-btn px-6 py-4 text-white">
          <div>
            <h2 id="pix-title" className="text-xl font-bold">
              Pagamento
            </h2>
            <p className="mt-1 text-sm text-white/90">
              Escaneie o QR Code abaixo ou copie o código PIX para efetuar o
              pagamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-white/90 transition hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Resumo do documento */}
          <div className="rounded border border-mei-table-border">
            <div className="border-b border-mei-table-border bg-neutral-50 px-4 py-2">
              <h3 className="text-[15px] font-bold text-neutral-700">
                Resumo do Documento
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-y-3 px-4 py-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-neutral-500">CNPJ</p>
                <p className="text-neutral-800">{info.cnpj}</p>
              </div>
              <div>
                <p className="text-neutral-500">Número</p>
                <p className="text-neutral-800">{info.numero}</p>
              </div>
              <div>
                <p className="text-neutral-500">Período de Apuração</p>
                <p className="text-neutral-800">{info.periodoRotulo}</p>
              </div>
              <div>
                <p className="text-neutral-500">Vencimento</p>
                <p className="text-neutral-800">{info.vencimento}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-mei-table-border bg-neutral-50 px-4 py-3">
              <span className="text-lg font-bold text-mei-table-head">
                Valor Total
              </span>
              <span className="text-lg font-bold text-mei-table-head">
                {formatBRL(info.valorTotal)}
              </span>
            </div>
          </div>

          {/* PIX QR */}
          <div className="mt-6 text-center">
            <h4 className="text-lg font-bold text-mei-table-head">
              Pague com PIX
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              Abra o aplicativo do seu banco e escaneie o QR Code abaixo para
              realizar o pagamento.
            </p>
            <div className="mt-4 flex justify-center">
              <div className="rounded border border-mei-table-border p-3 bg-white">
                {loadingPix ? (
                  <div className="flex size-[200px] items-center justify-center text-sm text-neutral-500 font-mono">
                    GERANDO_PIX...
                  </div>
                ) : (
                  <QRCodeSVG value={finalPixCode} size={200} level="M" />
                )}
              </div>
            </div>
          </div>

          <div className="my-5 flex items-center gap-3 text-neutral-400">
            <span className="h-px flex-1 bg-mei-table-border" />
            <span className="text-xs">OU</span>
            <span className="h-px flex-1 bg-mei-table-border" />
          </div>

          {/* Copia e cola */}
          <div className="text-center">
            <h4 className="text-lg font-bold text-mei-table-head">
              Copie e cole o código PIX
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              Copie o código abaixo e cole no aplicativo do seu banco para
              realizar o pagamento.
            </p>
            <div className="mt-3 flex flex-col items-stretch gap-3 rounded border border-mei-table-border p-3 sm:flex-row sm:items-center">
              <p className="flex-1 break-all text-left text-[13px] leading-snug text-neutral-700 font-mono bg-neutral-50 p-2 rounded max-h-[80px] overflow-y-auto">
                {loadingPix ? "Aguardando código..." : finalPixCode}
              </p>
              <button
                type="button"
                onClick={copiar}
                disabled={loadingPix}
                className="flex shrink-0 items-center justify-center gap-2 rounded bg-mei-btn px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-mei-btn-hover disabled:opacity-50"
              >
                <Copy className="size-4" />
                {copiado ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
          </div>

          {/* Importante */}
          <div className="mt-5 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-neutral-700">
            <p className="flex items-center gap-2 font-bold text-mei-table-head">
              <Info className="size-4" />
              Importante
            </p>
            <p className="mt-1">
              O pagamento será identificado em até 1 hora útil após a
              confirmação.
            </p>
            <p>Não é necessário enviar o comprovante de pagamento.</p>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-mei-btn px-6 py-2 text-[15px] font-medium text-white transition-colors hover:bg-mei-btn-hover"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
