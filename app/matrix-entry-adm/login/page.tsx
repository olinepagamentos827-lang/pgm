"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1)

    function draw() {
      ctx!.fillStyle = "rgba(0, 0, 0, 0.05)"
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      ctx!.fillStyle = "#00ff41"
      ctx!.font = `${fontSize}px monospace`
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx!.fillText(char, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 33)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener("resize", handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  async function handleLogin() {
    setLoading(true)
    setError("")
    
    try {
      const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''

      // 1. Altera a rota da API antiga para bater na nova pasta matrix-entry-adm
      const res = await fetch(`${basePath}/api/matrix-entry-adm/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        setError("Erro de comunicação com o servidor de autenticação.")
        setLoading(false)
        return
      }

      const data = await res.json()

      if (data.ok) {
        // 2. CORREÇÃO DEFINITIVA: Encaminha para a subpasta correta de pedidos
        router.push("/matrix-entry-adm/pedidos")
      } else {
        setError("ACESSO_NEGADO: credenciais inválidas")
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setError("Falha de conexão: Não foi possível alcançar o servidor.")
      setLoading(false)
    }
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, zIndex: 0 }} />

      <div style={{
        position: "relative", zIndex: 1,
        background: "rgba(0,0,0,0.85)",
        border: "1px solid #00ff41",
        borderRadius: "4px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 0 30px rgba(0,255,65,0.2), inset 0 0 30px rgba(0,0,0,0.5)"
      }}>
        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#00ff41", letterSpacing: "4px", marginBottom: "0.5rem" }}>
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#00ff41", letterSpacing: "4px", textShadow: "0 0 10px #00ff41" }}>
            ADMIN_PANEL
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: "#00aa2a", letterSpacing: "3px" }}>
            EL_BARON
          </p>
          <div style={{ fontSize: "0.7rem", color: "#00ff41", letterSpacing: "4px", marginTop: "0.5rem" }}>
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
          </div>
        </div>

        {/* Campo usuário */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #00ff41", borderRadius: "2px", background: "rgba(0,255,65,0.05)" }}>
            <span style={{ color: "#00ff41", padding: "0 12px", fontSize: "0.9rem" }}>{">"}</span>
            <input
              type="text"
              placeholder="USUÁRIO"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#00ff41", padding: "12px 12px 12px 0",
                fontSize: "0.875rem", letterSpacing: "2px",
                caretColor: "#00ff41"
              }}
            />
          </div>
        </div>

        {/* Campo senha */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #00ff41", borderRadius: "2px", background: "rgba(0,255,65,0.05)" }}>
            <span style={{ color: "#00ff41", padding: "0 12px", fontSize: "0.9rem" }}>{">"}</span>
            <input
              type="password"
              placeholder="SENHA"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#00ff41", padding: "12px 12px 12px 0",
                fontSize: "0.875rem", letterSpacing: "2px",
                caretColor: "#00ff41"
              }}
            />
          </div>
        </div>

        {/* Erro */}
        {error && (
          <p style={{ color: "#ff4141", fontSize: "0.75rem", letterSpacing: "1px", marginBottom: "1rem", textAlign: "center" }}>
            ⚠ {error}
          </p>
        )}

        {/* Botão */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "14px",
            background: "transparent",
            color: "#00ff41", border: "1px solid #00ff41",
            borderRadius: "2px", fontSize: "0.875rem",
            fontWeight: 700, letterSpacing: "3px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            textShadow: "0 0 8px #00ff41",
            boxShadow: "0 0 10px rgba(0,255,65,0.2)",
            fontFamily: "monospace"
          }}
        >
          {loading ? "AUTENTICANDO..." : "- INICIALIZAR_CONEXÃO -"}
        </button>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.65rem", color: "#005510", letterSpacing: "2px" }}>
          admin_net v1.0 // 2026
        </p>
      </div>
    </div>
  )
}
