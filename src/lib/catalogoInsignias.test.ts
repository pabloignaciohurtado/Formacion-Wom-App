import { describe, expect, it } from 'vitest'
import {
  agruparPorCategoria,
  combinarInsignias,
  etiquetaCategoria,
  ORDEN_CATEGORIAS,
  type InsigniaCatalogo,
} from './catalogoInsignias'

function insignia(p: Partial<InsigniaCatalogo> & { id: string }): InsigniaCatalogo {
  return {
    id: p.id,
    nombre: p.nombre ?? p.id,
    descripcion: p.descripcion ?? '',
    categoria: p.categoria ?? 'ventas',
    tier: p.tier ?? 'bronce',
    icono: p.icono ?? '🏅',
    color_hex: p.color_hex ?? '#4D008C',
    criterio: p.criterio ?? 'Cumplir el criterio.',
    activa: p.activa ?? true,
    orden: p.orden ?? 0,
    creado_en: p.creado_en ?? '2026-01-01T00:00:00Z',
  }
}

describe('combinarInsignias', () => {
  it('marca como obtenidas solo las que están en el mapa', () => {
    const catalogo = [insignia({ id: 'a' }), insignia({ id: 'b' })]
    const obtenidas = new Map([['a', '2026-01-02T00:00:00Z']])
    const resultado = combinarInsignias(catalogo, obtenidas)
    expect(resultado.find((i) => i.id === 'a')).toMatchObject({
      obtenida: true,
      obtenidaEn: '2026-01-02T00:00:00Z',
    })
    expect(resultado.find((i) => i.id === 'b')).toMatchObject({
      obtenida: false,
      obtenidaEn: null,
    })
  })

  it('sin insignias obtenidas, todo queda en false', () => {
    const catalogo = [insignia({ id: 'a' })]
    const resultado = combinarInsignias(catalogo, new Map())
    expect(resultado[0].obtenida).toBe(false)
  })
})

describe('agruparPorCategoria', () => {
  it('agrupa respetando el orden fijo de categorías', () => {
    const catalogo = combinarInsignias(
      [
        insignia({ id: 'form-1', categoria: 'formacion' }),
        insignia({ id: 'venta-1', categoria: 'ventas' }),
        insignia({ id: 'reten-1', categoria: 'retencion' }),
      ],
      new Map()
    )
    const grupos = agruparPorCategoria(catalogo)
    expect(grupos.map((g) => g.categoria)).toEqual(['ventas', 'retencion', 'formacion'])
  })

  it('no incluye categorías sin insignias activas', () => {
    const catalogo = combinarInsignias([insignia({ id: 'a', categoria: 'cultura' })], new Map())
    const grupos = agruparPorCategoria(catalogo)
    expect(grupos).toHaveLength(1)
    expect(grupos[0].categoria).toBe('cultura')
  })

  it('una categoría fuera del orden fijo igual se muestra (al final)', () => {
    const catalogo = combinarInsignias(
      [
        insignia({ id: 'a', categoria: 'ventas' }),
        insignia({ id: 'b', categoria: 'nueva-categoria' }),
      ],
      new Map()
    )
    const grupos = agruparPorCategoria(catalogo)
    expect(grupos.map((g) => g.categoria)).toEqual(['ventas', 'nueva-categoria'])
  })

  it('cada insignia de un grupo pertenece a esa categoría', () => {
    const catalogo = combinarInsignias(
      [insignia({ id: 'a', categoria: 'satisfaccion' }), insignia({ id: 'b', categoria: 'satisfaccion' })],
      new Map()
    )
    const grupos = agruparPorCategoria(catalogo)
    expect(grupos[0].insignias).toHaveLength(2)
    expect(grupos[0].insignias.every((i) => i.categoria === 'satisfaccion')).toBe(true)
  })
})

describe('etiquetaCategoria', () => {
  it('toda categoría del orden fijo tiene etiqueta legible en español', () => {
    for (const c of ORDEN_CATEGORIAS) {
      expect(etiquetaCategoria(c)).not.toBe(c)
    }
  })

  it('una categoría desconocida devuelve su propio id (no revienta)', () => {
    expect(etiquetaCategoria('inventada')).toBe('inventada')
  })
})
