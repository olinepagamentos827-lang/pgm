import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("visitas")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(500) // limite de segurança pra não trazer histórico infinito de uma vez

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data })
}