import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>
type InsigniaCatalogo = Tables<'insignias'>

// Otorga a mano las insignias de desempeño (ventas, retención, post-venta,
// habilidades blandas, satisfacción, constancia, cultura): las de formación
// se auto-otorgan (ver `lib/insignias.ts`) y se excluyen aquí a propósito.
// El insert lo permite la policy `insignias_usuario_insert_admin` (RLS),
// aparte de la de auto-otorgamiento propio; la tabla sigue siendo
// solo-anexado (sin UPDATE/DELETE).
export function AdminOtorgarInsignias() {
  const [ejecutivos, setEjecutivos] = useState<Perfil[] | null>(null)
  const [catalogo, setCatalogo] = useState<InsigniaCatalogo[] | null>(null)
  const [ejecutivoId, setEjecutivoId] = useState('')
  const [insigniaId, setInsigniaId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

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
    }
    void cargar()
  }, [])

  const otorgar = async () => {
    if (!ejecutivoId || !insigniaId) return
    setEnviando(true)
    setError(null)
    setExito(null)
    const { error: insertError } = await supabase.from('insignias_usuario').upsert(
      { user_id: ejecutivoId, insignia_id: insigniaId },
      { onConflict: 'user_id,insignia_id', ignoreDuplicates: true }
    )
    setEnviando(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    const nombreInsignia = catalogo?.find((c) => c.id === insigniaId)?.nombre ?? insigniaId
    const nombreEjecutivo = ejecutivos?.find((e) => e.id === ejecutivoId)?.nombre ?? ''
    setExito(`"${nombreInsignia}" otorgada a ${nombreEjecutivo}.`)
    setInsigniaId('')
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
        <Tarjeta className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
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
          <Boton
            type="button"
            disabled={!ejecutivoId || !insigniaId || enviando}
            onClick={() => void otorgar()}
            className="sm:self-end"
          >
            Otorgar insignia
          </Boton>
        </Tarjeta>
      )}
    </>
  )
}
