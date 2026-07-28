import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  aplicarTema,
  escucharSistema,
  guardarTema,
  leerTema,
  resolverTema,
} from './tema'

// El entorno de vitest es `node` (ver vitest.config.ts) porque el resto de
// src/lib es lógica pura. Aquí se montan los mínimos de DOM que usa tema.ts
// en vez de arrastrar jsdom como dependencia solo por este archivo.

type Oyente = () => void

let clases: Set<string>
let almacen: Map<string, string>
let oyentes: Oyente[]
let sistemaOscuro: boolean
let metaThemeColor: string | null

function montarDom({ conMeta = true } = {}) {
  clases = new Set()
  almacen = new Map()
  oyentes = []
  sistemaOscuro = false
  metaThemeColor = null

  const raiz = {
    classList: {
      toggle: (nombre: string, activar: boolean) => {
        if (activar) clases.add(nombre)
        else clases.delete(nombre)
      },
    },
    style: { colorScheme: '' },
  }

  vi.stubGlobal('document', {
    documentElement: raiz,
    querySelector: () =>
      conMeta
        ? {
            setAttribute: (_nombre: string, valor: string) => {
              metaThemeColor = valor
            },
          }
        : null,
  })

  vi.stubGlobal('window', {
    localStorage: {
      getItem: (clave: string) => almacen.get(clave) ?? null,
      setItem: (clave: string, valor: string) => almacen.set(clave, valor),
    },
    matchMedia: () => ({
      get matches() {
        return sistemaOscuro
      },
      addEventListener: (_evento: string, oyente: Oyente) =>
        oyentes.push(oyente),
      removeEventListener: (_evento: string, oyente: Oyente) => {
        oyentes = oyentes.filter((o) => o !== oyente)
      },
    }),
  })

  return raiz
}

beforeEach(() => montarDom())
afterEach(() => vi.unstubAllGlobals())

describe('leerTema', () => {
  it('sin nada guardado, sigue al sistema', () => {
    expect(leerTema()).toBe('sistema')
  })

  it('devuelve la preferencia guardada', () => {
    almacen.set('tema', 'oscuro')
    expect(leerTema()).toBe('oscuro')
  })

  it('ignora un valor corrupto en localStorage', () => {
    almacen.set('tema', 'neón')
    expect(leerTema()).toBe('sistema')
  })

  it('no revienta si localStorage lanza (Safari en privado)', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('acceso denegado')
        },
      },
      matchMedia: () => ({ matches: false }),
    })
    expect(leerTema()).toBe('sistema')
  })
})

describe('resolverTema', () => {
  it('claro y oscuro se resuelven a sí mismos', () => {
    expect(resolverTema('claro')).toBe('claro')
    expect(resolverTema('oscuro')).toBe('oscuro')
  })

  it('sistema depende de prefers-color-scheme', () => {
    sistemaOscuro = true
    expect(resolverTema('sistema')).toBe('oscuro')
    sistemaOscuro = false
    expect(resolverTema('sistema')).toBe('claro')
  })
})

describe('aplicarTema', () => {
  it('activa la clase dark y el color-scheme oscuro', () => {
    const raiz = montarDom()
    aplicarTema('oscuro')
    expect(clases.has('dark')).toBe(true)
    expect(raiz.style.colorScheme).toBe('dark')
    expect(metaThemeColor).toBe('#120a1e')
  })

  it('vuelve a claro quitando la clase', () => {
    const raiz = montarDom()
    aplicarTema('oscuro')
    aplicarTema('claro')
    expect(clases.has('dark')).toBe(false)
    expect(raiz.style.colorScheme).toBe('light')
    expect(metaThemeColor).toBe('#eff1f3')
  })

  it('con sistema sigue la preferencia del sistema operativo', () => {
    montarDom()
    sistemaOscuro = true
    aplicarTema('sistema')
    expect(clases.has('dark')).toBe(true)
  })

  it('no falla si la página no tiene meta theme-color', () => {
    montarDom({ conMeta: false })
    expect(() => aplicarTema('oscuro')).not.toThrow()
    expect(clases.has('dark')).toBe(true)
  })
})

describe('guardarTema', () => {
  it('persiste la elección y la aplica de una vez', () => {
    guardarTema('oscuro')
    expect(almacen.get('tema')).toBe('oscuro')
    expect(clases.has('dark')).toBe(true)
  })

  it('aplica el tema aunque no se pueda persistir', () => {
    const raiz = montarDom()
    const original = window.localStorage.setItem
    vi.stubGlobal('window', {
      ...window,
      localStorage: {
        ...window.localStorage,
        setItem: () => {
          throw new Error('cuota excedida')
        },
      },
    })
    expect(() => guardarTema('oscuro')).not.toThrow()
    expect(raiz.style.colorScheme).toBe('dark')
    expect(original).toBeTypeOf('function')
  })
})

describe('escucharSistema', () => {
  it('avisa de los cambios y permite desuscribirse', () => {
    const alCambiar = vi.fn()
    const desuscribir = escucharSistema(alCambiar)

    expect(oyentes).toHaveLength(1)
    oyentes[0]!()
    expect(alCambiar).toHaveBeenCalledTimes(1)

    desuscribir()
    expect(oyentes).toHaveLength(0)
  })
})
