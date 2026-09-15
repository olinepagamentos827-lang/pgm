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
  anosDisponiveis: { ano: number; naoOptante: boolean }[]
  periodos: PeriodoApuracao[]
  error?: string
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const ANOS_MEI_PADRAO = [
  { ano: 2026, naoOptante: false },
  { ano: 2025, naoOptante: false },
  { ano: 2024, naoOptante: false },
  { ano: 2023, naoOptante: false },
  { ano: 2022, naoOptante: false },
  { ano: 2021, naoOptante: false },
  { ano: 2020, naoOptante: false }
]

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

      if (apiData && apiData['mensagem-erro']) {
        const textoErro = String(apiData['mensagem-erro'].texto || '');
        const codigoErro = String(apiData['mensagem-erro'].codigo || '');
        
        if (textoErro.toLowerCase().includes('baixado') || codigoErro === '23033') {
          console.log("[DEBUG] CNPJ válido porém baixado. Buscando nome real no ano anterior...");
          let nomeResgatado = apiData.nomeContribuinte || nome || "";

          if (!nomeResgatado || nomeResgatado === "MICROEMPREENDEDOR INDIVIDUAL") {
            try {
              const anoAnterior = ano - 1;
              const urlFallbackName = `${urlCompleta}?cnpj=${cnpj.replace(/\D/g, "")}&ano=${anoAnterior}`;
              const respName = await fetch(urlFallbackName, {
                cache: 'no-store',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
              });
              if (respName.ok) {
                const dataName = await respName.json();
                if (dataName && dataName.nomeContribuinte) {
                  nomeResgatado = dataName.nomeContribuinte;
                  console.log("[DEBUG] Nome real resgatado com sucesso:", nomeResgatado);
                }
              }
            } catch (errName) {
              console.error("Erro ao resgatar nome:", errName);
            }
          }

          if (!nomeResgatado) nomeResgatado = "MICROEMPREENDEDOR INDIVIDUAL";

          const listaAnosCustom = ANOS_MEI_PADRAO.map(item => ({
            ano: item.ano,
            naoOptante: item.ano === ano ? true : false
          }));

          return {
            cnpj,
            nome: nomeResgatado,
            ano,
            anosDisponiveis: listaAnosCustom,
            periodos: [],
          }
        }

        if (textoErro.toLowerCase().includes('não optante') || codigoErro === '23010') {
          const listaAnosCustom = ANOS_MEI_PADRAO.map(item => ({
            ano: item.ano,
            naoOptante: item.ano === ano ? true : false
          }));
          return {
            cnpj,
            nome: apiData.nomeContribuinte || nome || "MICROEMPREENDEDOR INDIVIDUAL",
            ano,
            anosDisponiveis: listaAnosCustom,
            periodos: []
          }
        }

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
      const urlInterna = `${basePath}/api/debitos?cnpj=${cnpj}&ano=${ano}`
      const resp = await fetch(urlInterna, { cache: 'no-store' })
      if (!resp.ok) throw new Error("Erro na rota interna de débitos")
      return await resp.json()
    }
  } catch (error: any) {
    console.error("Falha ao processar API do Serpro:", error)
    throw new Error(error.message || "Erro desconhecido na integração.")
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
