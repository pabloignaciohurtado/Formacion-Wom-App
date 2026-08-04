import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/useAuth'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from '../ui'
import { AdminCrearUsuario } from '../AdminCrearUsuario'
import { AdminCargaMasivaUsuarios } from '../AdminCargaMasivaUsuarios'
import { EditarAccesosUsuario } from '../EditarAccesosUsuario'
import { GruposAcceso } from '../GruposAcceso'
import {
  aplicarFuncionalidadAUsuarios,
  asignarGrupoAUsuarios,
  cargarCatalogoFuncionalidades,
  cargarGruposAcceso,
  type AccionFuncionalidadMasiva,
  type Funcionalidad,
  type GrupoAcceso,
} from '../../lib/funcionalidades'
import { etiquetaRol, puedeAsignar, puedeTenerSupervisor, type Rol } from '../../lib/roles'
import type { Tables } from '../../lib/database.types'

type Perfil = Tables<'profiles'>

// Pestaña "Usuarios y Accesos": agrupa alta/edición de usuarios (rol,
// supervisor, activación), asignación masiva de grupo de acceso, gestión de
// Grupos de Acceso y el control individual de acceso a funcionalidades. Es
// exactamente la misma lógica que antes vivía inline en Admin.tsx, solo
// movida aquí para que la pestaña cargue en diferido.
export default function TabUsuariosAccesos() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState<Perfil[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoAcceso[]>([])
  const [catalogo, setCatalogo] = useState<Funcionalidad[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [grupoAsignacion, setGrupoAsignacion] = useState('')
  const [asignando, setAsignando] = useState(false)
  const [exitoAsignacion, setExitoAsignacion] = useState<string | null>(null)

  // Bulk-toggle de una funcionalidad puntual (segunda acción masiva de la
  // barra, junto a "asignar grupo"): pide confirmación antes de aplicar
  // porque afecta a todos los seleccionados de una sola vez.
  const [funcionalidadMasiva, setFuncionalidadMasiva] = useState('')
  const [accionMasiva, setAccionMasiva] = useState<AccionFuncionalidadMasiva>('deshabilitar')
  const [confirmandoFuncionalidad, setConfirmandoFuncionalidad] = useState(false)
  const [aplicandoFuncionalidad, setAplicandoFuncionalidad] = useState(false)
  const [exitoFuncionalidad, setExitoFuncionalidad] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [perfiles, listaGrupos, catalogoFuncionalidades] = await Promise.all([
      supabase.from('profiles').select('*').order('creado_en'),
      cargarGruposAcceso(),
      cargarCatalogoFuncionalidades(),
    ])
    setUsuarios(perfiles.data ?? [])
    setGrupos(listaGrupos)
    setCatalogo(catalogoFuncionalidades)
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const cambiarActivo = async (perfil: Perfil) => {
    setError(null)
    const activar = !perfil.activo
    const { error: updateError } = await supabase
      .from('profiles')
      .update(
        activar
          ? {
              activo: true,
              alta_por: user?.id ?? null,
              alta_fecha: new Date().toISOString(),
              baja_fecha: null,
            }
          : { activo: false, baja_fecha: new Date().toISOString() }
      )
      .eq('id', perfil.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    void cargar()
  }

  // La "pantalla de equipo": el rol y el supervisor de cada persona se
  // gestionan aquí. Sin supervisor_id poblado, "asignar a mi equipo" es
  // incalculable y el término de mayor peso de la liga vale cero.
  const cambiarRol = async (perfil: Perfil, rol: Rol) => {
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: rol })
      .eq('id', perfil.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    void cargar()
  }

  const cambiarSupervisor = async (perfil: Perfil, supervisorId: string | null) => {
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ supervisor_id: supervisorId })
      .eq('id', perfil.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    void cargar()
  }

  const alternarSeleccionado = (id: string) => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  const alternarTodos = (ejecutivos: Perfil[]) => {
    setSeleccionados((prev) =>
      ejecutivos.every((e) => prev.has(e.id)) ? new Set() : new Set(ejecutivos.map((e) => e.id))
    )
  }

  // Asignación masiva: aplica el mismo grupo/plantilla de acceso a todos
  // los ejecutivos marcados de una sola vez (en vez de repetir el mismo
  // patrón usuario por usuario en EditarAccesosUsuario).
  const asignarGrupoMasivo = async () => {
    if (seleccionados.size === 0) return
    setAsignando(true)
    setError(null)
    setExitoAsignacion(null)
    const { error: asignarError } = await asignarGrupoAUsuarios(
      [...seleccionados],
      grupoAsignacion || null
    )
    setAsignando(false)
    if (asignarError) {
      setError(asignarError)
      return
    }
    const nombreGrupo = grupos.find((g) => g.id === grupoAsignacion)?.nombre
    setExitoAsignacion(
      nombreGrupo
        ? `Grupo "${nombreGrupo}" asignado a ${seleccionados.size} usuario(s).`
        : `Grupo de acceso quitado a ${seleccionados.size} usuario(s).`
    )
    setSeleccionados(new Set())
    void cargar()
  }

  // Bulk-toggle de una funcionalidad para todos los seleccionados: primero
  // pide confirmación explícita (acción de alto impacto, sin deshacer fácil
  // salvo repetir al revés), y solo al confirmar llama al batch real.
  const aplicarFuncionalidadMasiva = async () => {
    if (seleccionados.size === 0 || !funcionalidadMasiva) return
    setAplicandoFuncionalidad(true)
    setError(null)
    setExitoFuncionalidad(null)
    const { actualizados, error: aplicarError } = await aplicarFuncionalidadAUsuarios(
      [...seleccionados],
      funcionalidadMasiva,
      accionMasiva
    )
    setAplicandoFuncionalidad(false)
    setConfirmandoFuncionalidad(false)
    if (aplicarError) {
      setError(aplicarError)
      return
    }
    const nombreFuncionalidad = catalogo.find((f) => f.id === funcionalidadMasiva)?.nombre
    const verbo =
      accionMasiva === 'habilitar'
        ? 'habilitó'
        : accionMasiva === 'deshabilitar'
          ? 'deshabilitó'
          : 'quitó la excepción de'
    setExitoFuncionalidad(
      `Se ${verbo} "${nombreFuncionalidad}" para ${actualizados} usuario(s).`
    )
    setSeleccionados(new Set())
    void cargar()
  }

  return (
    <div>
      {error && (
        <div className="mt-4">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      <h2 className="mt-2 text-lg font-bold">Usuarios</h2>
      <AdminCrearUsuario usuarios={usuarios ?? []} onCreado={() => void cargar()} />
      <AdminCargaMasivaUsuarios usuarios={usuarios ?? []} onCreados={() => void cargar()} />
      {!usuarios ? (
        <EstadoCarga texto="Cargando usuarios…" />
      ) : (
        <>
          {seleccionados.size > 0 && (
            <Tarjeta className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <p className="text-sm font-semibold text-tinta sm:flex-1">
                {seleccionados.size} usuario(s) seleccionado(s)
              </p>
              <div className="flex-1 space-y-1.5">
                <label
                  htmlFor="asignacion-masiva-grupo"
                  className="block text-sm font-semibold text-tinta"
                >
                  Asignar grupo de acceso
                </label>
                <select
                  id="asignacion-masiva-grupo"
                  value={grupoAsignacion}
                  onChange={(e) => setGrupoAsignacion(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  <option value="">Sin grupo (acceso por defecto)</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <Boton
                type="button"
                disabled={asignando}
                onClick={() => void asignarGrupoMasivo()}
                className="sm:self-end"
              >
                Asignar a {seleccionados.size} usuario(s)
              </Boton>
            </Tarjeta>
          )}
          {exitoAsignacion && (
            <p className="mt-2 text-sm font-semibold text-exito-texto">{exitoAsignacion}</p>
          )}

          {seleccionados.size > 0 && (
            <Tarjeta className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <p className="text-sm font-semibold text-tinta sm:flex-1">
                Excepción individual para {seleccionados.size} usuario(s)
              </p>
              <div className="flex-1 space-y-1.5">
                <label
                  htmlFor="masivo-funcionalidad"
                  className="block text-sm font-semibold text-tinta"
                >
                  Funcionalidad
                </label>
                <select
                  id="masivo-funcionalidad"
                  value={funcionalidadMasiva}
                  onChange={(e) => {
                    setFuncionalidadMasiva(e.target.value)
                    setConfirmandoFuncionalidad(false)
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  <option value="">Selecciona una funcionalidad</option>
                  {catalogo.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <label
                  htmlFor="masivo-accion"
                  className="block text-sm font-semibold text-tinta"
                >
                  Acción
                </label>
                <select
                  id="masivo-accion"
                  value={accionMasiva}
                  onChange={(e) => {
                    setAccionMasiva(e.target.value as AccionFuncionalidadMasiva)
                    setConfirmandoFuncionalidad(false)
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  <option value="habilitar">Habilitar</option>
                  <option value="deshabilitar">Deshabilitar</option>
                  <option value="quitar_excepcion">Quitar excepción individual</option>
                </select>
              </div>
              {!confirmandoFuncionalidad ? (
                <Boton
                  type="button"
                  variante="secundario"
                  disabled={!funcionalidadMasiva}
                  onClick={() => setConfirmandoFuncionalidad(true)}
                  className="sm:self-end"
                >
                  Aplicar a {seleccionados.size} usuario(s)
                </Boton>
              ) : (
                <div className="flex gap-2 sm:self-end">
                  <Boton
                    type="button"
                    disabled={aplicandoFuncionalidad}
                    onClick={() => void aplicarFuncionalidadMasiva()}
                  >
                    {aplicandoFuncionalidad ? 'Aplicando…' : 'Confirmar'}
                  </Boton>
                  <Boton
                    type="button"
                    variante="fantasma"
                    disabled={aplicandoFuncionalidad}
                    onClick={() => setConfirmandoFuncionalidad(false)}
                  >
                    Cancelar
                  </Boton>
                </div>
              )}
              {confirmandoFuncionalidad && (
                <p className="w-full text-sm font-semibold text-magenta-500">
                  Esto afectará el acceso de {seleccionados.size} usuario(s) de inmediato.
                  ¿Confirmas?
                </p>
              )}
            </Tarjeta>
          )}
          {exitoFuncionalidad && (
            <p className="mt-2 text-sm font-semibold text-exito-texto">{exitoFuncionalidad}</p>
          )}
          <Tarjeta className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-niebla text-left text-xs uppercase tracking-wide text-tinta-suave">
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los usuarios"
                    checked={usuarios.length > 0 && usuarios.every((u) => seleccionados.has(u.id))}
                    onChange={() => alternarTodos(usuarios)}
                    className="size-4 accent-wom-600"
                  />
                </th>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Supervisor</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((r) => (
                <tr key={r.id} className="border-b border-niebla last:border-0">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar a ${r.nombre}`}
                      checked={seleccionados.has(r.id)}
                      onChange={() => alternarSeleccionado(r.id)}
                      className="size-4 accent-wom-600"
                    />
                  </td>
                  <td className="px-5 py-3 font-semibold">{r.nombre}</td>
                  <td className="px-5 py-3 text-tinta-suave">{r.email}</td>
                  <td className="px-5 py-3">
                    {r.id === user?.id ? (
                      // El propio rol no se toca: evita dejar la plataforma
                      // sin administradores por un clic.
                      <span className="rounded-full bg-magenta-500/10 px-2.5 py-0.5 text-xs font-bold uppercase text-magenta-500">
                        {etiquetaRol(r.role)}
                      </span>
                    ) : (
                      <select
                        value={r.role}
                        onChange={(e) => void cambiarRol(r, e.target.value as Rol)}
                        aria-label={`Rol de ${r.nombre}`}
                        className="rounded-lg border border-gray-200 bg-superficie px-2 py-1 text-xs font-semibold transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                      >
                        <option value="ejecutivo">Ejecutivo</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {puedeTenerSupervisor(r.role) ? (
                      <select
                        value={r.supervisor_id ?? ''}
                        onChange={(e) =>
                          void cambiarSupervisor(r, e.target.value || null)
                        }
                        aria-label={`Supervisor de ${r.nombre}`}
                        className="rounded-lg border border-gray-200 bg-superficie px-2 py-1 text-xs font-semibold transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                      >
                        <option value="">Sin supervisor</option>
                        {(usuarios ?? [])
                          // Jefes posibles: supervisores y admins. Se excluye a
                          // uno mismo y a quien ya reporta a esta persona, para
                          // no cerrar un ciclo directo (A jefe de B y B de A).
                          .filter(
                            (u) =>
                              puedeAsignar(u.role) &&
                              u.id !== r.id &&
                              u.supervisor_id !== r.id
                          )
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-xs text-tinta-suave">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        r.activo ? 'text-exito-texto' : 'text-tinta-suave'
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          r.activo ? 'bg-exito' : 'bg-gray-300'
                        }`}
                      />
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.id !== user?.id && (
                      <Boton
                        type="button"
                        variante={r.activo ? 'fantasma' : 'secundario'}
                        className="!px-3 !py-1.5 text-sm"
                        onClick={() => void cambiarActivo(r)}
                      >
                        {r.activo ? 'Desactivar' : 'Activar'}
                      </Boton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </Tarjeta>
        </>
      )}

      <GruposAcceso />

      <EditarAccesosUsuario usuarios={usuarios ?? []} onCambio={() => void cargar()} />
    </div>
  )
}
