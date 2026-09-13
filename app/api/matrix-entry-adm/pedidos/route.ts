import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"


export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("criado_em", { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cnpj, valor, status } = body

  if (!cnpj || valor === undefined) {
    return NextResponse.json({ ok: false, error: "CNPJ e Valor são obrigatórios." }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
   
    const { data: configData, error: configError } = await supabase
      .from("config")
      .select("valor")
      .eq("chave", "pix_key")
      .single()

    if (configError) throw new Error("Não foi possível recuperar a chave Pix ativa do painel.")

    const chavePixMomento = configData?.valor || ""

   
    const { data, error: insertError } = await supabase
      .from("pedidos")
      .insert({
        cnpj,
        valor: Number(valor) || 0,
        status: status || "pendente",
        chave_pix: chavePixMomento, 
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    return NextResponse.json({ ok: true, data })

  } catch (err: any) {
    console.error("Erro ao registrar pedido com histórico de Pix:", err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
