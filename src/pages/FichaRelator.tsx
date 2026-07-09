import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Target, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { DOMINIOS } from '../data/contenido'
import { maestriaDominio } from '../lib/srs'
import { ligaDe, xpTotal, XP_ACIERTO, XP_INTENTO } from '../lib/gamificacion'
import { Boton, Esqueleto, MensajeError, Tarjeta } from '../components/ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>
type Meta = Tables<'goals'>

interface Semana {
  etiqueta: string
  xp: number
}

// Barras SVG simples para la evolución semanal (sin librerías)
function GraficoSemanal({ semanas }: { semanas: Semana[] }) {
  const max = Math.max(...semanas.map((s) => s.xp), 1)
  const anchoBarra = 100 / semanas.length
  return (
    <svg viewBox="0 0 100 46" className="w-full">
      {semanas.map((s, i) => {
        const alto = Math.max((s.xp / max) * 36, s.xp > 0 ? 2 : 0.8)
        return (
          <g key={s.etiqueta}>
            <rect
              x={i * anchoBarra + anchoBarra * 0.18}
              y={40 - alto}
              width={anchoBarra * 0.64}
              height={alto}
              rx={1.4}
              className={s.xp > 0 ? 'fill-wom-600' : 'fill-gray-300'}
            />
            <text
              x={i * anchoBarra + anchoBarra / 2}
              y={45}
              textAnchor="middle"
              className="fill-tinta-suave"
              fontSize={2.6}
            >
              {s.etiqueta}
            </text>
            {s.xp > 0 && (
              <text
                x={i * anchoBarra + anchoBarra / 2}
                y={40 - alto - 1.6}
                textAnchor="middle"
                className="fill-tinta"
                fontSize={2.6}
                fontWeight={700}
              >
                {s.xp}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function FichaRelator() {
  const { id } = useParams()
  const { user } = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [maestrias, setMaestrias] = useState<
    { dominio: string; icono: string; valor: number }[]
  >([])
  const [semanas, setSemanas] = useState<Semana[]>([])
  const [stats, setStats] = useState<{ intentos: number; correctas: number } | null>(null)
  const [metas, setMetas] = useState<Meta[]>([])
  const [metaDominio, setMetaDominio] = useState(DOMINIOS[0].id)
  const [metaObjetivo, setMetaObjetivo] = useState('80')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelado = false

    const cargar = async () => {
      const desde = new Date()
      desde.setDate(desde.getDate() - 7 * 8)
      const [p, cards, intentos, metasQ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('srs_cards').select('exercise_id, domain_id, caja').eq('user_id', id),
        supabase
          .from('attempts')
          .select('fecha, correcto')
          .eq('user_id', id)
          .gte('fecha', desde.toISOString()),
        supabase.from('goals').select('*').eq('user_id', id),
      ])
      if (cancelado) return
      setPerfil(p.data)
      setMetas(metasQ.data ?? [])

      const tarjetas = cards.data ?? []
      setMaestrias(
        DOMINIOS.map((d) => ({
          dominio: d.titulo,
          icono: d.icono,
          valor: maestriaDominio(
            tarjetas.filter((c) => c.domain_id === d.id),
            d.ejercicios.length
          ),
        }))
      )

      const filas = intentos.data ?? []
      setStats({
        intentos: filas.length,
        correctas: filas.filter((f) => f.correcto).length,
      })
      // Agrupar XP por semana (lunes) de las últimas 8
      const porSemana = new Map<string, number>()
      for (const f of filas) {
        const fecha = new Date(f.fecha)
        const lunes = new Date(fecha)
        lunes.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7))
        const clave = lunes.toISOString().slice(0, 10)
        porSemana.set(
          clave,
          (porSemana.get(clave) ?? 0) + (f.correcto ? XP_ACIERTO : XP_INTENTO)
        )
      }
      const lista: Semana[] = []
      for (let i = 7; i >= 0; i--) {
        const lunes = new Date()
        lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7) - 7 * i)
        const clave = lunes.toISOString().slice(0, 10)
        lista.push({
          etiqueta: `${lunes.getDate()}/${lunes.getMonth() + 1}`,
          xp: porSemana.get(clave) ?? 0,
        })
      }
      setSemanas(lista)
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [id])

  const asignarMeta = async (event: FormEvent) => {
    event.preventDefault()
    if (!id) return
    setError(null)
    setGuardando(true)
    const { error: e } = await supabase.from('goals').upsert(
      {
        id: `${id}-${metaDominio}`,
        user_id: id,
        domain_id: metaDominio,
        maestria_objetivo: Number(metaObjetivo),
        asignada_por: user?.id ?? null,
      },
      { onConflict: 'id' }
    )
    setGuardando(false)
    if (e) {
      setError(e.message)
      return
    }
    const { data } = await supabase.from('goals').select('*').eq('user_id', id)
    setMetas(data ?? [])
  }

  if (!perfil || !stats) {
    return (
      <section>
        <Esqueleto className="h-9 w-72" />
        <Esqueleto className="mt-6 h-40" />
        <Esqueleto className="mt-4 h-64" />
      </section>
    )
  }

  const liga = ligaDe(perfil.liga)
  const xp = xpTotal(stats.intentos, stats.correctas)
  const precision =
    stats.intentos > 0 ? Math.round((100 * stats.correctas) / stats.intentos) : 0

  return (
    <section>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-sm font-semibold text-wom-600 hover:underline"
      >
        <ArrowLeft className="size-4" /> Volver a Administración
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="grid size-14 place-items-center rounded-full bg-wom-600 text-xl font-bold text-white">
          {perfil.nombre.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">{perfil.nombre}</h1>
          <p className="text-sm text-tinta-suave">{perfil.email}</p>
        </div>
        <span
          className={`rounded-full bg-gradient-to-r ${liga.clase} px-4 py-1.5 text-sm font-bold text-white`}
        >
          {liga.icono} {liga.nombre}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {[
          { valor: `${xp}`, etiqueta: 'XP (8 semanas)', Icono: Zap },
          { valor: `${stats.intentos}`, etiqueta: 'Ejercicios (8 semanas)', Icono: Target },
          { valor: `${precision}%`, etiqueta: 'Precisión', Icono: Target },
        ].map((c) => (
          <Tarjeta key={c.etiqueta}>
            <p className="text-2xl font-extrabold">{c.valor}</p>
            <p className="text-sm text-tinta-suave">{c.etiqueta}</p>
          </Tarjeta>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">Evolución semanal (XP)</h2>
      <Tarjeta className="mt-3">
        <GraficoSemanal semanas={semanas} />
      </Tarjeta>

      <h2 className="mt-8 text-lg font-bold">Maestría por dominio</h2>
      <Tarjeta className="mt-3 space-y-3">
        {maestrias.map((m) => (
          <div key={m.dominio}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold">
                {m.icono} {m.dominio}
              </span>
              <span className="font-bold text-wom-600">{m.valor}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-niebla">
              <div
                className="h-full rounded-full bg-gradient-to-r from-wom-600 to-magenta-500"
                style={{ width: `${m.valor}%` }}
              />
            </div>
          </div>
        ))}
      </Tarjeta>

      <h2 className="mt-8 text-lg font-bold">Metas</h2>
      <Tarjeta className="mt-3">
        {metas.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm">
            {metas.map((m) => {
              const dom = DOMINIOS.find((d) => d.id === m.domain_id)
              const actual =
                maestrias.find((x) => x.dominio === dom?.titulo)?.valor ?? 0
              const cumplida = actual >= m.maestria_objetivo
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${cumplida ? 'bg-exito' : 'bg-amber-400'}`}
                  />
                  <span className="flex-1">
                    {dom?.icono} {dom?.titulo ?? m.domain_id}: meta{' '}
                    {m.maestria_objetivo}% · actual {actual}%
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-tinta-suave">Sin metas asignadas.</p>
        )}

        <form onSubmit={asignarMeta} className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold">
            Dominio
            <select
              value={metaDominio}
              onChange={(e) => setMetaDominio(e.target.value)}
              className="mt-1 block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-wom-600"
            >
              {DOMINIOS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titulo}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Maestría objetivo (%)
            <input
              type="number"
              min={10}
              max={100}
              step={5}
              value={metaObjetivo}
              onChange={(e) => setMetaObjetivo(e.target.value)}
              className="mt-1 block w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-wom-600"
            />
          </label>
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Asignar meta'}
          </Boton>
        </form>
        {error && (
          <div className="mt-3">
            <MensajeError>{error}</MensajeError>
          </div>
        )}
      </Tarjeta>
    </section>
  )
}
