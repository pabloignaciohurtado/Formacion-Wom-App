import { describe, expect, it } from 'vitest'
import { INSIGNIAS, evaluarInsignias, type ContextoInsignias } from './insignias'

const vacio: ContextoInsignias = {
  intentos: 0,
  racha: 0,
  tieneDominio100: false,
  fueHeroe: false,
  obligatoriasAlDia: false,
}
const con = (p: Partial<ContextoInsignias>) => evaluarInsignias({ ...vacio, ...p })

describe('evaluarInsignias', () => {
  it('sin actividad no otorga ninguna', () => {
    expect(con({})).toEqual([])
  })

  it('el primer ejercicio otorga la primera insignia', () => {
    expect(con({ intentos: 1 })).toContain('primera-sesion')
  })

  it('las rachas son acumulativas: 14 días implica 3 y 7', () => {
    const r = con({ racha: 14 })
    expect(r).toEqual(expect.arrayContaining(['racha-3', 'racha-7', 'racha-14']))
  })

  it('respeta los umbrales exactos', () => {
    expect(con({ racha: 2 })).not.toContain('racha-3')
    expect(con({ racha: 3 })).toContain('racha-3')
    expect(con({ intentos: 49 })).not.toContain('ejercicios-50')
    expect(con({ intentos: 50 })).toContain('ejercicios-50')
    expect(con({ intentos: 99 })).not.toContain('ejercicios-100')
    expect(con({ intentos: 100 })).toContain('ejercicios-100')
  })

  it('los hitos de volumen son acumulativos', () => {
    expect(con({ intentos: 100 })).toEqual(
      expect.arrayContaining(['primera-sesion', 'ejercicios-50', 'ejercicios-100'])
    )
  })

  it('cada bandera otorga su insignia', () => {
    expect(con({ tieneDominio100: true })).toContain('dominio-100')
    expect(con({ fueHeroe: true })).toContain('heroe-semana')
    expect(con({ obligatoriasAlDia: true })).toContain('obligatorias-al-dia')
  })
})

describe('catálogo', () => {
  it('no tiene identificadores repetidos', () => {
    const ids = INSIGNIAS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Una insignia que se otorga pero no está en el catálogo no se puede mostrar:
  // el modal quedaría sin nombre ni icono.
  it('toda insignia otorgable existe en el catálogo', () => {
    const todas = evaluarInsignias({
      intentos: 100,
      racha: 14,
      tieneDominio100: true,
      fueHeroe: true,
      obligatoriasAlDia: true,
    })
    const catalogo = new Set(INSIGNIAS.map((i) => i.id))
    for (const id of todas) expect(catalogo.has(id)).toBe(true)
  })

  it('el catálogo cubre todas las insignias otorgables', () => {
    const otorgables = new Set(
      evaluarInsignias({
        intentos: 100,
        racha: 14,
        tieneDominio100: true,
        fueHeroe: true,
        obligatoriasAlDia: true,
      })
    )
    for (const i of INSIGNIAS) expect(otorgables.has(i.id)).toBe(true)
  })
})
