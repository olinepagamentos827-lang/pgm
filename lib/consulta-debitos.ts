export interface PeriodoApuracao {
  id: string
  rotulo: string
  apurado: boolean
  beneficioInss: boolean
  principal: number | null
  multa: number | null
  juros: number | null
  total: number | null
  dataVencimento: string | null
  dataAcolhimento: string | null
}

export interface ConsultaDebitosResponse {
  cnpj: string
  nome: string
  ano: number
  anosDisponiveis: number[]
  periodos: PeriodoApuracao[]
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const ANOS_MEI_PADRAO = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

/**
 * Consulta os débitos de um CNPJ consumindo o seu script PHP real do Serpro na Locaweb
 */
export async function consultarDebitos(
  cnpj: string,
  nome: string,
  ano: number,
): Promise<ConsultaDebitosResponse> {
  
  const isServer = typeof window === 'undefined'

  try {
    if (isServer) {
      // 🔒 BYPASS TLS: Desativa a trava rígida de SSL para aceitar o certificado compartilhado da Locaweb instantaneamente
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      const urlBasePHP = process.env.API_RECEITA_URL || 'https://websiteseguro.com'
      const urlPHP = `${urlBasePHP}?cnpj=${cnpj.replace(/\D/g, "")}&ano=${ano}`
      
      const resp = await fetch(urlPHP, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      })
      
      if (!resp.ok) throw new Error(`Script PHP respondeu com erro HTTP status: ${resp.status}`)
      
      const apiData = await resp.json()

      if (apiData && apiData.success) {
        const periodos: PeriodoApuracao[] = []

        if (Array.isArray(apiData.situacoesApuracaoInssMei)) {
          apiData.situacoesApuracaoInssMei.forEach((item: any) => {
            let mesIndex = 0
            const pApuracao = String(item.periodoApuracao || '')

            if (pApuracao.includes('/')) {
              mesIndex = parseInt(pApuracao.split('/')[0]) - 1
            } else if (pApuracao.length === 6) {
              mesIndex = parseInt(pApuracao.substring(4, 6)) - 1
            } else if (pApuracao.includes('-')) {
              mesIndex = parseInt(pApuracao.split('-')[1]) - 1
            }

            if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) mesIndex = 0
            
            const principal = Number(item.valorPrincipal) || 0
            const multa = Number(item.valorMulta) || 0
            const juros = Number(item.valorJuros) || 0
            const total = principal + multa + juros

            periodos.push({
              id: `${ano}-${String(mesIndex + 1).padStart(2, '0')}`,
              rotulo: `${MESES[mesIndex]}/${ano}`,
              apurado: item.situacaoApuracao === 'APURADO' || item.situacaoApuracao === 'DEVEDOR' || total > 0,
              beneficioInss: false,
              principal,
              multa,
              juros,
              total,
              dataVencimento: item.dataVencimento || '-',
              dataAcolhimento: new Date().toLocaleDateString('pt-BR'),
            })
          })
        }

        return {
          cnpj,
          nome: apiData.nomeContribuinte || "NÃO CONSTA DÉBITOS PARA ESTE ANO",
          ano,
          anosDisponiveis: ANOS_MEI_PADRAO, 
          periodos: periodos,
        }
      }
      
      throw new Error("API do Serpro retornou success: false")

    } else {
      const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
      const urlInterna = `${basePath}/api/debitos?cnpj=${cnpj}&nome=${nome}&ano=${ano}`
      
      const resp = await fetch(urlInterna, { cache: 'no-store' })
      if (!resp.ok) throw new Error("Erro na rota interna de débitos")
      return await resp.json()
    }

  } catch (error) {
    console.error("Falha ao processar API do Serpro, revertendo para erro na tela...", error)
  }

  return {
    cnpj,
    nome: "ERRO: Não foi possível obter os dados da Receita Federal.",
    ano,
    anosDisponiveis: ANOS_MEI_PADRAO,
    periodos: []
  }
}

export function formatBRL(valor: number | null): string {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
