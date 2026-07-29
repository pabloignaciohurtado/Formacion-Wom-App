import { describe, expect, it } from 'vitest'
import { tieneAcceso } from './funcionalidades'

// Cascada de resolución de acceso (ver comentario de cabecera en
// `funcionalidades.ts`): 1) override individual, 2) grupo de acceso,
// 3) default habilitado.
describe('tieneAcceso', () => {
  it('caso 3 (default): sin override individual ni grupo, el acceso está habilitado', () => {
    expect(tieneAcceso(new Map(), null, 'ejercicios')).toBe(true)
    expect(tieneAcceso(new Map(), new Map(), 'ejercicios')).toBe(true)
  })

  it('caso 2 (grupo): sin override individual, manda el valor del grupo', () => {
    const grupo = new Map([['premios', true], ['ejercicios', false]])
    expect(tieneAcceso(new Map(), grupo, 'premios')).toBe(true)
    expect(tieneAcceso(new Map(), grupo, 'ejercicios')).toBe(false)
    // el grupo no opina de 'liga' -> cae al default habilitado
    expect(tieneAcceso(new Map(), grupo, 'liga')).toBe(true)
  })

  it('caso 1 (override individual): manda por sobre el grupo, en ambos sentidos', () => {
    const grupo = new Map([['premios', false]])
    const overrideHabilita = new Map([['premios', true]])
    const overrideRestringe = new Map([['ejercicios', false]])

    // el grupo restringe 'premios', pero el override individual se lo devuelve
    expect(tieneAcceso(overrideHabilita, grupo, 'premios')).toBe(true)
    // el grupo no dice nada de 'ejercicios' (default habilitado), pero el
    // override individual lo restringe de todas formas
    expect(tieneAcceso(overrideRestringe, grupo, 'ejercicios')).toBe(false)
  })

  it('restringir una funcionalidad no afecta a las demás (default sigue habilitado)', () => {
    const overrides = new Map([['liga', false]])
    expect(tieneAcceso(overrides, null, 'liga')).toBe(false)
    expect(tieneAcceso(overrides, null, 'ejercicios')).toBe(true)
    expect(tieneAcceso(overrides, null, 'consultas')).toBe(true)
  })
})
