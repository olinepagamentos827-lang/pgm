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

  // Configura um timeout ligeiramente menor para evitar travar o event loop do Node por muito tempo
  const resposta = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(25000), 
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  })

  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status}`)
  }

  const apiData = await resposta.json()
  console.log('[DEBUG PAYLOAD]', JSON.stringify(apiData))

  let nomeFinal = apiData.nomeContribuinte || nome || ''

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
  if (apiData['mensagem-erro']) {
    console.log('[DEBUG SERPRO MSG]', apiData['mensagem-erro'])
    
    const textoErro = apiData['mensagem-erro'].texto || 'Erro interno do órgão validador.'
    
    return {
      cnpj,
      nome: nomeFinal || 'MICROEMPREENDEDOR INDIVIDUAL',
      ano,
      anosDisponiveis: ANOS_MEI_PADRAO.map(a => ({
        ano: a,
        bloqueado: a === ano, // Marca especificamente este ano como bloqueado
        motivo: a === ano ? textoErro : undefined
      })),
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

      const principal = Number(valores['valor-principal']) || 0
      const multa = Number(valores['valor-multa']) || 0
      const juros = Number(valores['valor-juros']) || 0
      const total = Number(valores['valor-total']) || (principal + multa + juros)

      return {
        id: `${ano}-${String(mes + 1).padStart(2, '0')}`,
        rotulo: `${MESES[mes]}/${ano}`,
        apurado: total > 0,
        beneficioInss: item['checkbox-beneficio-inss']?.checked || false,
        principal,
        multa,
        juros,
        total,
        dataVencimento: datas['data-vencimento'] ? new Date(datas['data-vencimento']).toLocaleDateString('pt-BR') : '-',
        dataAcolhimento: datas['data-acolhimento'] ? new Date(datas['data-acolhimento']).toLocaleDateString('pt-BR') : '-'
      }
    })

    return {
      cnpj,
      nome: nomeFinal || 'MICROEMPREENDEDOR INDIVIDUAL',
      ano,
      anosDisponiveis: ANOS_MEI_PADRAO.map(a => ({ ano: a, bloqueado: false })),
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
  
  // 1. Otimização Inteligente: Consulta os dados cadastrais prévios para evitar requisições inúteis
  try {
    const dadosEmpresa = await consultarCnpj(cnpj)
    if (dadosEmpresa.razaoSocial) nomeContribuinte = dadosEmpresa.razaoSocial

    const anoAbertura = dadosEmpresa.dataAbertura ? new Date(dadosEmpresa.dataAbertura).getFullYear() : null
    const anoBaixa = dadosEmpresa.situacao === 'BAIXADA' && dadosEmpresa.dataSituacao ? new Date(dadosEmpresa.dataSituacao).getFullYear() : null

    // Filtra o array de anos para pesquisar somente o período em que a empresa de fato existiu
    anosBusca = ANOS_MEI_PADRAO.filter(ano => {
      if (anoAbertura && ano < anoAbertura) return false // Ignora anos anteriores à abertura
      if (anoBaixa && ano > anoBaixa) return false // Ignora anos posteriores à baixa
      return true
    })
  } catch (err) {
    console.log('[DEBUG FILTRO ANOS ERRO]', err)
  }

  // Se o filtro resultar vazio, redefine para varredura padrão segura
  if (anosBusca.length === 0) anosBusca = [...ANOS_MEI_PADRAO]

  // 2. Consulta paralela controlada para evitar estouro de sockets do fetch
  const promessas = anosBusca.map(ano => consultarAno(cnpj, nomeContribuinte, ano))
  const resultados = await Promise.allSettled(promessas)

  const todosPeriodos: PeriodoApuracao[] = []
  const mapaAnosDisponiveis = new Map<number, AnoDisponivel>()

  // Inicializa o mapa com o estado padrão
  ANOS_MEI_PADRAO.forEach(ano => {
    mapaAnosDisponiveis.set(ano, { ano, bloqueado: false })
  })

  // 3. Consolidando os dados retornados
  for (const resultado of resultados) {
    if (resultado.status === 'fulfilled') {
      const respostaAno = resultado.value

      if (respostaAno.nome && respostaAno.nome !== 'MICROEMPREENDEDOR INDIVIDUAL') {
        nomeContribuinte = respostaAno.nome
      }

      // Adiciona os períodos encontrados
      if (respostaAno.periodos && respostaAno.periodos.length > 0) {
        todosPeriodos.push(...respostaAno.periodos)
      }

      // Copia as informações de bloqueios/mensagens encontradas para o mapa consolidado
      respostaAno.anosDisponiveis.forEach(statusAno => {
        if (statusAno.bloqueado) {
          mapaAnosDisponiveis.set(statusAno.ano, statusAno)
        }
      })
    } else {
      // Caso a requisição tenha sofrido rejeição crítica (Timeout / Fetch Failed)
      console.error('[PROMISSE REJECTED]', resultado.reason)
    }
  }

  // Ordena os débitos dos meses mais recentes para os mais antigos
  todosPeriodos.sort((a, b) => b.id.localeCompare(a.id))

  return {
    cnpj,
    nome: nomeContribuinte,
    ano: anosBusca[0] || ANOS_MEI_PADRAO[0], 
    anosDisponiveis: Array.from(mapaAnosDisponiveis.values()),
    periodos: todosPeriodos
  }
}

export function formatBRL(valor: number | null) {
  if (valor === null || valor === undefined) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
