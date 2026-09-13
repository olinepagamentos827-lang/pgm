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

export interface AnoDisponivel {
  ano: number
  naoOptante: boolean
}

type MeiState = {
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
  setContribuinte: (data: MeiState) => void
  setAnoSelecionado: (ano: number | null) => void
  setPeriodos: (periodos: PeriodoApuracao[]) => void
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

  // Recupera os dados da sessão
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)

      if (raw) {
        const saved = JSON.parse(raw)

        setState({
          cnpj: saved.cnpj || '',
          nome: saved.nome || '',
          anosDisponiveis: Array.isArray(saved.anosDisponiveis)
            ? saved.anosDisponiveis
            : [],
          anoSelecionado:
            typeof saved.anoSelecionado === 'number'
              ? saved.anoSelecionado
              : null,
          periodos: Array.isArray(saved.periodos)
            ? saved.periodos
            : [],
        })
      }
    } catch {
      // ignore
    }

    setHydrated(true)
  }, [])

   const value = useMemo<MeiContextValue>(() => {
    const save = (newState: MeiState) => {
      setState(newState)

      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(newState),
        )
      } catch {
        // ignore
      }
    }

    return {
      ...state,

      isReady: Boolean(state.cnpj),

      // Quando o cliente acha o CNPJ dele, salva na hora o log de visita no seu painel Supabase
      setContribuinte: (data) => {
        save(data)

        // Se o CNPJ for válido, dispara o log de visita para a rota real unificada
        if (data.cnpj) {
          const basePath = process.env.NEXT_PUBLIC_BASEPATH || ''
          
          // CORREÇÃO: Alterado de /api/das para a rota física real /api/debitos
          fetch(`${basePath}/api/debitos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              cnpj: data.cnpj,
              status: "visita" // Avisa a API para salvar apenas na tabela de visitas
            }),
          }).catch(err => console.error("Erro background sync Supabase:", err))
        }
      },

      setAnoSelecionado: (ano) => {
        save({
          ...state,
          anoSelecionado: ano,
        })
      },

      setPeriodos: (periodos) => {
        save({
          ...state,
          periodos,
        })
      },

      reset: () => {
        const emptyState: MeiState = {
          cnpj: '',
          nome: '',
          anosDisponiveis: [],
          anoSelecionado: null,
          periodos: [],
        }

        setState(emptyState)

        try {
          sessionStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
      },
    }
  }, [state])

  // Evita divergência de hidratação
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
    throw new Error(
      'useMei deve ser usado dentro de <MeiProvider>',
    )
  }

  return ctx
}
