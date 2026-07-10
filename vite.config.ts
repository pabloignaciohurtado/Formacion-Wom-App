import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const REQUERIDAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

// Sin esta guarda, compilar sin las variables produce un bundle que se ve
// perfecto y revienta en el navegador con el throw de src/lib/supabase.ts.
// Falla aquí, ruidosamente, y cubre todos los destinos: GitHub Pages, Vercel
// y cualquier otro. Verificarlo solo en un workflow no basta: Vercel no usa
// nuestros workflows.
function verificarEntorno(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const faltan = REQUERIDAS.filter((clave) => !env[clave])
  if (faltan.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${faltan.join(', ')}.\n` +
        'En local: copia .env.example a .env y rellena los valores.\n' +
        'En CI o despliegue: defínelas como secrets o variables de entorno.'
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') verificarEntorno(mode)

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Formación WOM',
          short_name: 'Formación WOM',
          description:
            'Plataforma interna de formación WOM: práctica con repaso espaciado, ranking y actividades.',
          lang: 'es',
          display: 'standalone',
          start_url: '.',
          scope: '.',
          theme_color: '#4D008C',
          background_color: '#270046',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
          // No interceptar las llamadas a Supabase
          navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//],
        },
      }),
    ],
  }
})
