import { describe, expect, it } from 'vitest'
import { DOMINIOS } from './contenido'
import { buscarEjercicio, construirColaRepaso } from './repaso'

// Ids reales del catálogo, de dos dominios distintos, para probar que la
// búsqueda global y la cola de repaso cruzan dominios.
const ID_PORTABILIDAD = 'po-01'
const ID_BOLETA = 'bp-01'

describe('buscarEjercicio', () => {
  it('encuentra un ejercicio y su dominio sin saber el dominio de antemano', () => {
    const item = buscarEjercicio(ID_PORTABILIDAD)
    expect(item).toBeDefined()
    expect(item?.dominio.id).toBe('portabilidad')
    expect(item?.ejercicio.id).toBe(ID_PORTABILIDAD)
  })

  it('resuelve ejercicios de dominios distintos', () => {
    expect(buscarEjercicio(ID_BOLETA)?.dominio.id).toBe('boleta-pagos')
  })

  it('devuelve undefined para un id inexistente', () => {
    expect(buscarEjercicio('no-existe-999')).toBeUndefined()
  })
})

describe('construirColaRepaso', () => {
  it('mezcla dominios respetando el orden recibido', () => {
    const cola = construirColaRepaso([ID_BOLETA, ID_PORTABILIDAD], 10)
    expect(cola.map((i) => i.dominio.id)).toEqual(['boleta-pagos', 'portabilidad'])
  })

  it('descarta ids que ya no existen en el catálogo', () => {
    const cola = construirColaRepaso([ID_PORTABILIDAD, 'fantasma', ID_BOLETA], 10)
    expect(cola).toHaveLength(2)
    expect(cola.map((i) => i.ejercicio.id)).toEqual([ID_PORTABILIDAD, ID_BOLETA])
  })

  it('respeta el límite de la sesión', () => {
    const ids = DOMINIOS[0].ejercicios.slice(0, 5).map((e) => e.id)
    expect(construirColaRepaso(ids, 3)).toHaveLength(3)
  })

  it('una lista vacía produce una cola vacía', () => {
    expect(construirColaRepaso([], 10)).toEqual([])
  })
})
