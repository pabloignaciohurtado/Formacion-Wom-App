import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, X, PartyPopper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { obtenerDominio, type Ejercicio } from '../data/contenido'
import { estaPendiente, proximoRepaso, siguienteCaja } from '../lib/srs'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from '../components/ui'

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
    return <EstadoCarga texto="Preparando sesión…" />
  }

  if (fase === 'resumen' || cola.length === 0) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold">{dominio.titulo}</h1>
        {cola.length === 0 ? (
          <p className="mt-4 text-tinta-suave">
            No hay ejercicios disponibles en este dominio.
          </p>
        ) : (
          <Tarjeta className="mt-6 p-8 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-exito/15 text-exito">
              <PartyPopper className="size-8" />
            </div>
            <h2 className="text-xl font-extrabold">Sesión terminada</h2>
            <p className="mt-2 text-tinta-suave">
              Acertaste <strong className="text-tinta">{correctas}</strong> de{' '}
              <strong className="text-tinta">{cola.length}</strong>. Los
              aciertos se agendaron más lejos; los errores volverán pronto.
            </p>
          </Tarjeta>
        )}
        <Link
          to="/ejercicios"
          className="mt-6 inline-block font-semibold text-wom-600 hover:underline"
        >
          ← Volver a ejercicios
        </Link>
      </section>
    )
  }

  const progreso = ((indice + (fase === 'feedback' ? 1 : 0)) / cola.length) * 100

  return (
    <section className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{dominio.titulo}</h1>
        <span className="text-sm font-semibold text-tinta-suave">
          {indice + 1}/{cola.length}
        </span>
      </div>
      {objetivo && (
        <p className="mt-0.5 text-sm text-tinta-suave">{objetivo.titulo}</p>
      )}

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-gradient-to-r from-wom-600 to-magenta-500 transition-all duration-500"
          style={{ width: `${progreso}%` }}
        />
      </div>

      <Tarjeta className="mt-6">
        <p className="text-lg font-bold">{ejercicio.enunciado}</p>

        <div className="mt-5 space-y-2.5">
          {ejercicio.opciones.map((opcion, i) => {
            let clase =
              'w-full rounded-xl border-2 border-transparent bg-niebla px-4 py-3 text-left font-medium transition-all'
            if (fase === 'pregunta') {
              clase += ' hover:border-wom-600 hover:bg-white cursor-pointer'
            } else if (i === ejercicio.correcta) {
              clase += ' border-exito bg-exito/10'
            } else if (i === seleccion) {
              clase += ' border-red-400 bg-red-50'
            } else {
              clase += ' opacity-50'
            }
            return (
              <button
                key={i}
                type="button"
                className={clase}
                disabled={fase === 'feedback'}
                onClick={() => void responder(i)}
              >
                <span className="flex items-center justify-between gap-3">
                  {opcion}
                  {fase === 'feedback' && i === ejercicio.correcta && (
                    <Check className="size-5 shrink-0 text-exito" />
                  )}
                  {fase === 'feedback' &&
                    i === seleccion &&
                    i !== ejercicio.correcta && (
                      <X className="size-5 shrink-0 text-red-500" />
                    )}
                </span>
              </button>
            )
          })}
        </div>

        {fase === 'feedback' && (
          <div className="mt-5 border-t border-niebla pt-5">
            <p
              className={`font-bold ${
                seleccion === ejercicio.correcta ? 'text-exito' : 'text-red-500'
              }`}
            >
              {seleccion === ejercicio.correcta ? '¡Correcto!' : 'Incorrecto'}
            </p>
            <p className="mt-1 text-sm text-tinta-suave">
              {ejercicio.explicacion}
            </p>
            {error && (
              <div className="mt-3">
                <MensajeError>{error}</MensajeError>
              </div>
            )}
            <Boton type="button" onClick={siguiente} className="mt-4 w-full">
              {indice + 1 >= cola.length ? 'Ver resumen' : 'Siguiente'}
            </Boton>
          </div>
        )}
      </Tarjeta>
    </section>
  )
}
