import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { otorgarInsigniaManual } from '../lib/insignias'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>
type InsigniaCatalogo = Tables<'insignias'>

// Fila del historial de otorgamientos manuales: `insignias_usuario` con el
// nombre del ejecutivo y del admin resueltos vía join contra `profiles`
// (dos FKs distintas, `user_id` y `otorgado_por`, por eso el alias explícito
// de cada relación).
interface OtorgamientoConNombres {
  insignia_id: string
  obtenida_en: string
  otorgado_por: string | null
  nota: string | null
  ejecutivo: { nombre: string } | null
  admin: { nombre: string } | null
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Otorga a mano las insignias de desempeño (ventas, retención, post-venta,
// habilidades blandas, satisfacción, constancia, cultura): las de formación
// se auto-otorgan (ver `lib/insignias.ts`) y se excluyen aquí a propósito.
// El insert lo permite la policy `insignias_usuario_insert_admin` (RLS),
// aparte de la de auto-otorgamiento propio; la tabla sigue siendo
// solo-anexado (sin UPDATE/DELETE). Cada otorgamiento manual queda con
// `otorgado_por` = el admin que lo hizo (trazabilidad de auditoría), a
// diferencia del auto-otorgamiento del sistema, que guarda `null`.
export function AdminOtorgarInsignias() {
  const { user } = useAuth()
  const [ejecutivos, setEjecutivos] = useState<Perfil[] | null>(null)
  const [catalogo, setCatalogo] = useState<InsigniaCatalogo[] | null>(null)
  const [historial, setHistorial] = useState<OtorgamientoConNombres[] | null>(null)
  const [ejecutivoId, setEjecutivoId] = useState('')
  const [insigniaId, setInsigniaId] = useState('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const cargarHistorial = async () => {
    const { data, error: historialError } = await supabase
      .from('insignias_usuario')
      .select(
        'insignia_id, obtenida_en, otorgado_por, nota, ejecutivo:profiles!insignias_usuario_user_id_fkey(nombre), admin:profiles!insignias_usuario_otorgado_por_fkey(nombre)'
      )
      .not('otorgado_por', 'is', null)
      .order('obtenida_en', { ascending: false })
      .limit(20)
    if (historialError) return
    setHistorial((data as unknown as OtorgamientoConNombres[]) ?? [])
  }

  useEffect(() => {
    const cargar = async () => {
      const [perfiles, insignias] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'ejecutivo')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('insignias')
          .select('*')
          .eq('activa', true)
          .neq('categoria', 'formacion')
          .order('categoria')
          .order('orden'),
      ])
      setEjecutivos(perfiles.data ?? [])
      setCatalogo(insignias.data ?? [])
      await cargarHistorial()
    }
    void cargar()
  }, [])

  const otorgar = async () => {
    if (!ejecutivoId || !insigniaId || !user) return
    setEnviando(true)
    setError(null)
    setExito(null)
    const { error: insertError } = await otorgarInsigniaManual(
      ejecutivoId,
      insigniaId,
      user.id,
      nota
    )
    setEnviando(false)
    // El mensaje de éxito solo se muestra si Supabase confirmó el insert sin
    // error; si insertError viene con datos, se corta acá y se muestra el
    // error en su lugar (nunca un éxito optimista sin confirmación real).
    if (insertError) {
      setError(insertError)
      return
    }
    const nombreInsignia = catalogo?.find((c) => c.id === insigniaId)?.nombre ?? insigniaId
    const nombreEjecutivo = ejecutivos?.find((e) => e.id === ejecutivoId)?.nombre ?? ''
    setExito(`"${nombreInsignia}" otorgada a ${nombreEjecutivo}.`)
    setInsigniaId('')
    setNota('')
    await cargarHistorial()
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Otorgar insignia de desempeño</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Reconoce ventas, retención, post-venta, habilidades blandas, satisfacción, constancia o
        cultura. Las insignias de formación se otorgan solas al cumplir su condición.
      </p>
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}
      {exito && <p className="mt-3 text-sm font-semibold text-exito-texto">{exito}</p>}
      {!ejecutivos || !catalogo ? (
        <EstadoCarga texto="Cargando…" />
      ) : (
        <Tarjeta className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="otorgar-ejecutivo" className="block text-sm font-semibold text-tinta">
                Ejecutivo
              </label>
              <select
                id="otorgar-ejecutivo"
                value={ejecutivoId}
                onChange={(e) => setEjecutivoId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
              >
                <option value="">Selecciona un ejecutivo</option>
                {ejecutivos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label htmlFor="otorgar-insignia" className="block text-sm font-semibold text-tinta">
                Insignia
              </label>
              <select
                id="otorgar-insignia"
                value={insigniaId}
                onChange={(e) => setInsigniaId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
              >
                <option value="">Selecciona una insignia</option>
                {catalogo.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.icono} {i.nombre} ({i.tier})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="otorgar-nota" className="block text-sm font-semibold text-tinta">
              Nota (opcional)
            </label>
            <input
              id="otorgar-nota"
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Motivo del reconocimiento, ej.: mejor NPS del mes"
              maxLength={280}
              className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
            />
          </div>
          <Boton
            type="button"
            disabled={!ejecutivoId || !insigniaId || enviando || !user}
            onClick={() => void otorgar()}
            className="self-start"
          >
            Otorgar insignia
          </Boton>
        </Tarjeta>
      )}

      <h3 className="mt-8 text-base font-bold">Historial de otorgamientos manuales</h3>
      {!historial ? (
        <EstadoCarga texto="Cargando…" />
      ) : historial.length === 0 ? (
        <p className="mt-2 text-sm text-tinta-suave">Todavía no se ha otorgado ninguna a mano.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {historial.map((h, i) => {
            const insignia = catalogo?.find((c) => c.id === h.insignia_id)
            return (
              <li key={`${h.insignia_id}-${i}`}>
                <Tarjeta className="text-sm">
                  <p>
                    <span className="font-semibold">
                      {insignia ? `${insignia.icono} ${insignia.nombre}` : h.insignia_id}
                    </span>{' '}
                    a <span className="font-semibold">{h.ejecutivo?.nombre ?? 'desconocido'}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-tinta-suave">
                    Otorgada por {h.admin?.nombre ?? 'desconocido'} el {formatearFecha(h.obtenida_en)}
                  </p>
                  {h.nota && <p className="mt-1 text-xs italic text-tinta-suave">"{h.nota}"</p>}
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
