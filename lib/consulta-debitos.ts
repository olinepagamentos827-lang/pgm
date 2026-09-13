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

/**
 * Consulta os débitos de um CNPJ consumindo o seu script PHP real do Serpro na Locaweb
 */
export async function consultarDebitos(
  cnpj: string,
  nome: string,
  ano: number,
): Promise<ConsultaDebitosResponse> {
  try {
    // 1. URL da API apontando para o seu PHP hospedado na Locaweb
    const urlBasePHP = process.env.API_RECEITA_URL || 'http://hospedagemdesites.ws'
    const urlPHP = `${urlBasePHP}?cnpj=${cnpj}&ano=${ano}`
    
    const resp = await fetch(urlPHP, { cache: 'no-store' })
    if (!resp.ok) throw new Error("Erro na comunicação com o script PHP")
    
    const apiData = await resp.json()

    // 2. Transforma a resposta crua do Serpro no formato exato que a sua tela espera
    if (apiData && apiData.situacoesApuracaoInssMei) {
      
      const periodos: PeriodoApuracao[] = apiData.situacoesApuracaoInssMei.map((item: any) => {
        let mesIndex = 0
        const pApuracao = String(item.periodoApuracao || '')

        // Mapeia o mês retornado pela receita (ex: "03/2023" ou "202303")
        if (pApuracao.includes('/')) {
          mesIndex = parseInt(pApuracao.split('/')[0]) - 1
        } else if (pApuracao.length === 6) {
          mesIndex = parseInt(pApuracao.substring(4, 6)) - 1
        } else if (pApuracao.includes('-')) {
          mesIndex = parseInt(pApuracao.split('-')[1]) - 1
        }

        if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) mesIndex = 0
        
        // Trata os valores vindos do Serpro
        const principal = Number(item.valorPrincipal) || 0
        const multa = Number(item.valorMulta) || 0
        const juros = Number(item.valorJuros) || 0
        const total = principal + multa + juros

        return {
          id: `${ano}-${String(mesIndex + 1).padStart(2, '0')}`,
          rotulo: `${MESES[mesIndex]}/${ano}`,
          // Se estiver devedor ou apurado vira uma linha clicável de débito para gerar Pix
          apurado: item.situacaoApuracao === 'APURADO' || item.situacaoApuracao === 'DEVEDOR' || total > 0,
          beneficioInss: false,
          principal,
          multa,
          juros,
          total,
          dataVencimento: item.dataVencimento || '-',
          dataAcolhimento: new Date().toLocaleDateString('pt-BR'),
        }
      })

      // Retorna a Razão Social Real, os Anos com débito e os Meses estruturados
      return {
        cnpj,
        nome: apiData.nomeContribuinte || "RAZÃO SOCIAL NÃO RETORNADA",
        ano,
        anosDisponiveis:, 
        periodos,
      }
    }

  } catch (error) {
    console.error("Falha ao processar API do Serpro:", error)
  }

  // Fallback caso a API caia ou dê timeout
  return buildMock(cnpj, nome, ano)
}

export function formatBRL(valor: number | null): string {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function buildMock(cnpj: string, nome: string, ano: number): ConsultaDebitosResponse {
  return {
    cnpj,
    nome: nome || "EMPRESA DE TESTE MOCK LTDA",
    ano,
    anosDisponiveis:,
    periodos: []
  }
}
