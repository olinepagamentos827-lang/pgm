import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("config")
    .select("valor")
    .eq("chave", "modo_pagamento")
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, modo: data?.valor ?? "pix" })
}

export async function POST(req: NextRequest) {
  const { modo } = await req.json()
  if (!["pix", "podpay"].includes(modo)) {
    return NextResponse.json({ ok: false, error: "Modo inválido" }, { status: 400 })
  }
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from("config")
    .upsert({ chave: "modo_pagamento", valor: modo, nome: "Modo de Pagamento" })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
