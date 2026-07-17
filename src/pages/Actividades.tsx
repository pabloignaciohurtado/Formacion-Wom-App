import { m } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, CalendarClock } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { ETIQUETAS_TIPO, ICONO_TIPO, type Material, type TipoMaterial } from '../lib/materiales'
import { Boton, Esqueleto, MensajeError, Tarjeta } from '../components/ui'
import type { Tables } from '../lib/database.types'

type Actividad = Tables<'actividades'>
type Adjunto = Tables<'actividad_materiales'>

function EstadoLimite({ fecha }: { fecha: string | null }) {
  if (!fecha) return null
  const limite = new Date(`${fecha}T23:59:59`)
  const hoy = new Date()
  const dias = Math.ceil((limite.getTime() - hoy.getTime()) / 86400000)
  const [clase, texto] =
    dias < 0
      ? ['bg-red-100 text-red-700', 'vencida']
      : dias <= 3
        ? ['bg-amber-100 text-amber-700', `vence en ${dias} día${dias === 1 ? '' : 's'}`]
        : ['bg-niebla text-tinta-suave', `hasta el ${limite.toLocaleDateString()}`]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${clase}`}
    >
      <CalendarClock className="size-3.5" />
      {texto}
    </span>
  )
}

export default function Actividades() {
  const { user } = useAuth()
  const [actividades, setActividades] = useState<Actividad[] | null>(null)
  const [completadas, setCompletadas] = useState<Set<string>>(new Set())
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [error, setError] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!user) return
    const [acts, hechas, adj, mats] = await Promise.all([
      supabase
        .from('actividades')
        .select('*')
        .eq('activa', true)
        .order('fecha_limite', { ascending: true, nullsFirst: false }),
      supabase
        .from('actividades_completadas')
        .select('actividad_id')
        .eq('user_id', user.id),
      supabase.from('actividad_materiales').select('*'),
      supabase.from('materiales').select('*').eq('activo', true),
    ])
    setActividades(acts.data ?? [])
    setCompletadas(new Set((hechas.data ?? []).map((h) => h.actividad_id)))
    setAdjuntos(adj.data ?? [])
    setMateriales(mats.data ?? [])
  }, [user])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const materialesPorActividad = useMemo(() => {
    const porId = Object.fromEntries(materiales.map((m) => [m.id, m]))
    const mapa = new Map<string, Material[]>()
    for (const a of adjuntos) {
      const material = porId[a.material_id]
      if (!material) continue
      const lista = mapa.get(a.actividad_id) ?? []
      lista.push(material)
      mapa.set(a.actividad_id, lista)
    }
    return mapa
  }, [adjuntos, materiales])

  const abrirMaterial = async (material: Material) => {
    if (material.storage_path) {
      const { data } = await supabase.storage
        .from('materiales')
        .createSignedUrl(material.storage_path, 60)
      if (data) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } else if (material.url) {
      window.open(material.url, '_blank', 'noopener,noreferrer')
    }
  }

  const marcarCompletada = async (actividad: Actividad) => {
    if (!user) return
    setError(null)
    setMarcando(actividad.id)
    const { error: insertError } = await supabase
      .from('actividades_completadas')
      .insert({ actividad_id: actividad.id, user_id: user.id })
    setMarcando(null)
    if (insertError) {
      setError(insertError.message)
      return
    }
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#4D008C', '#E92070', '#33CC9E'],
    })
    void cargar()
  }

  const pendientes = (actividades ?? []).filter((a) => !completadas.has(a.id))
  const hechas = (actividades ?? []).filter((a) => completadas.has(a.id))

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold lg:text-3xl">
        Actividades obligatorias
      </h1>
      <p className="mt-1 text-tinta-suave">
        Tareas asignadas por el equipo de formación. Márcalas al completarlas.
      </p>

      {error && (
        <div className="mt-4">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      {!actividades ? (
        <div className="mt-6 space-y-3">
          <Esqueleto className="h-28" />
          <Esqueleto className="h-28" />
        </div>
      ) : actividades.length === 0 ? (
        <Tarjeta className="mt-6 p-8 text-center">
          <p className="text-3xl">🎈</p>
          <p className="mt-2 font-semibold">No hay actividades asignadas</p>
          <p className="text-sm text-tinta-suave">
            Cuando el equipo publique una, aparecerá aquí.
          </p>
        </Tarjeta>
      ) : (
        <>
          {pendientes.length > 0 && (
            <ul className="mt-6 space-y-3">
              {pendientes.map((a, i) => (
                <m.li
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Tarjeta>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="flex-1 font-bold">{a.titulo}</h2>
                      <EstadoLimite fecha={a.fecha_limite} />
                    </div>
                    {a.descripcion && (
                      <p className="mt-1 text-sm text-tinta-suave">{a.descripcion}</p>
                    )}
                    {(materialesPorActividad.get(a.id) ?? []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(materialesPorActividad.get(a.id) ?? []).map((mat) => {
                          const Icono = ICONO_TIPO[(mat.tipo as TipoMaterial) ?? 'enlace']
                          return (
                            <button
                              key={mat.id}
                              type="button"
                              onClick={() => void abrirMaterial(mat)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-wom-600/10 px-2.5 py-1 text-xs font-semibold text-wom-600"
                              title={ETIQUETAS_TIPO[(mat.tipo as TipoMaterial) ?? 'enlace']}
                            >
                              <Icono className="size-3.5" />
                              {mat.titulo}
                              <ExternalLink className="size-3" />
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Boton
                        type="button"
                        disabled={marcando === a.id}
                        onClick={() => void marcarCompletada(a)}
                      >
                        <CheckCircle2 className="size-5" />
                        {marcando === a.id ? 'Guardando…' : 'Marcar completada'}
                      </Boton>
                      {a.enlace && (
                        <a
                          href={a.enlace}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-wom-600 hover:underline"
                        >
                          Ver material <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  </Tarjeta>
                </m.li>
              ))}
            </ul>
          )}

          {hechas.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-bold text-tinta-suave">
                Completadas ({hechas.length})
              </h2>
              <ul className="mt-3 space-y-2">
                {hechas.map((a) => (
                  <li key={a.id}>
                    <Tarjeta className="flex items-center gap-3 py-3 opacity-70">
                      <CheckCircle2 className="size-5 shrink-0 text-exito-texto" />
                      <span className="font-medium line-through">{a.titulo}</span>
                    </Tarjeta>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
