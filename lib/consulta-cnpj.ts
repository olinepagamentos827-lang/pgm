export interface ConsultaCnpjResponse {
  sucesso: boolean
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  situacao?: string
  dataAbertura?: string
  dataSituacao?: string
  erro?: string
}

export async function consultarCnpj(
  cnpj: string
): Promise<ConsultaCnpjResponse> {

  try {

    const cnpjLimpo = cnpj.replace(/\D/g, '')

    const apiKey = process.env.CNPJ_API_KEY

    if (!apiKey) {
      return {
        sucesso: false,
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: cnpjLimpo,
        erro: 'CNPJ_API_KEY ausente'
      }
    }

    const url = `https://snoopintelligence.cloud/api/v2/cnpj?cnpj=${cnpjLimpo}`

    console.log('[SNOOP CONSULTA]', url)

    const resposta = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json'
        },
        cache: 'no-store'
      }
    )

    const texto = await resposta.text()

    console.log('[SNOOP RAW]', texto.substring(0, 300))

    let dados: any

    try {
      dados = JSON.parse(texto)
    } catch {
      return {
        sucesso: false,
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: cnpjLimpo,
        erro: 'Snoop retornou resposta inválida'
      }
    }

    if (!resposta.ok) {
      return {
        sucesso: false,
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: cnpjLimpo,
        erro: `Snoop HTTP ${resposta.status}`
      }
    }

    const empresa = dados.data || dados

    return {
      sucesso: true,

      cnpj: empresa.cnpj || cnpjLimpo,

      razaoSocial:
        empresa.razao_social ||
        empresa.razaoSocial ||
        '',

      nomeFantasia:
        empresa.nome_fantasia ||
        empresa.nomeFantasia ||
        '',

      // Campos que faltavam: sem eles, o filtro de anos em consultarDebitos
      // nunca conseguia detectar abertura/baixa da empresa.
      situacao:
        empresa.situacao ||
        undefined,

      dataAbertura:
        empresa.data_abertura ||
        empresa.dataAbertura ||
        undefined,

      dataSituacao:
        empresa.data_situacao ||
        empresa.dataSituacao ||
        undefined
    }

  } catch (error: any) {
    console.error('[ERRO CONSULTA CNPJ]', error)

    return {
      sucesso: false,
      razaoSocial: '',
      nomeFantasia: '',
      cnpj,
      erro: error.message
    }
  }
}
