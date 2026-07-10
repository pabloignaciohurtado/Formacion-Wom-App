import { useEffect } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import confetti from 'canvas-confetti'
import type { Insignia } from '../lib/insignias'
import { COLORES_WOM, tSpring } from '../lib/motion'
import { Boton } from './ui'

export function InsigniaModal({
  insignia,
  onCerrar,
  titulo = '¡Nueva insignia!',
}: {
  insignia: Insignia | null
  onCerrar: () => void
  titulo?: string
}) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!insignia || reduce) return
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.4 },
      colors: COLORES_WOM,
      disableForReducedMotion: true,
    })
  }, [insignia, reduce])

  return (
    <AnimatePresence>
      {insignia && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-wom-900/70 p-4 backdrop-blur-sm"
          onClick={onCerrar}
        >
          <m.div
            initial={{ scale: reduce ? 1 : 0.7, y: reduce ? 0 : 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: reduce ? 1 : 0.8, opacity: 0 }}
            transition={tSpring}
            className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold uppercase tracking-widest text-magenta-500">
              {titulo}
            </p>
            <m.div
              initial={{ rotate: -15, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.6, delay: 0.15 }}
              className="mx-auto mt-4 grid size-24 place-items-center rounded-full bg-gradient-to-br from-wom-600 to-magenta-500 text-5xl shadow-lg shadow-wom-600/30"
            >
              {insignia.icono}
            </m.div>
            <h2 className="mt-4 text-2xl font-extrabold">{insignia.nombre}</h2>
            <p className="mt-1 text-tinta-suave">{insignia.descripcion}</p>
            <Boton type="button" className="mt-6 w-full" onClick={onCerrar}>
              ¡Genial!
            </Boton>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
