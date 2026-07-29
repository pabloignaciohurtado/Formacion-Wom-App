import { describe, expect, it } from 'vitest'
import { tieneAcceso } from './funcionalidades'

describe('tieneAcceso', () => {
  it('sin restricciones, el acceso está habilitado por defecto', () => {
    expect(tieneAcceso(new Set(), 'ejercicios')).toBe(true)
  })

  it('una funcionalidad restringida explícitamente queda sin acceso', () => {
    const restricciones = new Set(['liga'])
    expect(tieneAcceso(restricciones, 'liga')).toBe(false)
  })

  it('restringir una funcionalidad no afecta a las demás (default sigue habilitado)', () => {
    const restricciones = new Set(['liga'])
    expect(tieneAcceso(restricciones, 'ejercicios')).toBe(true)
    expect(tieneAcceso(restricciones, 'consultas')).toBe(true)
  })
})
