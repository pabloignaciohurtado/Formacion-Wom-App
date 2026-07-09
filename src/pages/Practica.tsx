import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, X, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { obtenerDominio, type Ejercicio } from '../data/contenido'
import { estaPendiente, proximoRepaso, siguienteCaja } from '../lib/srs'
import { encolarOffline } from '../lib/colaOffline'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from '../components/ui'
import { ContadorAnimado } from '../components/ContadorAnimado'

import { XP_ACIERTO, XP_INTENTO } from '../lib/gamificacion'

const EJERCICIOS_POR_SESION = 10

const COLORES_WOM = ['#4D008C', '#E92070', '#33CC9E', '#A67FC5']

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
  const [xp, setXp] = useState(0)
  const [xpFlotante, setXpFlotante] = useState<{ id: number; cantidad: number } | null>(null)
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

  // Celebración al terminar la sesión
  useEffect(() => {
    if (fase !== 'resumen' || correctas === 0) return
    const disparar = (particleCount: number, spread: number, delay: number) =>
      setTimeout(
        () =>
          confetti({
            particleCount,
            spread,
            origin: { y: 0.6 },
            colors: COLORES_WOM,
          }),
        delay
      )
    disparar(120, 75, 0)
    disparar(60, 110, 350)
  }, [fase, correctas])

  const ejercicio = cola[indice]
  const objetivo = useMemo(
    () =>
      dominio && ejercicio
        ? dominio.objetivos.find((o) => o.id === ejercicio.objetivoId)
        : undefined,
    [dominio, ejercicio]
  )

  // Orden aleatorio de alternativas por pregunta y por sesión (anti-copia):
  // orden[i] = índice original de la alternativa mostrada en la posición i.
  const orden = useMemo(() => {
    if (!ejercicio) return []
    const indices = ejercicio.opciones.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  }, [ejercicio])

  if (!dominio) {
    return <Navigate to="/ejercicios" replace />
  }

  const responder = async (posicion: number) => {
    if (!user || !ejercicio || fase !== 'pregunta') return
    setSeleccion(posicion)
    setFase('feedback')
    setError(null)

    const correcto = orden[posicion] === ejercicio.correcta
    const ganado = correcto ? XP_ACIERTO : XP_INTENTO
    if (correcto) setCorrectas((c) => c + 1)
    setXp((x) => x + ganado)
    setXpFlotante({ id: Date.now(), cantidad: ganado })

    let cardActual = null
    if (navigator.onLine) {
      const { data } = await supabase
        .from('srs_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', ejercicio.id)
        .maybeSingle()
      cardActual = data
    }

    const caja = siguienteCaja(cardActual?.caja ?? 1, correcto)
    const ahora = new Date().toISOString()
    const payloadIntento = {
      id: crypto.randomUUID(),
      user_id: user.id,
      exercise_id: ejercicio.id,
      domain_id: dominio.id,
      objetivo_id: ejercicio.objetivoId,
      puntaje: correcto ? 100 : 0,
      correcto,
      fecha: ahora,
    }
    const payloadTarjeta = {
      user_id: user.id,
      exercise_id: ejercicio.id,
      domain_id: dominio.id,
      caja,
      repasos: (cardActual?.repasos ?? 0) + 1,
      ultimo_resultado: correcto,
      proximo_repaso: proximoRepaso(caja),
      actualizada: ahora,
    }

    // Sin conexión: se encola y se sincroniza al volver la red
    if (!navigator.onLine) {
      encolarOffline({ intento: payloadIntento, tarjeta: payloadTarjeta })
      return
    }

    const [intento, tarjeta] = await Promise.all([
      supabase.from('attempts').insert(payloadIntento),
      supabase.from('srs_cards').upsert(payloadTarjeta),
    ])
    if (intento.error || tarjeta.error) {
      encolarOffline({ intento: payloadIntento, tarjeta: payloadTarjeta })
      setError(
        'Sin conexión con el servidor: el intento quedó guardado en este dispositivo y se sincronizará solo.'
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
        {cola.length === 0 ? (
          <>
            <h1 className="text-2xl font-extrabold">{dominio.titulo}</h1>
            <p className="mt-4 text-tinta-suave">
              No hay ejercicios disponibles en este dominio.
            </p>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.45, duration: 0.7 }}
          >
            <Tarjeta className="p-8 text-center">
              <motion.div
                initial={{ rotate: -12, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.6, delay: 0.15 }}
                className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-gradient-to-br from-wom-600 to-magenta-500 text-4xl"
              >
                🏆
              </motion.div>
              <h1 className="text-2xl font-extrabold">¡Sesión terminada!</h1>
              <p className="mt-1 text-tinta-suave">{dominio.titulo}</p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-niebla p-4">
                  <p className="text-3xl font-extrabold text-wom-600">
                    <ContadorAnimado valor={correctas} />
                    <span className="text-lg text-tinta-suave">/{cola.length}</span>
                  </p>
                  <p className="text-sm text-tinta-suave">aciertos</p>
                </div>
                <div className="rounded-2xl bg-niebla p-4">
                  <p className="flex items-center justify-center gap-1 text-3xl font-extrabold text-magenta-500">
                    <Zap className="size-6 fill-current" />
                    <ContadorAnimado valor={xp} />
                  </p>
                  <p className="text-sm text-tinta-suave">XP ganados</p>
                </div>
              </div>

              <p className="mt-5 text-sm text-tinta-suave">
                Los aciertos se agendaron más lejos; los errores volverán pronto
                a tu repaso.
              </p>
            </Tarjeta>
          </motion.div>
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
  const acerto = seleccion !== null && orden[seleccion] === ejercicio.correcta

  return (
    <section className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{dominio.titulo}</h1>
        <div className="relative flex items-center gap-3">
          <AnimatePresence>
            {xpFlotante && (
              <motion.span
                key={xpFlotante.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -34 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                onAnimationComplete={() => setXpFlotante(null)}
                className="absolute -top-1 right-16 font-extrabold text-magenta-500"
              >
                +{xpFlotante.cantidad}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.span
            key={xp}
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.6 }}
            className="flex items-center gap-1 rounded-full bg-wom-600 px-3 py-1 text-sm font-bold text-white"
          >
            <Zap className="size-4 fill-current" />
            {xp} XP
          </motion.span>
          <span className="text-sm font-semibold text-tinta-suave">
            {indice + 1}/{cola.length}
          </span>
        </div>
      </div>
      {objetivo && (
        <p className="mt-0.5 text-sm text-tinta-suave">{objetivo.titulo}</p>
      )}

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <motion.div
          animate={{ width: `${progreso}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
          className="h-full rounded-full bg-gradient-to-r from-wom-600 to-magenta-500"
        />
      </div>

      <motion.div
        key={ejercicio.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Tarjeta className="mt-6">
          <p className="text-lg font-bold">{ejercicio.enunciado}</p>

          <div className="mt-5 space-y-2.5">
            {orden.map((indiceOriginal, i) => {
              const opcion = ejercicio.opciones[indiceOriginal]
              const esLaCorrecta = indiceOriginal === ejercicio.correcta
              let clase =
                'w-full rounded-xl border-2 border-transparent bg-niebla px-4 py-3 text-left font-medium transition-colors'
              if (fase === 'pregunta') {
                clase += ' hover:border-wom-600 hover:bg-white cursor-pointer'
              } else if (esLaCorrecta) {
                clase += ' border-exito bg-exito/10'
              } else if (i === seleccion) {
                clase += ' border-red-400 bg-red-50'
              } else {
                clase += ' opacity-50'
              }
              const esIncorrectaElegida =
                fase === 'feedback' && i === seleccion && !acerto
              const esCorrectaMostrada = fase === 'feedback' && esLaCorrecta
              return (
                <motion.button
                  key={i}
                  type="button"
                  animate={
                    esIncorrectaElegida
                      ? { x: [0, -9, 9, -6, 6, 0] }
                      : esCorrectaMostrada
                        ? { scale: [1, 1.04, 1] }
                        : {}
                  }
                  transition={{ duration: 0.45 }}
                  className={clase}
                  disabled={fase === 'feedback'}
                  onClick={() => void responder(i)}
                >
                  <span className="flex items-center justify-between gap-3">
                    {opcion}
                    {esCorrectaMostrada && (
                      <Check className="size-5 shrink-0 text-exito" />
                    )}
                    {esIncorrectaElegida && (
                      <X className="size-5 shrink-0 text-red-500" />
                    )}
                  </span>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {fase === 'feedback' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-5 border-t border-niebla pt-5">
                  <p className={`font-bold ${acerto ? 'text-exito' : 'text-red-500'}`}>
                    {acerto ? '¡Correcto!' : 'Incorrecto'}
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
              </motion.div>
            )}
          </AnimatePresence>
        </Tarjeta>
      </motion.div>
    </section>
  )
}
