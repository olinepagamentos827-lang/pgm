'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface PeriodoApuracao {
  id: string
  rotulo: string
  apurado: boolean
  beneficioInss: boolean
  principal: number | null
  multa: number | null
  juros: number | null
  total: number | null
  dataVencimento: string | null
  dataAcolhimento: string | null
}

// CORRIGIDO: Sincronizado perfeitamente com a tipagem da resposta do seu backend
export interface AnoDisponivel {
  ano: number
  bloqueado: boolean
  motivo?: string
}

export type MeiState = {
  /** CNPJ com máscara: 00.000.000/0000-00 */
  cnpj: string

  /** Nome/Razão social retornado pela API */
  nome: string

  /** Anos encontrados no histórico do CNPJ */
  anosDisponiveis: AnoDisponivel[]

  /** Ano atualmente selecionado */
  anoSelecionado: number | null

  /** Períodos/débitos do ano selecionado */
  periodos: PeriodoApuracao[]
}

type MeiContextValue = MeiState & {
  setContribuinte: (data: Partial<MeiState>) => void
  setAnoSelecionado: (ano: number | null) => void
  setPeriodos: (periodos: PeriodoApuracao[]) => void
  setAnosDisponiveis: (anos: AnoDisponivel[]) => void
  reset: () => void
  isReady: boolean
}

const STORAGE_KEY = 'comercial-brasil:contribuinte'

const MeiContext = createContext<MeiContextValue | null>(null)

export function MeiProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MeiState>({
    cnpj: '',
    nome: '',
    anosDisponiveis: [],
    anoSelecionado: null,
    periodos: [],
  })

  const [hydrated, setHydrated] = useState(false)

  // Recupera os dados da sessão na inicialização
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)

      if (raw) {
        const saved = JSON.parse(raw)

        setState({
          cnpj: saved.cnpj || '',
          nome: saved.nome || '',
          anosDisponiveis: Array.isArray(saved.anosDisponiveis) ? saved.anosDisponiveis : [],
          anoSelecionado: typeof saved.anoSelecionado === 'number' ? saved.anoSelecionado : null,
          periodos: Array.isArray(saved.periodos) ? saved.periodos : [],
        })
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Função auxiliar de salvamento utilizando o estado funcional para evitar dados desatualizados (stale state)
  const saveState = (updater: (prev: MeiState) => MeiState) => {
    setState((prev) => {
      const next = updater(prev)
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const value = useMemo<MeiContextValue>(() => {
    return {
      ...state,

      isReady: Boolean(state.cnpj),

      setContribuinte: (data) => {
        saveState((prev) => ({
          cnpj: data.cnpj ?? prev.cnpj,
          nome: data.nome ?? prev.nome,
          anosDisponiveis: data.anosDisponiveis ?? prev.anosDisponiveis,
          anoSelecionado: data.anoSelecionado ?? prev.anoSelecionado,
          periodos: data.periodos ?? prev.periodos,
        }))

        if (data.cnpj) {
          const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
          
          fetch(`${basePath}/api/debitos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              cnpj: data.cnpj.replace(/\D/g, ""),
              status: "visita" 
            }),
          }).catch(err => console.error("Erro background sync Supabase:", err))
        }
      },

      setAnoSelecionado: (ano) => {
        saveState((prev) => ({
          ...prev,
          anoSelecionado: ano,
        }))
      },

      setAnosDisponiveis: (anos) => {
        saveState((prev) => ({
          ...prev,
          anosDisponiveis: anos,
        }))
      },

      setPeriodos: (periodos) => {
        saveState((prev) => ({
          ...prev,
          periodos,
        }))
      },

      reset: () => {
        setState({
          cnpj: '',
          nome: '',
          anosDisponiveis: [],
          anoSelecionado: null,
          periodos: [],
        })

        try {
          sessionStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
      },
    }
  }, [state])

  if (!hydrated) return null

  return (
    <MeiContext.Provider value={value}>
      {children}
    </MeiContext.Provider>
  )
}

export function useMei() {
  const ctx = useContext(MeiContext)

  if (!ctx) {
    throw new Error('useMei deve ser usado dentro de <MeiProvider>')
  }

  return ctx
}
