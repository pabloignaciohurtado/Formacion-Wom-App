import type { ReactNode } from 'react'
import { MarcaWom } from './MarcaWom'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh grid lg:grid-cols-2 bg-wom-900">
      {/* Panel de marca (desktop) */}
      <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-wom-900 via-wom-700 to-wom-600 text-white">
        <MarcaWom clara />
        <div>
          <h2 className="text-4xl font-extrabold leading-tight max-w-md">
            Entrena, repasa y conviértete en un{' '}
            <span className="text-magenta-500">héroe WOM</span>.
          </h2>
          <p className="mt-4 text-wom-100 max-w-md">
            Ejercicios con repaso inteligente que se adapta a ti: lo que
            aciertas se espacia, lo que fallas vuelve pronto.
          </p>
        </div>
        <p className="text-sm text-wom-300">Plataforma interna de formación</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center p-6 bg-niebla">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <MarcaWom />
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
