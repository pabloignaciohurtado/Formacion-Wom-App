import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'

interface Resumen {
  intentos: number
  repasosPendientes: number
  metas: number
  consultasPendientes: number
}

export default function Panel() {
  const { user, perfil } = useAuth()
  const [resumen, setResumen] = useState<Resumen | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelado = false

    const cargar = async () => {
      const ahora = new Date().toISOString()
      const [intentos, repasos, metas, consultas] = await Promise.all([
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('srs_cards')
          .select('exercise_id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lte('proximo_repaso', ahora),
        supabase
          .from('goals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('consultas')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('estado', 'pendiente'),
      ])
      if (cancelado) return
      setResumen({
        intentos: intentos.count ?? 0,
        repasosPendientes: repasos.count ?? 0,
        metas: metas.count ?? 0,
        consultasPendientes: consultas.count ?? 0,
      })
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [user])

  return (
    <section>
      <h2>Panel de formación</h2>
      <p>
        Hola {perfil?.nombre ?? user?.email}
        {perfil?.role === 'admin' && ' (administrador)'}. Este es tu estado de
        formación:
      </p>

      {!resumen ? (
        <p className="estado-carga">Cargando resumen…</p>
      ) : (
        <div className="tarjetas-resumen">
          <article className="tarjeta-dato">
            <span className="dato">{resumen.repasosPendientes}</span>
            <span className="etiqueta">Repasos pendientes hoy</span>
          </article>
          <article className="tarjeta-dato">
            <span className="dato">{resumen.intentos}</span>
            <span className="etiqueta">Ejercicios intentados</span>
          </article>
          <article className="tarjeta-dato">
            <span className="dato">{resumen.metas}</span>
            <span className="etiqueta">Metas asignadas</span>
          </article>
          <article className="tarjeta-dato">
            <span className="dato">{resumen.consultasPendientes}</span>
            <span className="etiqueta">Consultas sin responder</span>
          </article>
        </div>
      )}
    </section>
  )
}
