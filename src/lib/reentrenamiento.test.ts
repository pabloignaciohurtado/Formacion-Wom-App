import { describe, expect, it } from 'vitest'
import {
  diasHastaLimite,
  estadoCiclo,
  porcentajeAvance,
  tipoMeta,
} from './reentrenamiento'

describe('estadoCiclo', () => {
  it('completado cuando ya se cumplió la meta, aunque falten días', () => {
    const manana = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
    expect(estadoCiclo(manana, true)).toBe('completado')
  })

  it('en_curso cuando no se cumplió pero la fecha límite no ha pasado', () => {
    const manana = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
    expect(estadoCiclo(manana, false)).toBe('en_curso')
  })

  it('incompleto cuando no se cumplió y la fecha límite ya pasó', () => {
    const ayer = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    expect(estadoCiclo(ayer, false)).toBe('incompleto')
  })

  it('completado tiene prioridad aunque la fecha ya haya pasado', () => {
    const ayer = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    expect(estadoCiclo(ayer, true)).toBe('completado')
  })
})

describe('diasHastaLimite', () => {
  it('es positivo para una fecha futura', () => {
    const enTresDias = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
    expect(diasHastaLimite(enTresDias)).toBeGreaterThanOrEqual(2)
    expect(diasHastaLimite(enTresDias)).toBeLessThanOrEqual(4)
  })

  it('es negativo para una fecha pasada', () => {
    const haceTresDias = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    expect(diasHastaLimite(haceTresDias)).toBeLessThan(0)
  })
})

describe('porcentajeAvance', () => {
  it('calcula el porcentaje simple', () => {
    expect(porcentajeAvance(5, 10)).toBe(50)
  })

  it('nunca pasa de 100 aunque haya más intentos que la meta', () => {
    expect(porcentajeAvance(15, 10)).toBe(100)
  })

  it('con meta 0 se considera cumplida (100)', () => {
    expect(porcentajeAvance(0, 0)).toBe(100)
  })

  it('sin intentos da 0', () => {
    expect(porcentajeAvance(0, 10)).toBe(0)
  })
})

describe('tipoMeta', () => {
  it('es de mantenimiento cuando el actual ya alcanza el objetivo', () => {
    expect(tipoMeta(85, 80)).toBe('mantenimiento')
    expect(tipoMeta(80, 80)).toBe('mantenimiento')
  })

  it('es de progreso cuando el actual está bajo el objetivo', () => {
    expect(tipoMeta(60, 80)).toBe('progreso')
  })
})
