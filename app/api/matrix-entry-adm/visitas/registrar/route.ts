import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { placa } = await req.json()

    if (!placa) {
      return NextResponse.json({ ok: false, error: "Placa é obrigatória." }, { status: 400 })
    }

    // O IP real do cliente só existe nos headers da requisição no servidor —
    // não dá pra capturar isso direto no navegador.
    const forwardedFor = req.headers.get("x-forwarded-for")
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : req.headers.get("x-real-ip") ?? "desconhecido"

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from("visitas")
      .insert({ placa: String(placa).toUpperCase(), ip })

    if (error) {
      console.error("Erro ao registrar visita:", error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Erro geral ao registrar visita:", err)
    return NextResponse.json({ ok: false, error: "Erro interno." }, { status: 500 })
  }
}