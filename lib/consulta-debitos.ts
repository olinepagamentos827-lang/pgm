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
 * Consulta os débitos de um CNPJ consumindo o script real do Serpro/RFB na Locaweb
 */
export async function consultarDebitos(
  cnpj: string,
  nome: string,
  ano: number,
): Promise<ConsultaDebitosResponse> {
  try {
    // 1. 🚀 CHAMADA DIRETA PARA O SCRIPT PHP DA RECEITA (Hospedado na Locaweb)
    // Lê a variável de ambiente configurada na Vercel
    const urlPHP = `${process.env.API_RECEITA_URL || ''}?cnpj=${cnpj}&ano=${ano}`
    
    const resp = await fetch(urlPHP, { cache: 'no-store' });
    if (!resp.ok) throw new Error("Erro na comunicação com o script PHP")
    const apiData = await resp.json()

    // 2. 🗺️ MAPEAMENTO: Transforma a resposta real do Serpro no formato do layout
    if (apiData && apiData.success && apiData.situacoesApuracaoInssMei) {
      
      const periodos: PeriodoApuracao[] = apiData.situacoesApuracaoInssMei.map((item: any) => {
        let mesIndex = 0;
        const pApuracao = String(item.periodoApuracao || '');

        if (pApuracao.includes('/')) {
          mesIndex = parseInt(pApuracao.split('/')[0]) - 1;
        } else if (pApuracao.includes('-')) {
          mesIndex = parseInt(pApuracao.split('-')[1]) - 1;
        } else if (pApuracao.length === 6) {
          mesIndex = parseInt(pApuracao.substring(4, 6)) - 1;
        }

        if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) {
          mesIndex = 0;
        }
        
        const principal = item.valorPrincipal || 0
        const multa = item.valorMulta || 0
        const juros = item.valorJuros || 0
        const total = principal + multa + juros

        return {
          id: `${ano}-${String(mesIndex + 1).padStart(2, '0')}`,
          rotulo: `${MESES[mesIndex]}/${ano}`,
          apurado: item.situacaoApuracao === 'APURADO' || item.situacaoApuracao === 'DEVEDOR',
          beneficioInss: false,
          principal,
          multa,
          juros,
          total,
          dataVencimento: item.dataVencimento || '-',
          dataAcolhimento: new Date().toLocaleDateString('pt-BR'),
        }
      })

      const listaAnos = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

      return {
        cnpj,
        nome: apiData.nomeContribuinte || nome || "CONTRIBUINTE MEI ATIVO",
        ano,
        anosDisponiveis: listaAnos, 
        periodos,
      }
    }

  } catch (error) {
    console.error("Falha ao buscar dados reais do Serpro, revertendo para mock visual...", error)
  }

  // Fallback seguro caso a Locaweb caia ou apresente problemas
  return buildMock(cnpj, nome, ano)
}

/** Formata número para moeda BRL (ex.: 112.79 -> "R$ 112,79"). */
export function formatBRL(valor: number | null): string {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** Função Fallback auxiliar de Mock */
function buildMock(cnpj: string, nome: string, ano: number): ConsultaDebitosResponse {
  const listaAnosMock = [2026, 2025, 2024, 2023, 2022, 2021, 2020]
  return {
    cnpj,
    nome: nome || "MOCK CONTRIBUINTE LTDA",
    ano,
    anosDisponiveis: listaAnosMock,
    periodos: []
  }
}
