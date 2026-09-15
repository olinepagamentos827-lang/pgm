import { NextResponse } from 'next/server'

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
  error?: string
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
      try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      } catch (e) {
        // ignore
      }

      const urlBasePHP = (process.env.API_RECEITA_URL || 'https://websiteseguro.com').replace(/\/$/, "");
      const urlCompleta = urlBasePHP.includes('.php') ? urlBasePHP : `${urlBasePHP}/consulta.php`;
      const urlPHP = `${urlCompleta}?cnpj=${cnpj.replace(/\D/g, "")}&ano=${ano}`;
      
      console.log("[DEBUG] Requisitando URL na Locaweb:", urlPHP);

      const resp = await fetch(urlPHP, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      })
      
      if (!resp.ok) throw new Error(`Script PHP respondeu com erro HTTP status: ${resp.status}`)
      
      const apiData = await resp.json()
      console.log("[DEBUG] Payload cru recebido do PHP:", JSON.stringify(apiData));

      // 1. TRATAMENTO INTELIGENTE PARA CNPJ BAIXADO:
      // Se a resposta contiver erro, mas o erro for especificamente que o contribuinte está BAIXADO,
      // nós PERMITIMOS a entrada retornando uma estrutura limpa (com os períodos vazios apenas para este ano da baixa).
      if (apiData && apiData['mensagem-erro']) {
        const textoErro = String(apiData['mensagem-erro'].texto || '');
        const codigoErro = String(apiData['mensagem-erro'].codigo || '');
        
        if (textoErro.toLowerCase().includes('baixado') || codigoErro === '23033') {
          console.log("[DEBUG] CNPJ válido porém baixado. Permitindo acesso para consulta de anos anteriores.");
          return {
            cnpj,
            nome: apiData.nomeContribuinte || nome || "MICROEMPREENDEDOR INDIVIDUAL (BAIXADO)",
            ano,
            anosDisponiveis: ANOS_MEI_PADRAO,
            periodos: [], // Deixa a tabela vazia para 2026, mas permite que o usuário mude o ano lá dentro!
          }
        }

        // Se for QUALQUER OUTRO ERRO da receita (ex: CNPJ falso/inexistente), aí sim nós barramos
        return {
          cnpj,
          nome: "CNPJ APRESENTA RESTRICAO",
          ano,
          anosDisponiveis: ANOS_MEI_PADRAO,
          periodos: [],
          error: apiData['mensagem-erro'].texto || "Este CNPJ não possui dados válidos para consulta."
        }
      }

      if (apiData && apiData.success === false) {
        return {
          cnpj,
          nome: "CNPJ INVÁLIDO OU NÃO ENCONTRADO",
          ano,
          anosDisponiveis: ANOS_MEI_PADRAO,
          periodos: [],
          error: apiData.error || "Falha na validação junto ao Serpro."
        }
      }

      const listaApuracoes = apiData.listaSituacaoApuracaoMei || 
                             apiData.situacoesApuracaoInssMei || 
                             apiData.situacaoApuracaoInssMei;

      // 2. Fluxo normal para quando o ano consultado retornar os meses com sucesso
      if (apiData && apiData.success && Array.isArray(listaApuracoes)) {
        const periodos: PeriodoApuracao[] = listaApuracoes.map((item: any) => {
          let mesIndex = 0
          const pApuracao = String(item.periodoApuracao || '')

          if (pApuracao.includes('/')) {
            mesIndex = parseInt(pApuracao.split('/')) - 1
          } else if (pApuracao.length === 6) {
            mesIndex = parseInt(pApuracao.substring(4, 6)) - 1
          }

          if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) mesIndex = 0
          
          const principal = Number(item.valorPrincipal) || 0
          const multa = Number(item.valorMulta) || 0
          const juros = Number(item.valorJuros) || 0
          const total = principal + multa + juros

          return {
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
          }
        })

        return {
          cnpj,
          nome: apiData.nomeContribuinte || nome || "MICROEMPREENDEDOR INDIVIDUAL",
          ano,
          anosDisponiveis: ANOS_MEI_PADRAO, 
          periodos,
        }
      }
    } else {
      const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
      const urlInterna = `${basePath}/api/debitos?cnpj=${cnpj}&nome=${nome}&ano=${ano}`
      
      const resp = await fetch(urlInterna, { cache: 'no-store' })
      if (!resp.ok) throw new Error("Erro na rota interna de débitos")
      return await resp.json()
    }

  } catch (error: any) {
    console.error("Falha ao processar API do Serpro:", error)
    throw new Error(error.message || "Erro desconhecido na integração com o PHP.")
  }

  return {
    cnpj,
    nome: "ERRO DE VALIDAÇÃO",
    ano,
    anosDisponiveis: ANOS_MEI_PADRAO,
    periodos: [],
    error: "Não foi possível obter dados para este CNPJ no momento."
  }
}

export function formatBRL(valor: number | null): string {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
