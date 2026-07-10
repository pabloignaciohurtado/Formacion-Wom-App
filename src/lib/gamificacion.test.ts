import { describe, expect, it } from 'vitest'
import {
  LIGAS,
  NIVELES,
  XP_ACIERTO,
  XP_INTENTO,
  ligaDe,
  nivelDe,
  xpTotal,
} from './gamificacion'

describe('xpTotal', () => {
  it('paga más por acertar que por intentar', () => {
    expect(XP_ACIERTO).toBeGreaterThan(XP_INTENTO)
  })
  it('suma aciertos y fallos por separado', () => {
    // 3 intentos, 2 correctos → 2*25 + 1*5
    expect(xpTotal(3, 2)).toBe(2 * XP_ACIERTO + 1 * XP_INTENTO)
  })
  it('sin intentos no hay XP', () => {
    expect(xpTotal(0, 0)).toBe(0)
  })
  it('acertarlo todo no regala XP de intento', () => {
    expect(xpTotal(4, 4)).toBe(4 * XP_ACIERTO)
  })
})

describe('nivelDe', () => {
  it('empieza en el primer nivel', () => {
    expect(nivelDe(0).actual).toEqual(NIVELES[0])
  })
  it('el progreso va de 0 a 1 dentro del nivel', () => {
    const enMedio = nivelDe(75) // Aprendiz: 0 → Explorador: 150
    expect(enMedio.progreso).toBeCloseTo(0.5)
  })
  it('al alcanzar el umbral exacto ya se está en el nivel nuevo', () => {
    expect(nivelDe(150).actual.nombre).toBe('Explorador')
    expect(nivelDe(149).actual.nombre).toBe('Aprendiz')
  })
  it('en el nivel máximo no hay siguiente y el progreso es 1', () => {
    const tope = nivelDe(999999)
    expect(tope.siguiente).toBeNull()
    expect(tope.progreso).toBe(1)
    expect(tope.actual).toEqual(NIVELES[NIVELES.length - 1])
  })
  it('los umbrales están en orden ascendente', () => {
    const mins = NIVELES.map((n) => n.min)
    expect([...mins].sort((a, b) => a - b)).toEqual(mins)
  })
})

describe('ligaDe', () => {
  it('resuelve una liga conocida', () => {
    expect(ligaDe('oro').nombre).toBe('Liga Oro')
  })
  it('cae en la liga más baja ante un valor desconocido, nulo o indefinido', () => {
    expect(ligaDe('inexistente')).toEqual(LIGAS[0])
    expect(ligaDe(null)).toEqual(LIGAS[0])
    expect(ligaDe(undefined)).toEqual(LIGAS[0])
  })
})
