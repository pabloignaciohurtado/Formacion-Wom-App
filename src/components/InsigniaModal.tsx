import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import confetti from 'canvas-confetti'
import type { Insignia } from '../lib/insignias'
import { Boton } from './ui'

export function InsigniaModal({
  insignia,
  onCerrar,
}: {
  insignia: Insignia | null
  onCerrar: () => void
}) {
  useEffect(() => {
    if (!insignia) return
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.4 },
      colors: ['#4D008C', '#E92070', '#33CC9E', '#A67FC5'],
    })
  }, [insignia])

  return (
    <AnimatePresence>
      {insignia && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-wom-900/70 p-4 backdrop-blur-sm"
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.45 }}
            className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold uppercase tracking-widest text-magenta-500">
              ¡Nueva insignia!
            </p>
            <motion.div
              initial={{ rotate: -15, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.6, delay: 0.15 }}
              className="mx-auto mt-4 grid size-24 place-items-center rounded-full bg-gradient-to-br from-wom-600 to-magenta-500 text-5xl shadow-lg shadow-wom-600/30"
            >
              {insignia.icono}
            </motion.div>
            <h2 className="mt-4 text-2xl font-extrabold">{insignia.nombre}</h2>
            <p className="mt-1 text-tinta-suave">{insignia.descripcion}</p>
            <Boton type="button" className="mt-6 w-full" onClick={onCerrar}>
              ¡Genial!
            </Boton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
