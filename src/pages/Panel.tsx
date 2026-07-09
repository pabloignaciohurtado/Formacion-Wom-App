import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Flame, Trophy, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Esqueleto, Tarjeta } from '../components/ui'
import { ContadorAnimado } from '../components/ContadorAnimado'
import { InsigniaModal } from '../components/InsigniaModal'
import { nivelDe, xpTotal } from '../lib/gamificacion'
import { DOMINIOS } from '../data/contenido'
import { maestriaDominio } from '../lib/srs'
import {
  INSIGNIAS,
  sincronizarInsignias,
  type Insignia,
} from '../lib/insignias'

interface Datos {
  intentos: number
  correctas: number
  repasosPendientes: number
  racha: number
  ranking: {
    user_id: string
    nombre: string
    xp: number
    posicion: number
  }[]
  heroes: { nombre: string; xp: number; posicion: number }[]
  insignias: Set<string>
}

const MEDALLAS = ['🥇', '🥈', '🥉']

export default function Panel() {
  const { user, perfil } = useAuth()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [colaInsignias, setColaInsignias] = useState<Insignia[]>([])

  useEffect(() => {
    if (!user || !perfil) return
    let cancelado = false

    const cargar = async () => {
      const ahora = new Date().toISOString()
      const [
        intentos,
        correctas,
        repasos,
        racha,
        ranking,
        heroes,
        cards,
        actividades,
        completadas,
        obtenidas,
      ] = await Promise.all([
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('correcto', true),
        supabase
          .from('srs_cards')
          .select('exercise_id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lte('proximo_repaso', ahora),
        supabase.rpc('mi_racha'),
        supabase.rpc('ranking_semanal'),
        supabase.rpc('heroes_semana'),
        supabase.from('srs_cards').select('exercise_id, domain_id, caja').eq('user_id', user.id),
        supabase.from('actividades').select('id').eq('activa', true),
        supabase
          .from('actividades_completadas')
          .select('actividad_id')
          .eq('user_id', user.id),
        supabase
          .from('insignias_usuario')
          .select('insignia_id')
          .eq('user_id', user.id),
      ])
      if (cancelado) return

      const insignias = new Set((obtenidas.data ?? []).map((i) => i.insignia_id))
      setDatos({
        intentos: intentos.count ?? 0,
        correctas: correctas.count ?? 0,
        repasosPendientes: repasos.count ?? 0,
        racha: racha.data ?? 0,
        ranking: ranking.data ?? [],
        heroes: heroes.data ?? [],
        insignias,
      })

      // Evaluar y otorgar insignias nuevas
      const tarjetas = cards.data ?? []
      const tieneDominio100 = DOMINIOS.some((d) => {
        const delDominio = tarjetas.filter((c) => c.domain_id === d.id)
        return (
          delDominio.length > 0 &&
          maestriaDominio(delDominio, d.ejercicios.length) === 100
        )
      })
      const idsActivas = new Set((actividades.data ?? []).map((a) => a.id))
      const hechas = new Set((completadas.data ?? []).map((c) => c.actividad_id))
      const obligatoriasAlDia =
        idsActivas.size > 0 && [...idsActivas].every((id) => hechas.has(id))
      const nuevas = await sincronizarInsignias(
        user.id,
        {
          intentos: intentos.count ?? 0,
          racha: racha.data ?? 0,
          tieneDominio100,
          fueHeroe: (heroes.data ?? []).some((h) => h.nombre === perfil.nombre),
          obligatoriasAlDia,
        },
        insignias
      )
      if (!cancelado && nuevas.length > 0) {
        setColaInsignias(nuevas)
        setDatos((prev) =>
          prev
            ? {
                ...prev,
                insignias: new Set([
                  ...prev.insignias,
                  ...nuevas.map((n) => n.id),
                ]),
              }
            : prev
        )
      }
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [user, perfil])

  const nombrePila = (perfil?.nombre ?? '').split(/[\s.]+/)[0] || 'relator'

  if (!datos) {
    return (
      <section>
        <Esqueleto className="h-9 w-64" />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Esqueleto key={i} className="h-36" />
          ))}
        </div>
        <Esqueleto className="mt-6 h-64" />
      </section>
    )
  }

  const xp = xpTotal(datos.intentos, datos.correctas)
  const nivel = nivelDe(xp)
  const miPosicion = datos.ranking.find((r) => r.user_id === user?.id)

  const tarjetas = [
    {
      clave: 'racha',
      valor: datos.racha,
      etiqueta: datos.racha === 1 ? 'día de racha' : 'días de racha',
      Icono: Flame,
      color: 'text-magenta-500 bg-magenta-500/10',
    },
    {
      clave: 'repasos',
      valor: datos.repasosPendientes,
      etiqueta: 'Repasos pendientes hoy',
      Icono: Dumbbell,
      color: 'text-wom-600 bg-wom-600/10',
    },
    {
      clave: 'xp',
      valor: xp,
      etiqueta: 'XP acumulados',
      Icono: Zap,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      clave: 'posicion',
      valor: miPosicion?.posicion ?? 0,
      etiqueta: 'Tu lugar esta semana',
      Icono: Trophy,
      color: 'text-exito bg-exito/10',
      prefijo: '#',
    },
  ]

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold lg:text-3xl">
            Hola, <span className="capitalize">{nombrePila}</span> 👋
          </h1>
          <p className="mt-1 text-tinta-suave">Este es tu estado de formación.</p>
        </div>
        <span className="rounded-full bg-gradient-to-r from-wom-600 to-magenta-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-wom-600/20">
          {nivel.actual.nombre}
        </span>
      </div>

      {/* Nivel y progreso */}
      <Tarjeta className="mt-6">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-wom-600">{nivel.actual.nombre}</span>
          {nivel.siguiente ? (
            <span className="text-tinta-suave">
              {nivel.siguiente.min - xp} XP para {nivel.siguiente.nombre}
            </span>
          ) : (
            <span className="text-magenta-500">¡Nivel máximo!</span>
          )}
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-niebla">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(nivel.progreso * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-wom-600 to-magenta-500"
          />
        </div>
      </Tarjeta>

      {/* Métricas */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tarjetas.map(({ clave, valor, etiqueta, Icono, color, prefijo }, i) => (
          <motion.div
            key={clave}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35, ease: 'easeOut' }}
          >
            <Tarjeta className="flex h-full flex-col gap-3">
              <span className={`grid size-10 place-items-center rounded-xl ${color}`}>
                <Icono className="size-5" />
              </span>
              <div>
                <p className="text-3xl font-extrabold">
                  {prefijo && valor === 0 ? (
                    '—'
                  ) : (
                    <>
                      {prefijo}
                      <ContadorAnimado valor={valor} />
                    </>
                  )}
                </p>
                <p className="text-sm text-tinta-suave">{etiqueta}</p>
              </div>
            </Tarjeta>
          </motion.div>
        ))}
      </div>

      <Link
        to="/ejercicios"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-magenta-500 px-6 py-3 font-semibold text-white shadow-lg shadow-magenta-500/25 transition-all hover:bg-magenta-600 active:scale-[0.98]"
      >
        <Flame className="size-5" />
        {datos.repasosPendientes > 0
          ? `Repasar ahora (${datos.repasosPendientes} pendientes)`
          : 'Ir a practicar'}
      </Link>

      {/* Héroes de la semana pasada */}
      {datos.heroes.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold">🏆 Héroes de la semana</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {datos.heroes.map((h, i) => (
              <motion.div
                key={h.nombre}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.12, type: 'spring', bounce: 0.4 }}
              >
                <Tarjeta
                  className={`flex items-center gap-3 ${
                    h.posicion === 1 ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  <span className="text-3xl">{MEDALLAS[h.posicion - 1] ?? '🏅'}</span>
                  <div>
                    <p className="font-bold">{h.nombre}</p>
                    <p className="text-sm text-tinta-suave">{h.xp} XP la semana pasada</p>
                  </div>
                </Tarjeta>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Vitrina de insignias */}
      <h2 className="mt-8 text-lg font-bold">Tus insignias</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {INSIGNIAS.map((insignia) => {
          const obtenida = datos.insignias.has(insignia.id)
          return (
            <Tarjeta
              key={insignia.id}
              className={`flex flex-col items-center gap-1 p-3 text-center ${
                obtenida ? '' : 'opacity-45 grayscale'
              }`}
            >
              <span className="text-3xl">{obtenida ? insignia.icono : '🔒'}</span>
              <span className="text-xs font-bold leading-tight">
                {insignia.nombre}
              </span>
              <span className="text-[10px] leading-tight text-tinta-suave">
                {insignia.descripcion}
              </span>
            </Tarjeta>
          )
        })}
      </div>

      {/* Ranking semanal */}
      <h2 className="mt-8 text-lg font-bold">Ranking de la semana</h2>
      <Tarjeta className="mt-3 p-0">
        <ul>
          {datos.ranking.map((r) => {
            const esYo = r.user_id === user?.id
            return (
              <li
                key={r.user_id}
                className={`flex items-center gap-3 border-b border-niebla px-5 py-3 last:border-0 ${
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
                </span>
                <span className="flex items-center gap-1 font-bold text-magenta-500">
                  <Zap className="size-4 fill-current" />
                  {r.xp}
                </span>
              </li>
            )
          })}
        </ul>
      </Tarjeta>

      <InsigniaModal
        insignia={colaInsignias[0] ?? null}
        onCerrar={() => setColaInsignias((cola) => cola.slice(1))}
      />
    </section>
  )
}
