"use client"
import { useRouter } from "next/navigation"

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''

    try {
      
      await fetch(`${basePath}/api/matrix-entry-adm/logout`, { method: "POST" })
    } catch (err) {
      console.error("Erro ao limpar sessão no servidor:", err)
    }
    
    
    router.push("/matrix-entry-adm/login")
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "8px 16px", background: "transparent", color: "#fff",
        border: "1px solid rgba(255,255,255,0.4)", borderRadius: "8px",
        fontSize: "0.875rem", cursor: "pointer"
      }}
    >
      Sair
    </button>
  )
}
