import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { DOMINIOS } from '../data/contenido'
import { estaPendiente, maestriaDominio } from '../lib/srs'
import { EstadoCarga, Tarjeta } from '../components/ui'
import type { Tables } from '../lib/database.types'

type Meta = Tables<'goals'>

interface EstadoDominio {
  maestria: number
  pendientes: number
  nuevos: number
  meta: Meta | null
}

export default function Ejercicios() {
  const { user } = useAuth()
  const [estados, setEstados] = useState<Record<string, EstadoDominio> | null>(
    null
  )

  useEffect(() => {
    if (!user) return
    let cancelado = false

    const cargar = async () => {
      const [cards, metas] = await Promise.all([
        supabase.from('srs_cards').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
      ])
      if (cancelado) return
      const porDominio: Record<string, EstadoDominio> = {}
      for (const dominio of DOMINIOS) {
        const cardsDominio = (cards.data ?? []).filter(
          (c) => c.domain_id === dominio.id
        )
        const conTarjeta = new Set(cardsDominio.map((c) => c.exercise_id))
        porDominio[dominio.id] = {
          maestria: maestriaDominio(cardsDominio, dominio.ejercicios.length),
          pendientes: cardsDominio.filter((c) => estaPendiente(c)).length,
          nuevos: dominio.ejercicios.filter((e) => !conTarjeta.has(e.id))
            .length,
          meta:
            (metas.data ?? []).find((m) => m.domain_id === dominio.id) ?? null,
        }
      }
      setEstados(porDominio)
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [user])

  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">Ejercicios</h1>
      <p className="mt-1 text-tinta-suave">
        Practica por dominio: acertar espacia el repaso, fallar lo trae de
        vuelta.
      </p>

      {!estados ? (
        <EstadoCarga texto="Cargando avance…" />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DOMINIOS.map((dominio) => {
            const estado = estados[dominio.id]
            const porHacer = estado.pendientes + estado.nuevos
            return (
              <Tarjeta key={dominio.id} className="flex flex-col gap-3">
                <div>
                  <h2 className="font-bold text-wom-600">{dominio.titulo}</h2>
                  <p className="mt-0.5 text-sm text-tinta-suave">
                    {dominio.descripcion}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-tinta-suave">
                    <span>Maestría {estado.maestria}%</span>
                    {estado.meta && <span>Meta {estado.meta.maestria_objetivo}%</span>}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-niebla">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-wom-600 to-magenta-500 transition-all duration-500"
                      style={{ width: `${estado.maestria}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-tinta-suave">
                  {estado.pendientes} por repasar · {estado.nuevos} nuevos
                </p>

                <Link
                  to={`/ejercicios/${dominio.id}`}
                  className="mt-auto inline-flex items-center justify-between rounded-xl bg-wom-600 px-4 py-2.5 font-semibold text-white transition-all hover:bg-wom-700 active:scale-[0.98]"
                >
                  {porHacer > 0 ? `Practicar (${porHacer})` : 'Repasar igual'}
                  <ChevronRight className="size-5" />
                </Link>
              </Tarjeta>
            )
          })}
        </div>
      )}
    </section>
  )
}
