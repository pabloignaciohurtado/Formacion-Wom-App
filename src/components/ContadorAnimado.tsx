import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

export function ContadorAnimado({
  valor,
  duracion = 900,
}: {
  valor: number
  duracion?: number
}) {
  const [actual, setActual] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    // Con reduced motion se muestra el valor final sin animar el conteo.
    if (reduce) {
      setActual(valor)
      return
    }
    const inicio = performance.now()
    let raf: number
    const tick = (t: number) => {
      const progreso = Math.min(1, (t - inicio) / duracion)
      // Curva ease-out cúbica para frenar al llegar al valor
      setActual(Math.round(valor * (1 - Math.pow(1 - progreso, 3))))
      if (progreso < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [valor, duracion, reduce])

  return <>{actual}</>
}
