// Debe coincidir con la migración gamificacion_ranking_racha de Supabase.
export const XP_ACIERTO = 25
export const XP_INTENTO = 5

export interface Nivel {
  nombre: string
  min: number
}

export const NIVELES: Nivel[] = [
  { nombre: 'Aprendiz', min: 0 },
  { nombre: 'Explorador', min: 150 },
  { nombre: 'Relator', min: 400 },
  { nombre: 'Experto', min: 900 },
  { nombre: 'Héroe WOM', min: 1800 },
]

export function xpTotal(intentos: number, correctas: number): number {
  return correctas * XP_ACIERTO + (intentos - correctas) * XP_INTENTO
}

export function nivelDe(xp: number): {
  actual: Nivel
  siguiente: Nivel | null
  progreso: number
} {
  let indice = 0
  for (let i = 0; i < NIVELES.length; i++) {
    if (xp >= NIVELES[i].min) indice = i
  }
  const actual = NIVELES[indice]
  const siguiente = NIVELES[indice + 1] ?? null
  const progreso = siguiente
    ? (xp - actual.min) / (siguiente.min - actual.min)
    : 1
  return { actual, siguiente, progreso }
}
