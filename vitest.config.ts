import { defineConfig } from 'vitest/config'

// Config aparte de vite.config.ts a propósito: la guarda de variables de
// entorno de aquel solo actúa en `command === 'build'`, pero src/lib/supabase.ts
// lanza al importarse si faltan. Un test de lógica pura no debe necesitar
// credenciales, así que se le dan valores de relleno.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
    },
  },
})
