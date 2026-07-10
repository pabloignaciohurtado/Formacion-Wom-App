import type { Tables } from './database.types'

type Card = Tables<'srs_cards'>

export const CAJA_MAXIMA = 5

// Intervalo en días hasta el próximo repaso, por caja (Leitner).
const DIAS_POR_CAJA: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
}

export function siguienteCaja(cajaActual: number, correcto: boolean): number {
  if (!correcto) return 1
  return Math.min(cajaActual + 1, CAJA_MAXIMA)
}

// El repaso vence al INICIO del día, no a la hora en que se practicó.
//
// Antes se conservaba la hora: quien practicaba a las 18:00 tenía su repaso
// agendado para las 18:00 del día siguiente, así que por la mañana el Panel le
// decía "0 repasos pendientes". El sistema seguía funcionando, pero el empujón
// para volver desaparecía justo cuando la persona abría la app.
export function proximoRepaso(caja: number, desde: Date = new Date()): string {
  const dias = DIAS_POR_CAJA[caja] ?? 1
  const fecha = new Date(desde)
  fecha.setDate(fecha.getDate() + dias)
  fecha.setHours(0, 0, 0, 0)
  return fecha.toISOString()
}

export function estaPendiente(card: Card, ahora: Date = new Date()): boolean {
  return new Date(card.proximo_repaso) <= ahora
}

// Maestría de un dominio: promedio del avance de caja de cada ejercicio
// (caja 5 = 100%). Los ejercicios sin tarjeta cuentan como 0.
export function maestriaDominio(
  cards: Pick<Card, 'caja'>[],
  totalEjercicios: number
): number {
  if (totalEjercicios === 0) return 0
  const avance = cards.reduce(
    (suma, c) => suma + (Math.min(c.caja, CAJA_MAXIMA) - 1) / (CAJA_MAXIMA - 1),
    0
  )
  return Math.round((avance / totalEjercicios) * 100)
}
