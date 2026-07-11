import { describe, expect, it } from 'vitest'
import { CATEGORIAS, DOMINIOS } from './contenido'

// Integridad del catálogo: barato de mantener, atrapa errores de autoría
// (un `correcta` fuera de rango, un objetivoId mal escrito, ids duplicados)
// que de otro modo solo se notarían en producción.
describe('catálogo de contenidos', () => {
  const dominioIds = new Set(DOMINIOS.map((d) => d.id))

  it('las categorías referencian dominios que existen', () => {
    for (const cat of CATEGORIAS) {
      for (const id of cat.dominios) {
        expect(dominioIds, `categoría ${cat.id} → ${id}`).toContain(id)
      }
    }
  })

  it('los ids de dominio son únicos', () => {
    expect(dominioIds.size).toBe(DOMINIOS.length)
  })

  for (const d of DOMINIOS) {
    describe(`dominio ${d.id}`, () => {
      const objetivoIds = new Set(d.objetivos.map((o) => o.id))

      it('los ejercicios apuntan a un objetivo del dominio', () => {
        for (const e of d.ejercicios) {
          expect(objetivoIds, `${e.id}`).toContain(e.objetivoId)
        }
      })

      it('correcta es un índice válido de opciones', () => {
        for (const e of d.ejercicios) {
          expect(e.correcta, `${e.id}`).toBeGreaterThanOrEqual(0)
          expect(e.correcta, `${e.id}`).toBeLessThan(e.opciones.length)
        }
      })

      it('cada ejercicio tiene al menos 2 opciones y una explicación', () => {
        for (const e of d.ejercicios) {
          expect(e.opciones.length, `${e.id}`).toBeGreaterThanOrEqual(2)
          expect(e.explicacion.length, `${e.id}`).toBeGreaterThan(0)
        }
      })

      it('los ids de ejercicio no se repiten', () => {
        const ids = d.ejercicios.map((e) => e.id)
        expect(new Set(ids).size).toBe(ids.length)
      })
    })
  }
})
