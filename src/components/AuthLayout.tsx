import type { ReactNode } from 'react'
import { MarcaWom } from './MarcaWom'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh grid lg:grid-cols-2 bg-wom-950">
      {/* Panel de marca (desktop) — hero vivo */}
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between bg-[radial-gradient(120%_120%_at_0%_0%,var(--color-wom-700),var(--color-wom-950)_70%)]">
        {/* Orbes de gradiente en movimiento (se detienen con reduced-motion) */}
        <div className="wom-orbe wom-orbe-a" aria-hidden />
        <div className="wom-orbe wom-orbe-b" aria-hidden />
        <div className="wom-orbe wom-orbe-c" aria-hidden />

        <div className="relative z-10">
          <MarcaWom clara />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-magenta-500">
            Plataforma interna
          </p>
          <h2 className="mt-3 max-w-[12ch] text-5xl font-black leading-[0.95] tracking-[-0.03em]">
            Entrena, repasa y conviértete en un{' '}
            <span className="text-magenta-500">héroe WOM</span>.
          </h2>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-wom-100">
            Ejercicios con repaso inteligente que se adapta a ti: lo que
            aciertas se espacia, lo que fallas vuelve pronto.
          </p>
        </div>
        <p className="relative z-10 text-sm text-wom-300">
          Repaso espaciado · Ligas semanales · Insignias
        </p>
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
