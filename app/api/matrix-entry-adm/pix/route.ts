import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("config")
    .select("*")
    .eq("chave", "pix_key")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const { valor, nome } = await req.json()

  if (!valor || !nome) {
    return NextResponse.json({ ok: false, error: "Preencha todos os campos" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from("config")
    .upsert({ chave: "pix_key", valor, nome }, { onConflict: "chave" })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
