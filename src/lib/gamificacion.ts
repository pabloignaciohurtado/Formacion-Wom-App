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

export interface Liga {
  id: string
  nombre: string
  icono: string
  clase: string
}

// Orden ascendente. La promoción/descenso ocurre en el corte semanal, que
// ejecuta pg_cron a diario (tarea `corte-semanal-ligas`) llamando a la función
// SQL asegurar_corte_semanal. Es idempotente: solo actúa la primera vez de cada
// semana.
export const LIGAS: Liga[] = [
  { id: 'bronce', nombre: 'Liga Bronce', icono: '🥉', clase: 'from-amber-700 to-amber-500' },
  { id: 'plata', nombre: 'Liga Plata', icono: '🥈', clase: 'from-gray-500 to-gray-300' },
  { id: 'oro', nombre: 'Liga Oro', icono: '🥇', clase: 'from-amber-500 to-yellow-300' },
  { id: 'heroe', nombre: 'Liga Héroe', icono: '👑', clase: 'from-wom-600 to-magenta-500' },
]

export function ligaDe(id: string | null | undefined): Liga {
  return LIGAS.find((l) => l.id === id) ?? LIGAS[0]
}

export function xpTotal(intentos: number, correctas: number): number {
  return correctas * XP_ACIERTO + (intentos - correctas) * XP_INTENTO
}

export type ZonaLiga = 'sube' | 'baja' | 'firme'

// En qué zona de su división está una persona, espejando exactamente las reglas
// del corte semanal (asegurar_corte_semanal):
//  - Desciende quien termina con puntaje 0 — salvo en bronce, que es el suelo.
//  - Asciende el top 2, pero solo si hay ≥4 compitiendo (puntaje > 0) — salvo en
//    héroe, la cima, donde no hay a dónde subir.
// Sirve para pintar las zonas de ascenso/descenso y que la liga se sienta viva
// sin prometer nada que el corte no vaya a cumplir.
export function zonaLiga(args: {
  liga: string
  posicion: number
  compiten: number
  puntaje: number
}): ZonaLiga {
  const { liga, posicion, compiten, puntaje } = args
  if (puntaje === 0) return liga === 'bronce' ? 'firme' : 'baja'
  if (posicion <= 2 && compiten >= 4 && liga !== 'heroe') return 'sube'
  return 'firme'
}

// Auto-competencia: tu semana actual contra tu propia semana anterior. El
// sentido decide el tono en el que se muestra (celebrar, neutro, alentar).
export function deltaSemanal(
  actual: number,
  anterior: number
): { diff: number; sentido: 'mejor' | 'igual' | 'peor' } {
  const diff = actual - anterior
  return { diff, sentido: diff > 0 ? 'mejor' : diff < 0 ? 'peor' : 'igual' }
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
