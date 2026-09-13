import { NextResponse } from 'next/server'
import { consultarDebitos } from '@/lib/consulta-debitos'

/**
 * GET /api/debitos?cnpj=...&nome=...&ano=2023
 *
 * Endpoint consumido pela tela "Emitir Guia de Pagamento (DAS)".
 * A lógica de dados vive em lib/consulta-debitos.ts — plugue a API real lá.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cnpj = searchParams.get('cnpj') ?? ''
  const nome = searchParams.get('nome') ?? ''
  const anoParam = searchParams.get('ano')
  const ano = Number(anoParam) || new Date().getFullYear()

  if (!cnpj) {
    return NextResponse.json(
      { error: 'CNPJ não informado.' },
      { status: 400 },
    )
  }

  try {
    const data = await consultarDebitos(cnpj, nome, ano)
    return NextResponse.json(data)
  } catch (err) {
    console.log('[v0] Erro ao consultar débitos:', err)
    return NextResponse.json(
      { error: 'Falha ao consultar débitos.' },
      { status: 500 },
    )
  }
}
