import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from '../components/ui'
import { AdminActividades } from '../components/AdminActividades'
import { AdminCiclosCapacitacion } from '../components/AdminCiclosCapacitacion'
import { AdminCrearUsuario } from '../components/AdminCrearUsuario'
import { AdminEquipo } from '../components/AdminEquipo'
import { AdminMateriales } from '../components/AdminMateriales'
import {
  etiquetaRol,
  puedeAsignar,
  puedeTenerSupervisor,
  type Rol,
} from '../lib/roles'
import { EstadoConsulta } from './Consultas'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>
type Consulta = Tables<'consultas'>

export default function Admin() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState<Perfil[] | null>(null)
  const [consultas, setConsultas] = useState<Consulta[] | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [perfiles, pendientes] = await Promise.all([
      supabase.from('profiles').select('*').order('creado_en'),
      supabase.from('consultas').select('*').order('fecha', { ascending: false }),
    ])
    setUsuarios(perfiles.data ?? [])
    setConsultas(pendientes.data ?? [])
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

  const responder = async (consulta: Consulta) => {
    const respuesta = (respuestas[consulta.id] ?? '').trim()
    if (!respuesta) return
    setError(null)
    const { error: updateError } = await supabase
      .from('consultas')
      .update({
        respuesta_admin: respuesta,
        estado: 'respondida',
        actualizada: new Date().toISOString(),
      })
      .eq('id', consulta.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setRespuestas((prev) => ({ ...prev, [consulta.id]: '' }))
    void cargar()
  }

  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">Administración</h1>
      {error && (
        <div className="mt-4">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      <h2 className="mt-6 text-lg font-bold">Usuarios</h2>
      <AdminCrearUsuario usuarios={usuarios ?? []} onCreado={() => void cargar()} />
      {!usuarios ? (
        <EstadoCarga texto="Cargando usuarios…" />
      ) : (
        <Tarjeta className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-niebla text-left text-xs uppercase tracking-wide text-tinta-suave">
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
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
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
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
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
      )}

      <AdminEquipo />

      <AdminMateriales />

      <AdminActividades />

      <AdminCiclosCapacitacion />

      <h2 className="mt-8 text-lg font-bold">Consultas</h2>
      {!consultas ? (
        <EstadoCarga texto="Cargando consultas…" />
      ) : consultas.length === 0 ? (
        <p className="mt-3 text-tinta-suave">No hay consultas.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {consultas.map((c) => (
            <li key={c.id}>
              <Tarjeta>
                <p className="font-medium">
                  <strong className="text-wom-600">{c.user_nombre}:</strong>{' '}
                  {c.texto}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-tinta-suave">
                  {new Date(c.fecha).toLocaleString()}
                  <EstadoConsulta estado={c.estado} />
                </p>
                {c.estado === 'pendiente' ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <textarea
                      rows={2}
                      placeholder="Escribe la respuesta…"
                      value={respuestas[c.id] ?? ''}
                      onChange={(e) =>
                        setRespuestas((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                    />
                    <Boton
                      type="button"
                      disabled={!(respuestas[c.id] ?? '').trim()}
                      onClick={() => void responder(c)}
                      className="sm:self-end"
                    >
                      Responder
                    </Boton>
                  </div>
                ) : (
                  c.respuesta_admin && (
                    <p className="mt-3 rounded-xl border-l-4 border-wom-600 bg-wom-50 px-4 py-2.5 text-sm">
                      <strong>Respuesta:</strong> {c.respuesta_admin}
                    </p>
                  )
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
