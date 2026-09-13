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
 * Consulta os débitos de um CNPJ consumindo o script real do Serpro/RFB
 */
export async function consultarDebitos(
  cnpj: string,
  nome: string,
  ano: number,
): Promise<ConsultaDebitosResponse> {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''

  try {
    // 1. 🕵️‍♂️ DISPARA O REGISTRO DE VISITA NO SEU PAINEL SUPABASE
    await fetch(`${basePath}/api/das`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    }).catch(err => console.error("Falha ao registrar log de visita:", err))

    // 2. 🚀 CHAMADA PARA O SCRIPT PHP DA RECEITA (Hospedado na Locaweb)
    const urlPHP = `${process.env.API_RECEITA_URL || ''}?cnpj=${cnpj}&ano=${ano}`
    const resp = await fetch(urlPHP)
    
    if (!resp.ok) throw new Error("Erro na comunicação com o script PHP")
    const apiData = await resp.json()

    // 3. 🗺️ MAPEAMENTO (ADAPTADOR): Transforma a resposta do Serpro no formato do layout
    if (apiData && apiData.success && apiData.situacoesApuracaoInssMei) {
      
      const periodos: PeriodoApuracao[] = apiData.situacoesApuracaoInssMei.map((item: any) => {
        const mesIndex = parseInt(item.periodoApuracao?.split('/') || '1') - 1
        
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

      return {
        cnpj,
        nome: apiData.nomeContribuinte || nome || "CONTRIBUINTE MEI ATIVO",
        ano,
        // ✅ CORREÇÃO: Array de anos estática e preenchida de forma explícita
        anosDisponiveis:, 
        periodos,
      }
    }

  } catch (error) {
    console.error("Falha ao buscar dados reais do Serpro, revertendo para mock visual...", error)
  }

  // Fallback: Se a API da Receita falhar, ele mostra o mock visual para o site não quebrar
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
  return {
    cnpj,
    nome: nome || "MOCK CONTRIBUINTE LTDA",
    ano,
    anosDisponiveis:,
    periodos: []
  }
}