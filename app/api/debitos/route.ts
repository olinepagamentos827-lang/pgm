import { NextResponse } from 'next/server'
import { consultarDebitos } from '@/lib/consulta-debitos'

/**
 * POST /api/debitos
 * Corpo da requisição (JSON): { "cnpj": "...", "nome": "...", "ano": 2023 }
 */
// Mantém o GET caso alguma outra tela ainda use parâmetros na URL
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cnpj = searchParams.get('cnpj') ?? ''
  const nome = searchParams.get('nome') ?? ''

  if (!cnpj) {
    return NextResponse.json({ error: 'CNPJ não informado.' }, { status: 400 })
  }

  try {
    // Corrigido: Remove o parâmetro 'ano' que não existe na assinatura da função consultarDebitos
    const data = await consultarDebitos(cnpj, nome)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[API GET ERRO]', err)
    return NextResponse.json({ error: 'Falha ao consultar débitos.' }, { status: 500 })
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
