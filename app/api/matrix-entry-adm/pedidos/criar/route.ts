import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Mapeado de acordo com as colunas reais da sua tabela de apuração do DAS
  const { cnpj, status, valor, chave_pix } = body

  // O CNPJ e o Valor são obrigatórios para gerar a guia DAS
  if (!cnpj || valor === undefined) {
    return NextResponse.json({ ok: false, error: "CNPJ e Valor são campos obrigatórios." }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      cnpj,
      valor: Number(valor) || 0,
      chave_pix: chave_pix || "",
      status: status || "pendente", // Default caso não seja enviado
    })
    .select()
    .single()

  if (error) {
    console.error("Erro ao criar pedido no Supabase:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data })
}
