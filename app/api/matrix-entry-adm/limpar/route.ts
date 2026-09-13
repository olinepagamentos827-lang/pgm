import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST() {
  const supabase = getSupabaseAdmin()

  // 1. Limpa todos os registros da tabela "pedidos"
  const { error: errorPedidos } = await supabase
    .from("pedidos")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (errorPedidos) {
    return NextResponse.json({ ok: false, error: `Pedidos: ${errorPedidos.message}` }, { status: 500 })
  }

  // 2. Limpa todos os registros da tabela "visitas"
  const { error: errorVisitas } = await supabase
    .from("visitas")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (errorVisitas) {
    return NextResponse.json({ ok: false, error: `Visitas: ${errorVisitas.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
