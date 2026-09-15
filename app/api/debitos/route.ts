import { NextResponse } from 'next/server'
import { consultarDebitos } from '@/lib/consulta-debitos'

/**
 * POST /api/debitos
 * Corpo da requisição (JSON): { "cnpj": "...", "nome": "...", "ano": 2023 }
 */
export async function POST(request: Request) {
  try {
    // Captura os dados enviados no corpo (body) da requisição POST
    const body = await request.json()
    
    const cnpj = body.cnpj ?? ''
    const nome = body.nome ?? ''
    const ano = Number(body.ano) || new Date().getFullYear()

    if (!cnpj) {
      return NextResponse.json(
        { error: 'CNPJ não informado.' },
        { status: 400 },
      )
    }

    const data = await consultarDebitos(cnpj, nome, ano)
    return NextResponse.json(data)

  } catch (err: any) {
    console.log('[v0] Erro ao consultar débitos:', err)
    return NextResponse.json(
      { error: 'Falha ao consultar débitos.', details: err.message },
      { status: 500 },
    )
  }
}

// Mantém o GET caso alguma outra tela ainda use parâmetros na URL
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cnpj = searchParams.get('cnpj') ?? ''
  const nome = searchParams.get('nome') ?? ''
  const anoParam = searchParams.get('ano')
  const ano = Number(anoParam) || new Date().getFullYear()

  if (!cnpj) {
    return NextResponse.json({ error: 'CNPJ não informado.' }, { status: 400 })
  }

  try {
    const data = await consultarDebitos(cnpj, nome, ano)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao consultar débitos.' }, { status: 500 })
  }
}
