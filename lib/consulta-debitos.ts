import { consultarCnpj } from './consulta-cnpj'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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

export interface AnoDisponivel {
  ano: number
  bloqueado: boolean
  motivo?: string
}

export interface ConsultaDebitosResponse {
  cnpj: string
  nome: string
  ano: number
  anosDisponiveis: AnoDisponivel[]
  periodos: PeriodoApuracao[]
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const ANOS_MEI_PADRAO = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

async function consultarAno(
  cnpj: string,
  nome: string,
  ano: number
): Promise<ConsultaDebitosResponse> {
  const urlBase = (process.env.API_RECEITA_URL || 'https://websiteseguro.com').replace(/\/$/, '')

  const url = urlBase.includes('.php')
    ? `${urlBase}?cnpj=${cnpj.replace(/\D/g, '')}&ano=${ano}`
    : `${urlBase}/consulta.php?cnpj=${cnpj.replace(/\D/g, '')}&ano=${ano}`

  console.log('[DEBUG SERPRO]', url)

  // Configura cabeçalhos idênticos aos de um navegador Chrome real para evitar o bloqueio (WAF/Cloudflare)
  const resposta = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(25000), 
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand)";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Destination': 'empty',
      'Sec-Mode': 'cors',
      'Sec-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  })

  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status}`)
  }
  const apiData = await resposta.json()
  console.log('[DEBUG PAYLOAD]', JSON.stringify(apiData))

  let nomeFinal = apiData.nomeContribuinte || apiData.nome || nome || ''

  if (!nomeFinal) {
    try {
      const empresa = await consultarCnpj(cnpj)
      nomeFinal = empresa.razaoSocial || empresa.nomeFantasia || ''
    } catch (e) {
      console.log('[DEBUG NOME ERRO]', e)
    }
  }
  /* 
    TRATAMENTO DE ERROS DO SERPRO (Contribuinte Baixado / DASN Pendente)
  */
  if (apiData['mensagem-erro'] || apiData.mensagemErro) {
    const erroObj = apiData['mensagem-erro'] || apiData.mensagemErro
    console.log('[DEBUG SERPRO MSG]', erroObj)
    
    const textoErro = erroObj.texto || 'Erro interno do órgão validador.'
    
    return {
      cnpj,
      nome: nomeFinal || 'MICROEMPREENDEDOR INDIVIDUAL',
      ano,
      anosDisponiveis: ANOS_MEI_PADRAO.map(a => ({
        ano: a,
        bloqueado: a === ano, 
        motivo: a === ano ? textoErro : undefined
      })),
      periodos: []
    }
  }


   /* PADRÃO NOVO SERPRO - resumo-pa */
  const listaResumo = apiData['resumo-pa'] || apiData.resumoPa || []

  if (Array.isArray(listaResumo)) {
    const periodos: PeriodoApuracao[] = listaResumo.map((item: any) => {
      const pa = String(item.pa || '')
      let mes = Number(pa.substring(4, 6)) - 1

      if (Number.isNaN(mes) || mes < 0 || mes > 11) {
        mes = 0
      }

      const detalhe = item['resumo-pa-detalhamento']?.[0] || {}
      
      // Correção protetiva: garante objeto vazio estável se a propriedade vier explícita como null do órgão
      const valores = detalhe['valores-pa'] || {}
      const datas = detalhe['datas-pa'] || {}

      const principal = valores ? (Number(valores['valor-principal']) || 0) : 0
      const multa = valores ? (Number(valores['valor-multa']) || 0) : 0
      const juros = valores ? (Number(valores['valor-juros']) || 0) : 0
      const total = valores ? (Number(valores['valor-total']) || (principal + multa + juros)) : 0

      // Garante string estável caso datas-pa seja nulo (comum em meses Não Optantes)
      let dataVencimentoFormata = '-'
      if (datas && datas['data-vencimento']) {
        dataVencimentoFormata = new Date(datas['data-vencimento']).toLocaleDateString('pt-BR')
      }

      let dataAcolhimentoFormata = '-'
      if (datas && datas['data-acolhimento']) {
        dataAcolhimentoFormata = new Date(datas['data-acolhimento']).toLocaleDateString('pt-BR')
      }

      return {
        id: `${ano}-${String(mes + 1).padStart(2, '0')}`,
        rotulo: `${MESES[mes]}/${ano}`,
        apurado: total > 0,
        beneficioInss: item['checkbox-beneficio-inss']?.checked || false,
        principal,
        multa,
        juros,
        total,
        dataVencimento: dataVencimentoFormata,
        dataAcolhimento: dataAcolhimentoFormata
      }
    })

    return {
      cnpj,
      nome: nomeFinal || 'MICROEMPREENDEDOR INDIVIDUAL',
      ano,
      anosDisponiveis: ANOS_MEI_PADRAO.map(a => ({
        ano: a,
        bloqueado: false
      })),
      periodos
    }
  }

  /* PADRÃO ANTIGO SERPRO */
  const lista = apiData.listaSituacaoApuracaoMei || apiData.situacoesApuracaoInssMei || apiData.situacaoApuracaoInssMei || []
  const periodos: PeriodoApuracao[] = Array.isArray(lista)
    ? lista.map((item: any) => {
        const detalhe = item['resumo-pa-detalhamento']?.[0] || {}

        const valores = detalhe['valores-pa'] || {}
        const datas = detalhe['datas-pa'] || {}

        const pa = String(item.pa || '')
        let mes = Number(pa.substring(4, 6)) - 1
        if (Number.isNaN(mes) || mes < 0 || mes > 11) mes = 0

        const principal = Number(valores['valor-principal']) || 0
        const multa = Number(valores['valor-multa']) || 0
        const juros = Number(valores['valor-juros']) || 0

        return {
          id: `${ano}-${String(mes + 1).padStart(2, '0')}`,
          rotulo: `${MESES[mes]}/${ano}`,
          apurado: (principal + multa + juros) > 0,
          beneficioInss: false,
          principal,
          multa,
          juros,
          total: principal + multa + juros,
          dataVencimento: datas['data-vencimento'] || '-',
          dataAcolhimento: datas['data-acolhimento'] || '-'
        }
      })
    : []

  return {
    cnpj,
    nome: nomeFinal || 'MICROEMPREENDEDOR INDIVIDUAL',
    ano,
    anosDisponiveis: ANOS_MEI_PADRAO.map(a => ({ ano: a, bloqueado: false })),
    periodos
  }
}

export async function consultarDebitos(
  cnpj: string,
  nome: string
): Promise<ConsultaDebitosResponse> {
  
  let anosBusca = [...ANOS_MEI_PADRAO]
  let nomeContribuinte = nome || 'MICROEMPREENDEDOR INDIVIDUAL'
  
  // 1. Consulta cadastral inteligente para reduzir o número de requisições
  try {
    const dadosEmpresa = await consultarCnpj(cnpj)
    if (dadosEmpresa.razaoSocial) nomeContribuinte = dadosEmpresa.razaoSocial

    const anoAbertura = dadosEmpresa.dataAbertura ? new Date(dadosEmpresa.dataAbertura).getFullYear() : null
    const anoBaixa = dadosEmpresa.situacao === 'BAIXADA' && dadosEmpresa.dataSituacao ? new Date(dadosEmpresa.dataSituacao).getFullYear() : null

    anosBusca = ANOS_MEI_PADRAO.filter(ano => {
      if (anoAbertura && ano < anoAbertura) return false
      if (anoBaixa && ano > anoBaixa) return false
      return true
    })
  } catch (err) {
    console.log('[DEBUG FILTRO ANOS ERRO]', err)
  }

  if (anosBusca.length === 0) anosBusca = [...ANOS_MEI_PADRAO]

  const todosPeriodos: PeriodoApuracao[] = []
  const mapaAnosDisponiveis = new Map<number, AnoDisponivel>()

  ANOS_MEI_PADRAO.forEach(ano => {
    mapaAnosDisponiveis.set(ano, { ano, bloqueado: false })
  })

  // Função auxiliar para dar um respiro (delay) entre as chamadas e evitar Rate Limit
  const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // 2. Executa as requisições de forma sequencial controlada para não ativar o firewall
  for (const ano of anosBusca) {
    try {
      console.log(`[FILA CONTROLADA] Buscando ano: ${ano}`)
      const respostaAno = await consultarAno(cnpj, nomeContribuinte, ano)

      if (respostaAno.nome && respostaAno.nome !== 'MICROEMPREENDEDOR INDIVIDUAL') {
        nomeContribuinte = respostaAno.nome
      }

      if (respostaAno.periodos && respostaAno.periodos.length > 0) {
        todosPeriodos.push(...respostaAno.periodos)
      }

      respostaAno.anosDisponiveis.forEach(statusAno => {
        if (statusAno.bloqueado) {
          mapaAnosDisponiveis.set(statusAno.ano, statusAno)
        }
      })

      // Adiciona um pequeno intervalo de 250ms antes de pedir o próximo ano ao servidor
      await esperar(250)

    } catch (error: any) {
      console.error(`[ERRO INDIVIDUAL ANO ${ano}]:`, error.message)
      // Se um ano der timeout, marca como bloqueado por falha temporária
      mapaAnosDisponiveis.set(ano, { 
        ano, 
        bloqueado: true, 
        motivo: 'Instabilidade temporária no validador. Tente novamente.' 
      })
    }
  }

  todosPeriodos.sort((a, b) => b.id.localeCompare(a.id))

  return {
    cnpj,
    nome: nomeContribuinte,
    ano: anosBusca[0] || 2026, 
    anosDisponiveis: Array.from(mapaAnosDisponiveis.values()),
    periodos: todosPeriodos
  }
}


export function formatBRL(valor: number | null) {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
