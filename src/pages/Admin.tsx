import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>
type Consulta = Tables<'consultas'>

export default function Admin() {
  const { user } = useAuth()
  const [relatores, setRelatores] = useState<Perfil[] | null>(null)
  const [consultas, setConsultas] = useState<Consulta[] | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [perfiles, pendientes] = await Promise.all([
      supabase.from('profiles').select('*').order('creado_en'),
      supabase.from('consultas').select('*').order('fecha', { ascending: false }),
    ])
    setRelatores(perfiles.data ?? [])
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
      <h2>Administración</h2>
      {error && <p role="alert" className="mensaje-error">{error}</p>}

      <h3>Relatores</h3>
      {!relatores ? (
        <p className="estado-carga">Cargando relatores…</p>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {relatores.map((r) => (
                <tr key={r.id}>
                  <td>{r.nombre}</td>
                  <td>{r.email}</td>
                  <td>{r.role}</td>
                  <td>{r.activo ? 'activo' : 'inactivo'}</td>
                  <td>
                    {r.id !== user?.id && (
                      <button type="button" onClick={() => void cambiarActivo(r)}>
                        {r.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Consultas</h3>
      {!consultas ? (
        <p className="estado-carga">Cargando consultas…</p>
      ) : consultas.length === 0 ? (
        <p>No hay consultas.</p>
      ) : (
        <ul className="lista-consultas">
          {consultas.map((c) => (
            <li key={c.id} className="tarjeta-consulta">
              <p className="texto-consulta">
                <strong>{c.user_nombre}:</strong> {c.texto}
              </p>
              <p className="meta-consulta">
                {new Date(c.fecha).toLocaleString()} ·{' '}
                <span className={`estado estado-${c.estado}`}>{c.estado}</span>
              </p>
              {c.estado === 'pendiente' ? (
                <div className="formulario-respuesta">
                  <textarea
                    rows={2}
                    placeholder="Escribe la respuesta…"
                    value={respuestas[c.id] ?? ''}
                    onChange={(e) =>
                      setRespuestas((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    disabled={!(respuestas[c.id] ?? '').trim()}
                    onClick={() => void responder(c)}
                  >
                    Responder
                  </button>
                </div>
              ) : (
                c.respuesta_admin && (
                  <p className="respuesta-admin">
                    <strong>Respuesta:</strong> {c.respuesta_admin}
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
