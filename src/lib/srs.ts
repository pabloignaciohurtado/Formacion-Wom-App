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

// Avance de caja con seguridad opcional (aprendizaje basado en confianza):
//  - error → vuelve a la caja 1, desde donde sea.
//  - acierto seguro → sube una caja (dominio real).
//  - acierto con dudas → se queda en la misma caja: el conocimiento frágil
//    no se espacia hasta consolidarlo con seguridad.
// Sin el tercer argumento se comporta como antes (acierto = sube), para no
// romper llamadas ni datos previos a la confianza.
export function siguienteCaja(
  cajaActual: number,
  correcto: boolean,
  seguro?: boolean
): number {
  if (!correcto) return 1
  if (seguro === false) return Math.min(cajaActual, CAJA_MAXIMA)
  return Math.min(cajaActual + 1, CAJA_MAXIMA)
}

export type ResultadoRespuesta = 'dominado' | 'fragil' | 'brecha' | 'misinformed'

// El 2x2 del aprendizaje basado en confianza (acierto × seguridad):
//  - dominado    (acierto + seguro): lo sabe firme.
//  - fragil      (acierto + dudas):  acertó pero sin convicción.
//  - brecha      (error + dudas):    aún lo está aprendiendo, y lo sabe.
//  - misinformed (error + seguro):   seguro pero equivocado — el más caro en
//    atención al cliente, porque dará mal la información sin dudar. Es el que
//    más conviene detectar y corregir.
export function clasificarRespuesta(
  correcto: boolean,
  seguro: boolean
): ResultadoRespuesta {
  if (correcto) return seguro ? 'dominado' : 'fragil'
  return seguro ? 'misinformed' : 'brecha'
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
