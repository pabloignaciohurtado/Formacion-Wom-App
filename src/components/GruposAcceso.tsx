import { useEffect, useState } from 'react'
import {
  cargarCatalogoFuncionalidades,
  cargarFuncionalidadesGrupo,
  cargarGruposAcceso,
  cargarUsuariosDeGrupo,
  crearGrupoAcceso,
  actualizarGrupoAcceso,
  eliminarGrupoAcceso,
  guardarFuncionalidadesGrupo,
  type Funcionalidad,
  type GrupoAcceso,
} from '../lib/funcionalidades'
import { Boton, Campo, EstadoCarga, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>

// Grupos/plantillas de acceso reutilizables: permiten asignar de una sola
// vez el mismo patrón de accesos a muchos usuarios (ver `asignarGrupoAUsuarios`
// en Admin, sección "Usuarios"), en vez de restringir usuario por usuario
// (eso sigue existiendo en EditarAccesosUsuario, ahora como "excepciones").
//
// Cascada de resolución (ver `lib/funcionalidades.ts`): override individual
// > grupo de acceso > default habilitado. Un grupo puede ser un allowlist
// positivo completo (ej. "Solo Álbum de Premios": todo en false salvo
// `premios` en true) o solo restringir un par de secciones.
export function GruposAcceso() {
  const [grupos, setGrupos] = useState<GrupoAcceso[] | null>(null)
  const [catalogo, setCatalogo] = useState<Funcionalidad[] | null>(null)
  const [grupoId, setGrupoId] = useState('')
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({})
  const [usuariosDelGrupo, setUsuariosDelGrupo] = useState<Perfil[] | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [descripcionNueva, setDescripcionNueva] = useState('')
  const [nombreEdit, setNombreEdit] = useState('')
  const [descripcionEdit, setDescripcionEdit] = useState('')
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const recargarGrupos = async () => {
    const lista = await cargarGruposAcceso()
    setGrupos(lista)
    return lista
  }

  useEffect(() => {
    void cargarCatalogoFuncionalidades().then(setCatalogo)
    void recargarGrupos()
  }, [])

  const grupoSeleccionado = grupos?.find((g) => g.id === grupoId)

  useEffect(() => {
    if (!grupoId) {
      setSeleccion({})
      setUsuariosDelGrupo(null)
      return
    }
    let cancelado = false
    setCargandoDetalle(true)
    setError(null)
    setExito(null)
    setNombreEdit(grupoSeleccionado?.nombre ?? '')
    setDescripcionEdit(grupoSeleccionado?.descripcion ?? '')
    Promise.all([cargarFuncionalidadesGrupo(grupoId), cargarUsuariosDeGrupo(grupoId)]).then(
      ([detalle, usuarios]) => {
        if (cancelado) return
        setSeleccion(
          Object.fromEntries((catalogo ?? []).map((f) => [f.id, detalle.get(f.id) ?? true]))
        )
        setUsuariosDelGrupo(usuarios)
        setCargandoDetalle(false)
      }
    )
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId])

  const alternar = (funcionalidadId: string) => {
    setSeleccion((prev) => ({ ...prev, [funcionalidadId]: !prev[funcionalidadId] }))
  }

  const crear = async () => {
    if (!nombreNuevo.trim()) return
    setCreando(true)
    setError(null)
    setExito(null)
    const { id, error: crearError } = await crearGrupoAcceso(
      nombreNuevo.trim(),
      descripcionNueva.trim()
    )
    setCreando(false)
    if (crearError) {
      setError(crearError)
      return
    }
    setNombreNuevo('')
    setDescripcionNueva('')
    await recargarGrupos()
    if (id) setGrupoId(id)
    setExito('Grupo de acceso creado. Ahora define qué funcionalidades habilita.')
  }

  const guardarDetalle = async () => {
    if (!grupoId) return
    setGuardando(true)
    setError(null)
    setExito(null)
    const { error: nombreError } = await actualizarGrupoAcceso(grupoId, {
      nombre: nombreEdit.trim(),
      descripcion: descripcionEdit.trim(),
    })
    if (nombreError) {
      setGuardando(false)
      setError(nombreError)
      return
    }
    const { error: detalleError } = await guardarFuncionalidadesGrupo(grupoId, seleccion)
    setGuardando(false)
    if (detalleError) {
      setError(detalleError)
      return
    }
    await recargarGrupos()
    setExito(`Grupo "${nombreEdit.trim()}" actualizado.`)
  }

  const eliminar = async () => {
    if (!grupoId || !grupoSeleccionado) return
    if (
      !window.confirm(
        `¿Eliminar el grupo "${grupoSeleccionado.nombre}"? Los usuarios que lo tengan asignado quedarán sin grupo (acceso por defecto).`
      )
    ) {
      return
    }
    setGuardando(true)
    setError(null)
    setExito(null)
    const { error: eliminarError } = await eliminarGrupoAcceso(grupoId)
    setGuardando(false)
    if (eliminarError) {
      setError(eliminarError)
      return
    }
    setGrupoId('')
    await recargarGrupos()
    setExito('Grupo de acceso eliminado.')
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Grupos de Acceso</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Plantillas reutilizables de acceso a funcionalidades. Crea un grupo
        (ej. "Solo Álbum de Premios"), define qué habilita, y asígnalo a
        varios ejecutivos de una sola vez desde la tabla de Usuarios de más
        arriba, en vez de restringir a cada uno manualmente.
      </p>
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}
      {exito && <p className="mt-3 text-sm font-semibold text-exito-texto">{exito}</p>}

      <Tarjeta className="mt-3 space-y-3">
        <h3 className="text-sm font-bold text-tinta">Nuevo grupo</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Campo
              id="grupo-nombre-nuevo"
              etiqueta="Nombre"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="ej. Solo Álbum de Premios"
            />
          </div>
          <div className="flex-1">
            <Campo
              id="grupo-descripcion-nueva"
              etiqueta="Descripción (opcional)"
              value={descripcionNueva}
              onChange={(e) => setDescripcionNueva(e.target.value)}
              placeholder="Para qué se usa este grupo"
            />
          </div>
          <Boton
            type="button"
            disabled={!nombreNuevo.trim() || creando}
            onClick={() => void crear()}
            className="sm:self-end"
          >
            Crear grupo
          </Boton>
        </div>
      </Tarjeta>

      {!grupos ? (
        <EstadoCarga texto="Cargando grupos…" />
      ) : grupos.length === 0 ? (
        <p className="mt-3 text-sm text-tinta-suave">Todavía no hay grupos de acceso creados.</p>
      ) : (
        <Tarjeta className="mt-3 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="grupo-seleccionar"
              className="block text-sm font-semibold text-tinta"
            >
              Editar grupo
            </label>
            <select
              id="grupo-seleccionar"
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600 sm:max-w-sm"
            >
              <option value="">Selecciona un grupo</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>

          {!grupoId ? null : !catalogo || cargandoDetalle ? (
            <EstadoCarga texto="Cargando detalle del grupo…" />
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Campo
                    id="grupo-nombre-edit"
                    etiqueta="Nombre"
                    value={nombreEdit}
                    onChange={(e) => setNombreEdit(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Campo
                    id="grupo-descripcion-edit"
                    etiqueta="Descripción"
                    value={descripcionEdit}
                    onChange={(e) => setDescripcionEdit(e.target.value)}
                  />
                </div>
              </div>

              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="text-sm font-semibold text-tinta">
                  Funcionalidades habilitadas por este grupo
                </legend>
                {catalogo.map((f) => (
                  <label
                    key={f.id}
                    htmlFor={`grupo-acceso-${f.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors hover:bg-wom-50"
                  >
                    <input
                      id={`grupo-acceso-${f.id}`}
                      type="checkbox"
                      checked={seleccion[f.id] ?? true}
                      onChange={() => alternar(f.id)}
                      className="mt-0.5 size-4 accent-wom-600"
                    />
                    <span>
                      <span className="block font-semibold text-tinta">{f.nombre}</span>
                      {f.descripcion && (
                        <span className="block text-xs text-tinta-suave">{f.descripcion}</span>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>

              <div>
                <h4 className="text-sm font-semibold text-tinta">
                  Usuarios con este grupo asignado
                  {usuariosDelGrupo ? ` (${usuariosDelGrupo.length})` : ''}
                </h4>
                {!usuariosDelGrupo || usuariosDelGrupo.length === 0 ? (
                  <p className="mt-1 text-sm text-tinta-suave">
                    Ningún usuario tiene este grupo asignado todavía. Asígnalo desde la tabla de
                    Usuarios, seleccionando varios ejecutivos a la vez.
                  </p>
                ) : (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {usuariosDelGrupo.map((u) => (
                      <li
                        key={u.id}
                        className="rounded-full bg-wom-50 px-2.5 py-0.5 text-xs font-semibold text-wom-700"
                      >
                        {u.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Boton
                  type="button"
                  disabled={guardando || !nombreEdit.trim()}
                  onClick={() => void guardarDetalle()}
                >
                  Guardar grupo
                </Boton>
                <Boton
                  type="button"
                  variante="fantasma"
                  disabled={guardando}
                  onClick={() => void eliminar()}
                >
                  Eliminar grupo
                </Boton>
              </div>
            </>
          )}
        </Tarjeta>
      )}
    </>
  )
}
