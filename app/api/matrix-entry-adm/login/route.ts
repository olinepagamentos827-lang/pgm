import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const validUser = process.env.ADMIN_USER
  const validPass = process.env.ADMIN_PASSWORD

  if (username === validUser && password === validPass) {
    const res = NextResponse.json({ ok: true })
    
    // Captura o basePath oficial ou deixa vazio se não houver
    const basePath = process.env.NEXT_PUBLIC_BASEPATH || '/'

    res.cookies.set("admin_session", "authenticated", {
      httpOnly: true,
      // Desativa o secure apenas em localhost para o cookie não ser descartado pelo navegador nos testes
      secure: process.env.NODE_ENV === "production", 
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      // Garante que o cookie pertença ao escopo correto do basePath do governo
      path: basePath, 
    })
    return res
  }

  return NextResponse.json({ ok: false, error: "Credenciais inválidas" }, { status: 401 })
}
