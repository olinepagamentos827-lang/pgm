import { createClient } from "@supabase/supabase-js"

// Captura as chaves corretas de servidor e de cliente dependendo do ambiente da Vercel
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// 🔒 Variáveis de cache global para reaproveitar a conexão de rede existente
let supabaseInstance: any = null
let supabaseAdminInstance: any = null

export function getSupabase() {
  if (!supabaseInstance) {
    if (!supabaseUrl) console.warn("⚠️ ALERTA: SUPABASE_URL não foi detectada no ambiente.");
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    if (!supabaseUrl) console.warn("⚠️ ALERTA: SUPABASE_URL não foi detectada no ambiente.");
    // Prioriza a Service Role para operações administrativas
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  }
  return supabaseAdminInstance
}
