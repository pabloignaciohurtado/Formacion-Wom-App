import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  cargarAccesosPerfil,
  cargarCatalogoFuncionalidades,
  cargarFuncionalidadesGrupo,
  cargarGruposAcceso,
  guardarAccesosPerfil,
  type Funcionalidad,
  type GrupoAcceso,
} from '../lib/funcionalidades'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>

// Multiselector de acceso a funcionalidades, por usuario. Vive en Admin,
// junto al resto de paneles de gestión de usuarios (AdminEquipo,
// AdminOtorgarInsignias). Todo está habilitado por defecto, salvo lo que
// diga el grupo de acceso asignado (ver "Grupos de Acceso" más abajo en
// Admin): destildar o marcar una casilla aquí crea una EXCEPCIÓN individual
// que manda por sobre el grupo (ver cascada en `lib/funcionalidades.ts`).
export function EditarAccesosUsuario({
  usuarios,
  onCambio,
}: {
  usuarios: Perfil[]
  onCambio?: () => void
}) {
  const [catalogo, setCatalogo] = useState<Funcionalidad[] | null>(null)
  const [grupos, setGrupos] = useState<GrupoAcceso[] | null>(null)
  const [usuarioId, setUsuarioId] = useState('')
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({})
  const [origenes, setOrigenes] = useState<Record<string, 'individual' | 'grupo' | 'default'>>({})
  const [defaults, setDefaults] = useState<Record<string, boolean>>({})
  const [grupoId, setGrupoId] = useState('')
  const [cargandoAccesos, setCargandoAccesos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  useEffect(() => {
    void cargarCatalogoFuncionalidades().then(setCatalogo)
    void cargarGruposAcceso().then(setGrupos)
  }, [])

  const usuarioSeleccionado = usuarios.find((u) => u.id === usuarioId)

  useEffect(() => {
    if (!usuarioId) {
      setSeleccion({})
      setOrigenes({})
      setDefaults({})
      setGrupoId('')
      return
    }
    let cancelado = false
    setCargandoAccesos(true)
    setExito(null)
    setError(null)
    const grupoActual = usuarioSeleccionado?.grupo_acceso_id ?? null
    setGrupoId(grupoActual ?? '')
    Promise.all([
      cargarAccesosPerfil(usuarioId, grupoActual),
      grupoActual ? cargarFuncionalidadesGrupo(grupoActual) : Promise.resolve(new Map<string, boolean>()),
    ]).then(([accesos, accesosGrupo]) => {
      if (cancelado) return
      setSeleccion(Object.fromEntries(accesos.map((a) => [a.id, a.habilitada])))
      setOrigenes(Object.fromEntries(accesos.map((a) => [a.id, a.origen])))
      setDefaults(
        Object.fromEntries(
          (catalogo ?? accesos).map((f) => [f.id, accesosGrupo.get(f.id) ?? true])
        )
      )
      setCargandoAccesos(false)
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId])

  const alternar = (funcionalidadId: string) => {
    setSeleccion((prev) => ({ ...prev, [funcionalidadId]: !prev[funcionalidadId] }))
  }

  const cambiarGrupo = async (nuevoGrupoId: string) => {
    if (!usuarioId) return
    setError(null)
    setExito(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ grupo_acceso_id: nuevoGrupoId || null })
      .eq('id', usuarioId)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setGrupoId(nuevoGrupoId)
    onCambio?.()
    // Recalcula defaults/orígenes con el grupo nuevo, sin perder las
    // excepciones individuales ya guardadas.
    const accesosGrupo = nuevoGrupoId
      ? await cargarFuncionalidadesGrupo(nuevoGrupoId)
      : new Map<string, boolean>()
    setDefaults(
      Object.fromEntries((catalogo ?? []).map((f) => [f.id, accesosGrupo.get(f.id) ?? true]))
    )
    const accesos = await cargarAccesosPerfil(usuarioId, nuevoGrupoId || null)
    setSeleccion(Object.fromEntries(accesos.map((a) => [a.id, a.habilitada])))
    setOrigenes(Object.fromEntries(accesos.map((a) => [a.id, a.origen])))
    const nombre = usuarioSeleccionado?.nombre ?? ''
    setExito(
      nuevoGrupoId
        ? `Grupo de acceso de ${nombre} actualizado.`
        : `${nombre} ya no tiene grupo de acceso asignado.`
    )
  }

  const guardar = async () => {
    if (!usuarioId) return
    setGuardando(true)
    setError(null)
    setExito(null)
    const { error: guardarError } = await guardarAccesosPerfil(usuarioId, seleccion, defaults)
    setGuardando(false)
    if (guardarError) {
      setError(guardarError)
      return
    }
    const accesos = await cargarAccesosPerfil(usuarioId, grupoId || null)
    setOrigenes(Object.fromEntries(accesos.map((a) => [a.id, a.origen])))
    const nombre = usuarioSeleccionado?.nombre ?? ''
    setExito(`Accesos de ${nombre} actualizados.`)
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Acceso a funcionalidades</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Todo usuario tiene acceso a todas las secciones por defecto, salvo lo
        que diga su grupo de acceso (ver "Grupos de Acceso" más abajo). Marcar
        o destildar una casilla aquí crea una <strong>excepción individual</strong>{' '}
        que manda por sobre el grupo, solo para esta persona.
      </p>
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}
      {exito && <p className="mt-3 text-sm font-semibold text-exito-texto">{exito}</p>}
      <Tarjeta className="mt-3 space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="accesos-usuario"
            className="block text-sm font-semibold text-tinta"
          >
            Usuario
          </label>
          <select
            id="accesos-usuario"
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600 sm:max-w-sm"
          >
            <option value="">Selecciona un usuario</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        {!usuarioId ? null : !catalogo || !grupos || cargandoAccesos ? (
          <EstadoCarga texto="Cargando accesos…" />
        ) : (
          <>
            <div className="space-y-1.5">
              <label
                htmlFor="accesos-grupo"
                className="block text-sm font-semibold text-tinta"
              >
                Grupo de acceso
              </label>
              <select
                id="accesos-grupo"
                value={grupoId}
                onChange={(e) => void cambiarGrupo(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600 sm:max-w-sm"
              >
                <option value="">Sin grupo (acceso por defecto)</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">
                Funcionalidades habilitadas para {usuarioSeleccionado?.nombre}
              </legend>
              {catalogo.map((f) => (
                <label
                  key={f.id}
                  htmlFor={`acceso-${f.id}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors hover:bg-wom-50"
                >
                  <input
                    id={`acceso-${f.id}`}
                    type="checkbox"
                    checked={seleccion[f.id] ?? true}
                    onChange={() => alternar(f.id)}
                    className="mt-0.5 size-4 accent-wom-600"
                  />
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-tinta">{f.nombre}</span>
                      {origenes[f.id] === 'individual' && (
                        <span className="rounded-full bg-magenta-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-magenta-500">
                          Excepción
                        </span>
                      )}
                      {origenes[f.id] === 'grupo' && (
                        <span className="rounded-full bg-wom-600/10 px-2 py-0.5 text-[10px] font-bold uppercase text-wom-600">
                          Por grupo
                        </span>
                      )}
                    </span>
                    {f.descripcion && (
                      <span className="block text-xs text-tinta-suave">
                        {f.descripcion}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
            <Boton type="button" disabled={guardando} onClick={() => void guardar()}>
              Guardar accesos
            </Boton>
          </>
        )}
      </Tarjeta>
    </>
  )
}
