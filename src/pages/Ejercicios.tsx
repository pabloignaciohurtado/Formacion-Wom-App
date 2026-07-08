import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { DOMINIOS } from '../data/contenido'
import { estaPendiente, maestriaDominio } from '../lib/srs'
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
      <h2>Ejercicios</h2>
      <p>
        Practica por dominio. Los ejercicios que respondas se agendan para
        repaso espaciado: acertar los aleja, fallar los trae de vuelta.
      </p>

      {!estados ? (
        <p className="estado-carga">Cargando avance…</p>
      ) : (
        <div className="tarjetas-resumen">
          {DOMINIOS.map((dominio) => {
            const estado = estados[dominio.id]
            const porHacer = estado.pendientes + estado.nuevos
            return (
              <article key={dominio.id} className="tarjeta-dominio">
                <h3>{dominio.titulo}</h3>
                <p className="descripcion-dominio">{dominio.descripcion}</p>
                <div className="barra-maestria">
                  <div
                    className="barra-maestria-avance"
                    style={{ width: `${estado.maestria}%` }}
                  />
                </div>
                <p className="meta-consulta">
                  Maestría {estado.maestria}%
                  {estado.meta && ` · meta ${estado.meta.maestria_objetivo}%`}
                  {' · '}
                  {estado.pendientes} por repasar · {estado.nuevos} nuevos
                </p>
                <Link className="boton-enlace" to={`/ejercicios/${dominio.id}`}>
                  {porHacer > 0 ? 'Practicar' : 'Repasar igual'}
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
