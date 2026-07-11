import { describe, expect, it } from 'vitest'
import {
  contarAtencion,
  desdeDeRango,
  diasDesde,
  enSegmento,
  precisionPct,
  precisionPorObjetivo,
  type FilaEquipo,
} from './seguimiento'

// Ancla temporal fija para que las pruebas no dependan del reloj.
const AHORA = new Date('2026-07-10T12:00:00Z').getTime()
const hace = (dias: number) =>
  new Date(AHORA - dias * 86400000).toISOString()

function fila(parcial: Partial<FilaEquipo>): FilaEquipo {
  return {
    user_id: 'u',
    nombre: 'X',
    liga: 'bronce',
    xp: 0,
    intentos: 0,
    correctas: 0,
    ultima_actividad: null,
    obligatorias_pendientes: 0,
    ...parcial,
  }
}

describe('diasDesde', () => {
  it('cuenta los días completos transcurridos', () => {
    expect(diasDesde(hace(3), AHORA)).toBe(3)
    expect(diasDesde(hace(0), AHORA)).toBe(0)
  })
  it('sin fecha devuelve null', () => {
    expect(diasDesde(null, AHORA)).toBeNull()
  })
})

describe('precisionPct', () => {
  it('redondea el porcentaje de aciertos', () => {
    expect(precisionPct(3, 2)).toBe(67)
    expect(precisionPct(4, 4)).toBe(100)
  })
  it('sin intentos no hay precisión', () => {
    expect(precisionPct(0, 0)).toBeNull()
  })
})

describe('enSegmento', () => {
  it('inactivo: nunca practicó o hace ≥7 días', () => {
    expect(enSegmento(fila({ ultima_actividad: null }), 'inactivo', AHORA)).toBe(true)
    expect(enSegmento(fila({ ultima_actividad: hace(7) }), 'inactivo', AHORA)).toBe(true)
    expect(enSegmento(fila({ ultima_actividad: hace(2) }), 'inactivo', AHORA)).toBe(false)
  })

  it('baja-precision: con intentos y bajo 70%', () => {
    expect(enSegmento(fila({ intentos: 10, correctas: 6 }), 'baja-precision', AHORA)).toBe(true)
    expect(enSegmento(fila({ intentos: 10, correctas: 7 }), 'baja-precision', AHORA)).toBe(false)
    // Sin intentos no cuenta como baja precisión (no hay dato, no es un problema).
    expect(enSegmento(fila({ intentos: 0, correctas: 0 }), 'baja-precision', AHORA)).toBe(false)
  })

  it('obligatorios: tiene pendientes', () => {
    expect(enSegmento(fila({ obligatorias_pendientes: 2 }), 'obligatorios', AHORA)).toBe(true)
    expect(enSegmento(fila({ obligatorias_pendientes: 0 }), 'obligatorios', AHORA)).toBe(false)
  })
})

describe('contarAtencion', () => {
  it('cuenta cada segmento por separado (una persona puede caer en varios)', () => {
    const equipo = [
      fila({ ultima_actividad: hace(10), intentos: 10, correctas: 5, obligatorias_pendientes: 1 }),
      fila({ ultima_actividad: hace(1), intentos: 10, correctas: 9, obligatorias_pendientes: 0 }),
      fila({ ultima_actividad: null, intentos: 0, correctas: 0, obligatorias_pendientes: 3 }),
    ]
    expect(contarAtencion(equipo, AHORA)).toEqual({
      inactivo: 2, // el de hace 10 días y el que nunca practicó
      'baja-precision': 1, // solo el de 50%
      obligatorios: 2,
    })
  })
})

describe('desdeDeRango', () => {
  it('resta los días del rango; "todo" no tiene desde', () => {
    expect(desdeDeRango('7d', AHORA)).toBe(hace(7))
    expect(desdeDeRango('30d', AHORA)).toBe(hace(30))
    expect(desdeDeRango('todo', AHORA)).toBeNull()
  })
})

describe('precisionPorObjetivo', () => {
  it('agrupa por objetivo y calcula precisión', () => {
    const r = precisionPorObjetivo([
      { objetivo_id: 'a', correcto: true },
      { objetivo_id: 'a', correcto: false },
      { objetivo_id: 'b', correcto: true },
      { objetivo_id: 'b', correcto: true },
    ])
    expect(r).toEqual([
      { objetivo_id: 'a', intentos: 2, correctas: 1, precision: 50 },
      { objetivo_id: 'b', intentos: 2, correctas: 2, precision: 100 },
    ])
  })
  it('sin intentos devuelve lista vacía', () => {
    expect(precisionPorObjetivo([])).toEqual([])
  })
})
