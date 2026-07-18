import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { m, useReducedMotion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Esqueleto, Tarjeta } from '../components/ui'
import {
  MEDALLAS,
  deltaSemanal,
  ligaDe,
  zonaLiga,
} from '../lib/gamificacion'

interface Datos {
  // El ranking y los héroes miden PUNTAJE SEMANAL, no XP: son cosas
  // distintas (el XP acumulado define el nivel; el puntaje, la liga).
  // El ranking es de la DIVISIÓN del usuario (sus pares del mismo tier), no
  // global: competir contra todos desmotiva al que va detrás.
  ranking: {
    user_id: string
    nombre: string
    liga: string
    puntaje: number
    posicion: number
    compiten: number
  }[]
  heroes: { nombre: string; puntaje: number; posicion: number }[]
  progreso: { actual: number; anterior: number }
}

export default function Liga() {
  const { user, perfil } = useAuth()
  const reduce = useReducedMotion()
  const [datos, setDatos] = useState<Datos | null>(null)

  useEffect(() => {
    if (!user || !perfil) return
    let cancelado = false

    const cargar = async () => {
      const [ranking, heroes, progreso] = await Promise.all([
        supabase.rpc('ranking_division'),
        supabase.rpc('heroes_semana'),
        supabase.rpc('mi_progreso_semanal'),
      ])
      if (cancelado) return
      setDatos({
        ranking: ranking.data ?? [],
        heroes: heroes.data ?? [],
        progreso: progreso.data?.[0] ?? { actual: 0, anterior: 0 },
      })
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [user, perfil])

  if (!datos) {
    return (
      <section>
        <Esqueleto className="h-9 w-64" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-20" />
          ))}
        </div>
        <Esqueleto className="mt-6 h-72" />
      </section>
    )
  }

  const compiten = datos.ranking[0]?.compiten ?? 0
  const miLiga = ligaDe(perfil?.liga)
  const delta = deltaSemanal(datos.progreso.actual, datos.progreso.anterior)

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold lg:text-3xl">
            Tu liga: <span title={miLiga.nombre}>{miLiga.icono}</span> {miLiga.nombre}
          </h1>
          <p className="mt-1 text-tinta-suave">
            Ranking semanal de tu división y héroes de la semana pasada.
          </p>
        </div>
        <span className="text-sm font-semibold text-tinta-suave">
          {compiten} compitiendo esta semana
        </span>
      </div>

      {/* Héroes de la semana pasada */}
      {datos.heroes.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-bold">🏆 Héroes de la semana</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {datos.heroes.map((h, i) => (
              <m.div
                key={h.nombre}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: reduce ? 0 : 0.1 + i * 0.1,
                  type: 'spring',
                  bounce: 0.4,
                }}
              >
                <Tarjeta
                  className={`flex items-center gap-3 ${
                    h.posicion === 1 ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  <span className="text-3xl">{MEDALLAS[h.posicion - 1] ?? '🏅'}</span>
                  <div>
                    <p className="font-bold">{h.nombre}</p>
                    <p className="text-sm text-tinta-suave">
                      {h.puntaje} puntos la semana pasada
                    </p>
                  </div>
                </Tarjeta>
              </m.div>
            ))}
          </div>
        </>
      )}

      {/* Auto-competencia: contra tu propia semana anterior */}
      <h2 className="mt-8 text-lg font-bold">Ranking de tu liga</h2>
      <Tarjeta className="mt-3 flex flex-wrap items-center justify-between gap-2 py-3">
        <span className="text-sm font-medium text-tinta-suave">
          Llevas <strong className="text-tinta">{datos.progreso.actual} pts</strong> · a esta
          altura la semana pasada: {datos.progreso.anterior}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            delta.sentido === 'mejor'
              ? 'bg-exito/10 text-exito-texto'
              : delta.sentido === 'peor'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-niebla text-tinta-suave'
          }`}
        >
          {delta.sentido === 'mejor'
            ? `▲ +${delta.diff} vs. tu semana pasada`
            : delta.sentido === 'peor'
              ? `${delta.diff} — aún puedes remontar`
              : 'Igual que tu semana pasada'}
        </span>
      </Tarjeta>

      <Tarjeta className="mt-3 p-0">
        <ul>
          {datos.ranking.map((r) => {
            const esYo = r.user_id === user?.id
            const zona = zonaLiga({
              liga: r.liga,
              posicion: r.posicion,
              compiten,
              puntaje: r.puntaje,
            })
            const borde =
              zona === 'sube'
                ? 'border-l-4 border-l-exito'
                : zona === 'baja'
                  ? 'border-l-4 border-l-red-400'
                  : 'border-l-4 border-l-transparent'
            return (
              <li
                key={r.user_id}
                className={`flex items-center gap-3 border-b border-niebla px-5 py-3 last:border-0 ${borde} ${
                  esYo ? 'bg-wom-50' : ''
                }`}
              >
                <span
                  className={`w-8 text-center font-extrabold ${
                    r.posicion <= 3 ? 'text-xl' : 'text-tinta-suave'
                  }`}
                >
                  {MEDALLAS[r.posicion - 1] ?? `#${r.posicion}`}
                </span>
                <span className="flex-1 font-semibold">
                  {r.nombre}
                  {esYo && (
                    <span className="ml-2 rounded-full bg-wom-600 px-2 py-0.5 text-xs font-bold text-white">
                      tú
                    </span>
                  )}
                  {zona === 'sube' && (
                    <span className="ml-2 rounded-full bg-exito/10 px-2 py-0.5 text-xs font-bold text-exito-texto">
                      ▲ asciende
                    </span>
                  )}
                  {zona === 'baja' && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      ▼ desciende
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 font-bold text-magenta-500">
                  <Zap className="size-4 fill-current" />
                  {r.puntaje} pts
                </span>
              </li>
            )
          })}
        </ul>
      </Tarjeta>
      <p className="mt-2 px-1 text-xs text-tinta-suave">
        Compites solo contra tu liga. El <strong>top 2 asciende</strong> (con 4 o más
        compitiendo); quien queda en 0 desciende{' '}
        {perfil?.liga === 'bronce' ? '(en Bronce no se baja)' : ''}. El corte es cada lunes.
      </p>
    </section>
  )
}
