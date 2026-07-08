import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { obtenerDominio, type Ejercicio } from '../data/contenido'
import { estaPendiente, proximoRepaso, siguienteCaja } from '../lib/srs'

const EJERCICIOS_POR_SESION = 10

type Fase = 'cargando' | 'pregunta' | 'feedback' | 'resumen'

export default function Practica() {
  const { dominioId } = useParams()
  const { user } = useAuth()
  const dominio = dominioId ? obtenerDominio(dominioId) : undefined

  const [cola, setCola] = useState<Ejercicio[]>([])
  const [indice, setIndice] = useState(0)
  const [fase, setFase] = useState<Fase>('cargando')
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [correctas, setCorrectas] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !dominio) return
    let cancelado = false

    const cargar = async () => {
      const { data: cards } = await supabase
        .from('srs_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain_id', dominio.id)
      if (cancelado) return

      const tarjetas = cards ?? []
      const conTarjeta = new Map(tarjetas.map((c) => [c.exercise_id, c]))
      const pendientes = dominio.ejercicios.filter((e) => {
        const card = conTarjeta.get(e.id)
        return card ? estaPendiente(card) : false
      })
      const nuevos = dominio.ejercicios.filter((e) => !conTarjeta.has(e.id))
      // Prioridad: repasos vencidos, luego ejercicios nunca vistos.
      // Si no hay nada pendiente, se permite repasar todo el dominio.
      let sesion = [...pendientes, ...nuevos].slice(0, EJERCICIOS_POR_SESION)
      if (sesion.length === 0) {
        sesion = dominio.ejercicios.slice(0, EJERCICIOS_POR_SESION)
      }
      setCola(sesion)
      setFase('pregunta')
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [user, dominio])

  const ejercicio = cola[indice]
  const objetivo = useMemo(
    () =>
      dominio && ejercicio
        ? dominio.objetivos.find((o) => o.id === ejercicio.objetivoId)
        : undefined,
    [dominio, ejercicio]
  )

  if (!dominio) {
    return <Navigate to="/ejercicios" replace />
  }

  const responder = async (opcion: number) => {
    if (!user || !ejercicio || fase !== 'pregunta') return
    setSeleccion(opcion)
    setFase('feedback')
    setError(null)

    const correcto = opcion === ejercicio.correcta
    if (correcto) setCorrectas((c) => c + 1)

    const { data: cardActual } = await supabase
      .from('srs_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_id', ejercicio.id)
      .maybeSingle()

    const caja = siguienteCaja(cardActual?.caja ?? 1, correcto)
    const ahora = new Date().toISOString()

    const [intento, tarjeta] = await Promise.all([
      supabase.from('attempts').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        exercise_id: ejercicio.id,
        domain_id: dominio.id,
        objetivo_id: ejercicio.objetivoId,
        puntaje: correcto ? 100 : 0,
        correcto,
      }),
      supabase.from('srs_cards').upsert({
        user_id: user.id,
        exercise_id: ejercicio.id,
        domain_id: dominio.id,
        caja,
        repasos: (cardActual?.repasos ?? 0) + 1,
        ultimo_resultado: correcto,
        proximo_repaso: proximoRepaso(caja),
        actualizada: ahora,
      }),
    ])
    if (intento.error || tarjeta.error) {
      setError(
        'No se pudo guardar el intento: ' +
          (intento.error?.message ?? tarjeta.error?.message ?? '')
      )
    }
  }

  const siguiente = () => {
    setSeleccion(null)
    if (indice + 1 >= cola.length) {
      setFase('resumen')
    } else {
      setIndice((i) => i + 1)
      setFase('pregunta')
    }
  }

  if (fase === 'cargando') {
    return <p className="estado-carga">Preparando sesión…</p>
  }

  if (fase === 'resumen' || cola.length === 0) {
    return (
      <section>
        <h2>{dominio.titulo}</h2>
        {cola.length === 0 ? (
          <p>No hay ejercicios disponibles en este dominio.</p>
        ) : (
          <div className="tarjeta-quiz">
            <h3>Sesión terminada</h3>
            <p>
              Acertaste <strong>{correctas}</strong> de{' '}
              <strong>{cola.length}</strong>. Los aciertos se agendaron más
              lejos; los errores volverán pronto a tu repaso.
            </p>
          </div>
        )}
        <p>
          <Link className="boton-enlace" to="/ejercicios">
            Volver a ejercicios
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2>{dominio.titulo}</h2>
      <p className="meta-consulta">
        Pregunta {indice + 1} de {cola.length}
        {objetivo && ` · ${objetivo.titulo}`}
      </p>

      <div className="tarjeta-quiz">
        <p className="enunciado">{ejercicio.enunciado}</p>
        <div className="opciones">
          {ejercicio.opciones.map((opcion, i) => {
            let clase = 'opcion'
            if (fase === 'feedback') {
              if (i === ejercicio.correcta) clase += ' opcion-correcta'
              else if (i === seleccion) clase += ' opcion-incorrecta'
            }
            return (
              <button
                key={i}
                type="button"
                className={clase}
                disabled={fase === 'feedback'}
                onClick={() => void responder(i)}
              >
                {opcion}
              </button>
            )
          })}
        </div>

        {fase === 'feedback' && (
          <div className="feedback">
            <p>
              <strong>
                {seleccion === ejercicio.correcta ? '✔ Correcto.' : '✘ Incorrecto.'}
              </strong>{' '}
              {ejercicio.explicacion}
            </p>
            {error && <p role="alert" className="mensaje-error">{error}</p>}
            <button type="button" onClick={siguiente}>
              {indice + 1 >= cola.length ? 'Ver resumen' : 'Siguiente'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
