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
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

// Lista de anos que vão aparecer no seletor da tela
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

      // 1. Limpa barras duplicadas da URL da Vercel
      const urlBasePHP = (process.env.API_RECEITA_URL || 'https://websiteseguro.com').replace(/\/$/, "");
      const urlCompleta = urlBasePHP.includes('.php') ? urlBasePHP : `${urlBasePHP}/consulta.php`;
      
      // 2. Monta a URL idêntica ao que o seu $_REQUEST['cnpj'] e $_REQUEST['ano'] esperam receber
      const urlPHP = `${urlCompleta}?cnpj=${cnpj.replace(/\D/g, "")}&ano=${ano}`;
      
      console.log("[DEBUG] Efetuando requisição para a Locaweb:", urlPHP);

      const resp = await fetch(urlPHP, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      })
      
      if (!resp.ok) throw new Error(`Script PHP respondeu com erro HTTP status: ${resp.status}`)
      
      const apiData = await resp.json()
      console.log("[DEBUG] Resposta crua vinda do seu PHP:", JSON.stringify(apiData));

      // 3. Validação ajustada para a resposta real do Serpro repassada pelo seu PHP
      if (apiData && apiData.success && Array.isArray(apiData.situacoesApuracaoInssMei)) {
        const periodos: PeriodoApuracao[] = apiData.situacoesApuracaoInssMei.map((item: any) => {
          let mesIndex = 0
          const pApuracao = String(item.periodoApuracao || '')

          // Pega o mês independente se vier como "01/2023" ou "202301"
          if (pApuracao.includes('/')) {
            mesIndex = parseInt(pApuracao.split('/')[0]) - 1
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
            // Se o status for devedor ou tiver valor total, marca na tabela como pendente
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
          // Exibe o nome do MEI retornado pelo Serpro, caso não encontre, joga o padrão informado
          nome: apiData.nomeContribuinte || nome || "MICROEMPREENDEDOR INDIVIDUAL",
          ano,
          anosDisponiveis: ANOS_MEI_PADRAO, 
          periodos,
        }
      } else {
        console.warn("[AVISO] PHP respondeu com sucesso mas sem a lista 'situacoesApuracaoInssMei'.", apiData);
      }
    } else {
      // Execução no Client-side: redireciona para a rota interna da Vercel
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

  // Fallback padrão caso a apiData.success venha como false (ex: Token Expirado no Serpro)
  return {
    cnpj,
    nome: "ERRO: Não foi possível estruturar os dados. Verifique a validade do TokenGov no PHP.",
    ano,
    anosDisponiveis: ANOS_MEI_PADRAO,
    periodos: []
  }
}

export function formatBRL(valor: number | null): string {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
