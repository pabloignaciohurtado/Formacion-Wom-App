import { describe, expect, it } from 'vitest'
import {
  MAXIMO_LLAMADAS,
  MAXIMO_PATRONES,
  diagnosticoDesde,
  patronesPriorizados,
  resumenLote,
  separarLlamadas,
  type PatronError,
} from './transcripciones'

const LLAMADA = `Ejecutivo: Buenos días, le habla Camila de WOM.
Cliente: Necesito saber por qué me cobraron roaming si nunca salí del país.`

describe('separarLlamadas', () => {
  it('devuelve una sola llamada cuando no hay separadores', () => {
    expect(separarLlamadas(LLAMADA)).toEqual([LLAMADA])
  })

  it('separa por líneas de guiones, iguales o asteriscos', () => {
    const lote = `Llamada uno con contenido
---
Llamada dos con contenido
===
Llamada tres con contenido
***
Llamada cuatro con contenido`
    expect(separarLlamadas(lote)).toEqual([
      'Llamada uno con contenido',
      'Llamada dos con contenido',
      'Llamada tres con contenido',
      'Llamada cuatro con contenido',
    ])
  })

  it('separa por encabezados numerados en su propia línea', () => {
    const lote = `Llamada 1
Cliente: no me funciona la fibra.
Llamada 2:
Cliente: quiero portarme a otra compañía.
### Caso 3
Cliente: me cobraron de más.`
    expect(separarLlamadas(lote)).toEqual([
      'Cliente: no me funciona la fibra.',
      'Cliente: quiero portarme a otra compañía.',
      'Cliente: me cobraron de más.',
    ])
  })

  it('no parte la llamada cuando el texto solo menciona "llamada 3" dentro de una frase', () => {
    const texto = `Cliente: esta es la llamada 3 que hago por lo mismo.
Ejecutivo: entiendo su molestia.`
    expect(separarLlamadas(texto)).toHaveLength(1)
  })

  it('no genera un bloque vacío cuando el lote abre con el separador', () => {
    const lote = `--- Llamada 1 ---
Primera
---
Segunda`
    expect(separarLlamadas(lote)).toEqual(['Primera', 'Segunda'])
  })

  it('tolera saltos de línea de Windows', () => {
    expect(separarLlamadas('Uno\r\n---\r\nDos')).toEqual(['Uno', 'Dos'])
  })

  it('acota al máximo de llamadas', () => {
    const lote = Array.from(
      { length: MAXIMO_LLAMADAS + 12 },
      (_, i) => `Cliente: reclamo número ${i}.`
    ).join('\n---\n')
    expect(separarLlamadas(lote)).toHaveLength(MAXIMO_LLAMADAS)
  })

  it('descarta bloques en blanco', () => {
    expect(separarLlamadas('\n\n---\n\n   \n---\nÚnica')).toEqual(['Única'])
  })
})

describe('resumenLote', () => {
  it('pide contenido cuando no hay nada pegado', () => {
    expect(resumenLote('   ')).toMatchObject({
      llamadas: 0,
      impedimento: 'Pega al menos una transcripción.',
    })
  })

  it('avisa cuando el texto es demasiado corto para detectar patrones', () => {
    const resumen = resumenLote('Cliente: hola.')
    expect(resumen.llamadas).toBe(1)
    expect(resumen.impedimento).toContain('muy corto')
  })

  it('no pone impedimento con un lote suficiente y cuenta caracteres', () => {
    const lote = [LLAMADA, LLAMADA, LLAMADA].join('\n---\n')
    const resumen = resumenLote(lote)
    expect(resumen.llamadas).toBe(3)
    expect(resumen.impedimento).toBeNull()
    expect(resumen.caracteres).toBe(LLAMADA.length * 3)
    expect(resumen.descartadas).toBe(0)
  })

  it('reporta cuántas llamadas quedaron fuera por el tope', () => {
    const lote = Array.from(
      { length: MAXIMO_LLAMADAS + 5 },
      () => LLAMADA
    ).join('\n---\n')
    expect(resumenLote(lote).descartadas).toBe(5)
  })
})

describe('diagnosticoDesde', () => {
  const contexto = {
    llamadasAnalizadas: 4,
    idsValidos: new Set(['roaming', 'portabilidad']),
  }

  it('tolera null y respuestas con tipos equivocados', () => {
    expect(diagnosticoDesde(null, contexto)).toEqual({
      patrones: [],
      dominioSugerido: null,
      resumen: '',
    })
    expect(
      diagnosticoDesde({ patrones: 'no es un arreglo' }, contexto).patrones
    ).toEqual([])
  })

  it('acota el conteo de llamadas al tamaño real del lote', () => {
    const { patrones } = diagnosticoDesde(
      { patrones: [{ titulo: 'No valida identidad', llamadas: 99 }] },
      contexto
    )
    expect(patrones[0].llamadas).toBe(4)
  })

  it('sube a 1 un conteo de cero o negativo', () => {
    const { patrones } = diagnosticoDesde(
      { patrones: [{ titulo: 'Corta sin despedirse', llamadas: -3 }] },
      contexto
    )
    expect(patrones[0].llamadas).toBe(1)
  })

  it('normaliza una gravedad inventada a media', () => {
    const { patrones } = diagnosticoDesde(
      {
        patrones: [
          { titulo: 'A', gravedad: 'ALTA' },
          { titulo: 'B', gravedad: 'catastrófica' },
          { titulo: 'C', gravedad: 42 },
        ],
      },
      contexto
    )
    expect(patrones.map((p) => p.gravedad)).toEqual(['alta', 'media', 'media'])
  })

  it('descarta patrones sin título y recorta al máximo', () => {
    const brutos = [
      { titulo: '' },
      ...Array.from({ length: MAXIMO_PATRONES + 4 }, (_, i) => ({
        titulo: `Patrón ${i}`,
      })),
    ]
    const { patrones } = diagnosticoDesde({ patrones: brutos }, contexto)
    expect(patrones).toHaveLength(MAXIMO_PATRONES)
    expect(patrones[0].titulo).toBe('Patrón 0')
  })

  it('enlaza el dominio cuando el id existe en el catálogo', () => {
    const { dominioSugerido } = diagnosticoDesde(
      {
        dominioSugerido: {
          id: 'roaming',
          titulo: 'Roaming',
          motivo: 'Tres de cuatro llamadas son cobros de roaming.',
        },
      },
      contexto
    )
    expect(dominioSugerido).toMatchObject({
      id: 'roaming',
      esNuevo: false,
      titulo: 'Roaming',
    })
  })

  it('trata como nuevo el dominio cuyo id no existe', () => {
    const { dominioSugerido } = diagnosticoDesde(
      { dominioSugerido: { id: 'inventado-por-la-ia', titulo: 'Retención' } },
      contexto
    )
    expect(dominioSugerido).toMatchObject({ id: null, esNuevo: true })
  })

  it('devuelve null si la sugerencia no trae título', () => {
    expect(
      diagnosticoDesde({ dominioSugerido: { id: 'roaming' } }, contexto)
        .dominioSugerido
    ).toBeNull()
  })
})

describe('patronesPriorizados', () => {
  const patron = (
    titulo: string,
    gravedad: PatronError['gravedad'],
    llamadas: number
  ): PatronError => ({
    titulo,
    gravedad,
    llamadas,
    descripcion: '',
    ejemplo: '',
    impacto: '',
  })

  it('ordena por gravedad y desempata por frecuencia', () => {
    const orden = patronesPriorizados([
      patron('baja-5', 'baja', 5),
      patron('media-1', 'media', 1),
      patron('alta-2', 'alta', 2),
      patron('alta-9', 'alta', 9),
    ]).map((p) => p.titulo)
    expect(orden).toEqual(['alta-9', 'alta-2', 'media-1', 'baja-5'])
  })

  it('no muta el arreglo original', () => {
    const original = [patron('b', 'baja', 1), patron('a', 'alta', 1)]
    patronesPriorizados(original)
    expect(original[0].titulo).toBe('b')
  })
})
