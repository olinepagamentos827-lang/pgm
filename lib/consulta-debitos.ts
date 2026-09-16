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
    signal: AbortSignal.timeout(35000), // Aumentado ligeiramente para segurar pacotes truncados pesados
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

  let texto = await resposta.text()
  console.log('[DEBUG RAW TEXT]', texto.substring(0, 300))

  // BLINDAGEM CONTRA TRUNCAÇÃO: Se o JSON vier cortado na marra pelo servidor, reconstrói o fechamento básico
  if (texto.includes('"resumo-pa":') && !texto.endsWith(']}') && !texto.endsWith(']}]]}')) {
    console.log('[AVISO INFRA] Payload cortado detectado. Aplicando fechamento de emergência.')
    if (texto.includes('valor-principal-detalhamento')) {
      texto = texto.substring(0, texto.lastIndexOf('{"pa"')) || texto;
      // Garante a finalização do nó válido anterior
      if (!texto.endsWith(']}')) texto += ']}]}'
    }
  }

  let apiData: any
  try {
    apiData = JSON.parse(texto)
  } catch (parseError) {
    console.error('[ERRO PARSE] Resposta corrompida enviada pelo órgão:', texto.substring(texto.length - 100))
    // Retorna fallback limpo do ano travado para o select não sumir na tela por erro de infra
    return {
      cnpj,
      nome,
      ano,
      anosDisponiveis: [{ ano, bloqueado: true, motivo: 'Instabilidade no retorno dos dados.' }],
      periodos: []
    }
  }

  let nomeFinal = apiData.nomeContribuinte || apiData.nome || nome || ''

  if (!nomeFinal) {
    try {
      const empresa = await consultarCnpj(cnpj)
      nomeFinal = empresa.razaoSocial || empresa.nomeFantasia || ''
    } catch (e) {
      console.log('[DEBUG NOME ERRO]', e)
    }
  }

  if (apiData['mensagem-erro'] || apiData.mensagemErro) {
    const erroObj = apiData['mensagem-erro'] || apiData.mensagemErro
    const textoErro = erroObj.texto || ''

    if (textoErro.includes('Antes de prosseguir') || textoErro.includes('DASN-Simei')) {
      return {
        cnpj,
        nome: nomeFinal,
        ano,
        anosDisponiveis: [{ ano, bloqueado: false }],
        periodos: []
      }
    }

    return {
      cnpj,
      nome: nomeFinal,
      ano,
      anosDisponiveis: [{ ano, bloqueado: true, motivo: 'Não optante' }],
      periodos: []
    }
  }

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
      anosDisponiveis: [{ ano, bloqueado: false }],
      periodos
    }
  }

  return {
    cnpj,
    nome: nomeFinal,
    ano,
    anosDisponiveis: [{ ano, bloqueado: false }],
    periodos: []
  }
}

export async function consultarDebitos(
  cnpj: string,
  nome: string
): Promise<ConsultaDebitosResponse> {
  let nomeContribuinte = nome || 'MICROEMPREENDEDOR INDIVIDUAL'

  try {
    const dadosEmpresa = await consultarCnpj(cnpj)
    if (dadosEmpresa.razaoSocial) nomeContribuinte = dadosEmpresa.razaoSocial
  } catch (err) {
    console.log('[DEBUG NOME CATCH]', err)
  }

  const todosPeriodos: PeriodoApuracao[] = []
  const mapaAnosDisponiveis = new Map<number, AnoDisponivel>()

  ANOS_MEI_PADRAO.forEach(ano => {
    mapaAnosDisponiveis.set(ano, { ano, bloqueado: false })
  })

  const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (const _ano of ANOS_MEI_PADRAO) {
    try {
      console.log(`[FILA CONTROLADA] Buscando ano: ${_ano}`)
      const respostaAno = await consultarAno(cnpj, nomeContribuinte, _ano)

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
      console.error(`[ERRO INDIVIDUAL ANO ${_ano}]:`, error.message)
      mapaAnosDisponiveis.set(_ano, { 
        ano: _ano, 
        bloqueado: true, 
        motivo: 'Não optante' 
      })
    }
    await esperar(250)
  }

  ANOS_MEI_PADRAO.forEach(ano => {
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

  const anosOrdenadosCrescente = [...ANOS_MEI_PADRAO].sort((a, b) => a - b)

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
