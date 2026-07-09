import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Target, MessageCircleQuestion, Flame } from 'lucide-react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Esqueleto, Tarjeta } from '../components/ui'
import { ContadorAnimado } from '../components/ContadorAnimado'

interface Resumen {
  intentos: number
  repasosPendientes: number
  metas: number
  consultasPendientes: number
}

const tarjetas = [
  {
    clave: 'repasosPendientes' as const,
    etiqueta: 'Repasos pendientes hoy',
    Icono: Flame,
    color: 'text-magenta-500 bg-magenta-500/10',
  },
  {
    clave: 'intentos' as const,
    etiqueta: 'Ejercicios intentados',
    Icono: Dumbbell,
    color: 'text-wom-600 bg-wom-600/10',
  },
  {
    clave: 'metas' as const,
    etiqueta: 'Metas asignadas',
    Icono: Target,
    color: 'text-exito bg-exito/10',
  },
  {
    clave: 'consultasPendientes' as const,
    etiqueta: 'Consultas sin responder',
    Icono: MessageCircleQuestion,
    color: 'text-amber-600 bg-amber-500/10',
  },
]

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

  const nombrePila = (perfil?.nombre ?? '').split(/[\s.]+/)[0] || 'relator'

  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">
        Hola, <span className="capitalize">{nombrePila}</span> 👋
      </h1>
      <p className="mt-1 text-tinta-suave">Este es tu estado de formación.</p>

      {!resumen ? (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tarjetas.map(({ clave }) => (
            <Esqueleto key={clave} className="h-36" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tarjetas.map(({ clave, etiqueta, Icono, color }, i) => (
              <motion.div
                key={clave}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35, ease: 'easeOut' }}
              >
                <Tarjeta className="flex h-full flex-col gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl ${color}`}>
                    <Icono className="size-5" />
                  </span>
                  <div>
                    <p className="text-3xl font-extrabold">
                      <ContadorAnimado valor={resumen[clave]} />
                    </p>
                    <p className="text-sm text-tinta-suave">{etiqueta}</p>
                  </div>
                </Tarjeta>
              </motion.div>
            ))}
          </div>

          <Link
            to="/ejercicios"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-magenta-500 px-6 py-3 font-semibold text-white shadow-lg shadow-magenta-500/25 transition-all hover:bg-magenta-600 active:scale-[0.98]"
          >
            <Flame className="size-5" />
            {resumen.repasosPendientes > 0
              ? `Repasar ahora (${resumen.repasosPendientes} pendientes)`
              : 'Ir a practicar'}
          </Link>
        </>
      )}
    </section>
  )
}
