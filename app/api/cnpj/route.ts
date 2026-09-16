import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cnpj = searchParams.get('cnpj')?.replace(/\D/g, '') || ''

    if (!cnpj) {
      return NextResponse.json(
        { sucesso: false, erro: 'CNPJ não informado' },
        { status: 400 }
      )
    }

    const apiKey = process.env.CNPJ_API_KEY

    if (!apiKey) {
      console.error('[CNPJ] API KEY ausente')
      return NextResponse.json(
        { sucesso: false, erro: 'CNPJ_API_KEY não configurada' },
        { status: 500 }
      )
    }

    console.log('[CNPJ] Consultando SNOOP:', cnpj)

    // CORREÇÃO 1: Alterado para o formato de query string correto (?cnpj=...) suportado pela API deles
    const resposta = await fetch(
      `https://snoopintelligence.cloud{cnpj}`,
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
    console.log('[SNOOP RAW]', texto.substring(0, 500))

    let dados: any

    try {
      dados = JSON.parse(texto)
    } catch {
      return NextResponse.json(
        { sucesso: false, erro: 'Snoop não retornou JSON', retorno: texto.substring(0, 200) },
        { status: 502 }
      )
    }

    if (!resposta.ok) {
      return NextResponse.json(
        { sucesso: false, erro: 'Erro Snoop', detalhe: dados },
        { status: resposta.status }
      )
    }

    const empresa = dados?.data || dados

    // CORREÇÃO 2: Mapeamento completo incluindo situação e data_abertura para o filtro de débitos
    return NextResponse.json({
      sucesso: true,
      cnpj: empresa.cnpj || cnpj,
      razaoSocial: empresa.razao_social || empresa.razaoSocial || '',
      nomeFantasia: empresa.nome_fantasia || empresa.nomeFantasia || '',
      situacao: empresa.situacao || '',
      dataSituacao: empresa.data_situacao || empresa.dataSituacao || null,
      dataAbertura: empresa.data_abertura || empresa.dataAbertura || null
    })

  } catch (error: any) {
    console.error('[ERRO API CNPJ]', error)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
