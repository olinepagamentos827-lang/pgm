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
  ano: number | number[]
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
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
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
    TRATAMENTO DE RETORNOS DE ERRO/AVISO DO SERPRO
  */
  if (apiData['mensagem-erro'] || apiData.mensagemErro) {
    const erroObj = apiData['mensagem-erro'] || apiData.mensagemErro
    console.log('[DEBUG SERPRO MSG]', erroObj)
    const textoErro = erroObj.texto || ''

    // Se exige a DASN anterior, a empresa existia no ano! DEVE FICAR SELECIONÁVEL E CLICÁVEL
    if (textoErro.includes('Antes de prosseguir') || textoErro.includes('DASN-Simei')) {
      return {
        cnpj,
        nome: nomeFinal,
        ano,
        anosDisponiveis: [
          {
            ano,
            bloqueado: false
          }
        ],
        periodos: []
      }
    }

    // Se o erro indicar que a empresa não era optante real ou está baixada (como 2021, 2022 ou 2026)
    return {
      cnpj,
      nome: nomeFinal,
      ano,
      anosDisponiveis: [
        {
          ano,
          bloqueado: true,
          motivo: 'Não optante'
        }
      ],
      periodos: []
    }
  }

  /* PADRÃO NOVO SERPRO */
  const listaResumo = apiData['resumo-pa'] || apiData.resumoPa || []

  if (Array.isArray(listaResumo)) {
    const periodos: PeriodoApuracao[] = listaResumo.map((item: any) => {
      const pa = String(item.pa || '')
      let mes = Number(pa.substring(4, 6)) - 1
      if (Number.isNaN(mes) || mes < 0 || mes > 11) mes = 0

      const detalhe = item['resumo-pa-detalhamento']?.[0] || {}
      const valores = detalhe['valores-pa'] || {}
      const datas = detalhe['datas-pa'] || {}

      const principal = valores ? (Number(valores['valor-principal']) || 0) : 0
      const multa = valores ? (Number(valores['valor-multa']) || 0) : 0
      const juros = valores ? (Number(valores['valor-juros']) || 0) : 0
      const total = valores ? (Number(valores['valor-total']) || (principal + multa + juros)) : 0

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
      nome: nomeFinal,
      ano,
      anosDisponiveis: [
        {
          ano,
          bloqueado: false
        }
      ],
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
    nome: nomeFinal,
    ano,
    anosDisponiveis: [
      {
        ano,
        bloqueado: false
      }
    ],
    periodos
  }
}

export async function consultarDebitos(
  cnpj: string,
  nome: string
): Promise<ConsultaDebitosResponse> {
  let nomeContribuinte = nome || 'MICROEMPREENDEDOR INDIVIDUAL'

  try {
    const dadosEmpresa = await consultarCnpj(cnpj)
    if (dadosEmpresa.razaoSocial) {
      nomeContribuinte = dadosEmpresa.razaoSocial
    }
  } catch (err) {
    console.log('[DEBUG NOME CATCH]', err)
  }

  const todosPeriodos: PeriodoApuracao[] = []
  const mapaAnosDisponiveis = new Map<number, AnoDisponivel>()

  const escopoAnos = [2021, 2022, 2023, 2024, 2025, 2026]

  escopoAnos.forEach(ano => {
    mapaAnosDisponiveis.set(ano, { 
      ano, 
      bloqueado: false 
    })
  })

  const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (const ano of escopoAnos) {
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
        mapaAnosDisponiveis.set(statusAno.ano, {
          ano: statusAno.ano,
          bloqueado: statusAno.bloqueado, 
          motivo: statusAno.motivo
        })
      })

    } catch (error: any) {
      console.error(`[ERRO INDIVIDUAL ANO ${ano}]:`, error.message)
      mapaAnosDisponiveis.set(ano, { 
        ano, 
        bloqueado: true, 
        motivo: 'Não optante' 
      })
    }
    // CORRIGIDO: Voltou a ser esperar(250)!
    await esperar(250)
  }

  escopoAnos.forEach(ano => {
    const dadosAno = mapaAnosDisponiveis.get(ano)
    if (dadosAno && dadosAno.bloqueado && !dadosAno.motivo) {
      mapaAnosDisponiveis.set(ano, {
        ano,
        bloqueado: true,
        motivo: 'Não optante'
      })
    }
  })

  todosPeriodos.sort((a, b) => b.id.localeCompare(a.id))

  const anosOrdenadosCrescente = [2021, 2022, 2023, 2024, 2025, 2026]

  return {
    cnpj,
    nome: nomeContribuinte,
    ano: anosOrdenadosCrescente, 
    anosDisponiveis: anosOrdenadosCrescente.map(ano => {
      const dadosAno = mapaAnosDisponiveis.get(ano)
      return {
        ano,
        bloqueado: dadosAno?.bloqueado ?? false,
        motivo: dadosAno?.motivo
      }
    }),
    periodos: todosPeriodos
  }
}

export function formatBRL(valor: number | null) {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
