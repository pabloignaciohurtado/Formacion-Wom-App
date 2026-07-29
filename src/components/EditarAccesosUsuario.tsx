import { useEffect, useState } from 'react'
import {
  cargarAccesosPerfil,
  cargarCatalogoFuncionalidades,
  guardarAccesosPerfil,
  type Funcionalidad,
} from '../lib/funcionalidades'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>

// Multiselector de acceso a funcionalidades, por usuario. Vive en Admin,
// junto al resto de paneles de gestión de usuarios (AdminEquipo,
// AdminOtorgarInsignias). Todo está habilitado por defecto: destildar una
// casilla es lo único que crea una fila de restricción en
// `perfil_funcionalidades` (ver `lib/funcionalidades.ts`).
export function EditarAccesosUsuario({ usuarios }: { usuarios: Perfil[] }) {
  const [catalogo, setCatalogo] = useState<Funcionalidad[] | null>(null)
  const [usuarioId, setUsuarioId] = useState('')
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({})
  const [cargandoAccesos, setCargandoAccesos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  useEffect(() => {
    void cargarCatalogoFuncionalidades().then(setCatalogo)
  }, [])

  useEffect(() => {
    if (!usuarioId) {
      setSeleccion({})
      return
    }
    let cancelado = false
    setCargandoAccesos(true)
    setExito(null)
    setError(null)
    void cargarAccesosPerfil(usuarioId).then((accesos) => {
      if (cancelado) return
      setSeleccion(
        Object.fromEntries(accesos.map((a) => [a.id, a.habilitada]))
      )
      setCargandoAccesos(false)
    })
    return () => {
      cancelado = true
    }
  }, [usuarioId])

  const alternar = (funcionalidadId: string) => {
    setSeleccion((prev) => ({ ...prev, [funcionalidadId]: !prev[funcionalidadId] }))
  }

  const guardar = async () => {
    if (!usuarioId) return
    setGuardando(true)
    setError(null)
    setExito(null)
    const { error: guardarError } = await guardarAccesosPerfil(usuarioId, seleccion)
    setGuardando(false)
    if (guardarError) {
      setError(guardarError)
      return
    }
    const nombre = usuarios.find((u) => u.id === usuarioId)?.nombre ?? ''
    setExito(`Accesos de ${nombre} actualizados.`)
  }

  const usuarioSeleccionado = usuarios.find((u) => u.id === usuarioId)

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Acceso a funcionalidades</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Todo usuario tiene acceso a todas las secciones por defecto. Destilda
        una funcionalidad para restringirla solo a esta persona: algunas se
        asignan a criterio de supervisión (por ejemplo Premios), mientras que
        otras se ganan solas según el comportamiento en la plataforma (por
        ejemplo la Liga) — pero el acceso a VER la sección es independiente de
        eso y se controla aquí.
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

        {!usuarioId ? null : !catalogo || cargandoAccesos ? (
          <EstadoCarga texto="Cargando accesos…" />
        ) : (
          <>
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
                    <span className="block font-semibold text-tinta">{f.nombre}</span>
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
