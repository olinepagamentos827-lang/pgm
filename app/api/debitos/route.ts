import { NextResponse } from 'next/server'
import { consultarDebitos } from '@/lib/consulta-debitos'

/**
 * POST /api/debitos
 * Corpo da requisição (JSON): { "cnpj": "...", "nome": "..." }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const cnpj = body.cnpj ?? ''
    const nome = body.nome ?? ''

    if (!cnpj) {
      return NextResponse.json(
        { error: 'CNPJ não informado.' },
        { status: 400 },
      )
    }

    const data = await consultarDebitos(cnpj, nome)
    return NextResponse.json(data)

  } catch (err: any) {
    console.log('[v0] Erro ao consultar débitos:', err)
    return NextResponse.json(
      { error: 'Falha ao consultar débitos.', details: err.message },
      { status: 500 },
    )
  }
}

/**
 * GET /api/debitos?cnpj=...&nome=...
 * Mantém suporte para chamadas via Query String (como o useSWR do seu front-end)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cnpj = searchParams.get('cnpj') ?? ''
    const nome = searchParams.get('nome') ?? ''

    if (!cnpj) {
      return NextResponse.json(
        { error: 'CNPJ não informado.' }, 
        { status: 400 }
      )
    }

    // Corrigido: Removido o argumento 'ano' para bater perfeitamente com a assinatura da função
    const data = await consultarDebitos(cnpj, nome)
    return NextResponse.json(data)

  } catch (err: any) {
    console.error('[API GET ERRO]', err)
    return NextResponse.json(
      { error: 'Falha ao consultar débitos.', details: err.message }, 
      { status: 500 }
    )
  }
}
