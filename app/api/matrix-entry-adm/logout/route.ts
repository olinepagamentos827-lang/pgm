import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  
  // Captura o basePath oficial para saber exatamente qual cookie apagar
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || '/'

  // Limpa o cookie de sessão limpando o valor e definindo maxAge para 0 no path correto
  res.cookies.set("admin_session", "", { 
    maxAge: 0, 
    path: basePath 
  })
  
  return res
}
