// Sistema de movimiento WOM — un solo lenguaje para toda la app.
// Los componentes importan estas constantes en vez de inventar easings/duraciones
// sueltos, así el movimiento se afina en un único lugar y se lee consistente.
//
// Reduced motion: usar `useReducedMotion()` de motion/react en el componente y,
// cuando sea true, saltar el desplazamiento (dejar solo la opacidad) o ir directo
// al estado final. El confetti se apaga con `disableForReducedMotion`.
//
// Regla: aquí solo vive lo que tiene consumidor. Un easing o una duración sin uso
// es deuda, no sistema — se agrega cuando el componente lo necesita.

import type { Transition } from 'motion/react'

// Curva de entrada (expo.out). Coincide con --ease-out en index.css.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

// Paso de stagger para secuencias coreografiadas (grids de tarjetas).
export const STAGGER = 0.08

// Resorte con rebote para pops de UI (chip de XP, modal de insignia).
export const tSpring: Transition = { type: 'spring', bounce: 0.4 }

// Colores de marca para el confetti (canvas-confetti).
export const COLORES_WOM = ['#4D008C', '#E92070', '#33CC9E', '#A67FC5']
