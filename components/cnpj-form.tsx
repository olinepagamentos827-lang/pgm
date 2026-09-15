"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMei } from "@/lib/mei-context"

export function CnpjForm() {
  const router = useRouter()
  const { setContribuinte } = useMei()
  
  const [cnpj, setCnpj] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)

  // Máscara nativa para CNPJ (00.000.000/0000-00)
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 14) value = value.slice(0, 14)
    
    if (value.length > 2 && value.length <= 5) {
      value = value.replace(/^(\d{2})(\d*)/, "$1.$2")
    } else if (value.length > 5 && value.length <= 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d*)/, "$1.$2.$3")
    } else if (value.length > 8 && value.length <= 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d*)/, "$1.$2.$3/$4")
    } else if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d*)/, "$1.$2.$3/$4-$5")
    }

    setCnpj(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cnpjLimpo = cnpj.replace(/\D/g, "")

    if (cnpjLimpo.length !== 14) {
      alert("Por favor, informe um CNPJ completo com 14 dígitos.")
      return
    }

    setLoading(true)

    try {
      const basePath = process.env.__NEXT_ROUTER_BASEPATH || ''
      const anoAtual = new Date().getFullYear()
      
      // Efetua a chamada GET enviando os parâmetros para a rota interna mapeada
      const res = await fetch(`${basePath}/api/debitos?cnpj=${cnpjLimpo}&ano=${anoAtual}`)
      const data = await res.json()

      // CORRIGIDO: Valida se a API do Next.js retornou um objeto de erro estruturado pelo Serpro
      if (res.ok && !data.error && data.periodos) {
        
        setContribuinte({
          cnpj: cnpj, 
          nome: data.nome || "MICROEMPREENDEDOR INDIVIDUAL"
        })

        router.push("/inicio")
      } else {
        // Exibe o alerta real vindo do Serpro/PHP (Ex: Token Expirado ou CNPJ inválido)
        alert(data.error || "Acesso negado: CNPJ inválido ou não localizado na Receita Federal.")
      }
    } catch (err) {
      console.error(err)
      alert("Falha de comunicação: Não foi possível conectar ao servidor de consulta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 font-sans">
      <div className="mx-auto max-w-[350px]">
        
        <div className="mb-4">
          <label 
            htmlFor="cnpj" 
            className="block text-sm font-bold text-[#333] mb-1.5"
          >
            CNPJ completo:
          </label>
          <input
            type="text"
            id="cnpj"
            value={cnpj}
            onChange={handleCnpjChange}
            autoComplete="off"
            placeholder={isFocused ? "__.___.___/____-__" : ""}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full sm:w-60 rounded border border-[#CCC] px-3 py-1.5 text-sm text-[#555] bg-white transition-all outline-none focus:border-[#66AFE9] focus:shadow-[0_0_8px_rgba(102,175,233,0.6)]"
          />
        </div>

        <div className="mb-6 text-[#555] text-[11px] leading-tight font-normal">
          <span className="font-bold text-[#555]">Protegido por hCaptcha</span> <br />
          <a href="https://hcaptcha.com" className="text-[#337AB7] hover:underline">Privacidade</a> e{" "}
          <a href="https://hcaptcha.com" className="text-[#337AB7] hover:underline">Termos e condições</a>.
        </div>

        <div className="text-left">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded border border-[#4cae4c] bg-gradient-to-b from-[#5cb85c] to-[#449d44] px-4 py-1.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:0_-1px_0_rgba(0,0,0,0.2)] hover:border-[#398439] hover:from-[#449d44] hover:to-[#419641] transition-all cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed min-w-[90px]"
          >
            {loading ? (
              <svg 
                className="animate-spin h-5 w-5 text-white" 
                xmlns="http://w3.org" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                />
              </svg>
            ) : (
              "Continuar"
            )}
          </button>
        </div>

      </div>
    </form>
  )
}
