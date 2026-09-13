/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🏛️ Caminho oficial injetado após o domínio (Governo)
  basePath: '/SimplesNacional/Aplicacoes/ATSPO/pgmei.app',

  // 🌍 Expõe as variáveis com segurança tanto para o Servidor quanto para o Navegador
  env: {
    NEXT_PUBLIC_BASEPATH: '/SimplesNacional/Aplicacoes/ATSPO/pgmei.app',
    API_RECEITA_URL: process.env.API_RECEITA_URL,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: true,
  },

  // 🔒 HEADERS DE SEGURANÇA (PROTEÇÃO MÁXIMA HOMOLOGADA)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Proteção Anti-Clickjacking (Bloqueia o site dentro de iframes maliciosos)
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none';" },
        ],
      },
    ];
  },
}

export default nextConfig;
