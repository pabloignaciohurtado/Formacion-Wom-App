import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BorradorMaterial } from './contenidoRemoto'

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

const { materialDesdePropuesta, slugLibre, generarBorradorDesdeLink } =
  await import('./borradorIa')

function base(): BorradorMaterial {
  return {
    slug: '',
    titulo: '',
    icono: '📘',
    descripcion: '',
    categoriaId: 'productos',
    publicado: false,
    objetivos: [{ id: null, titulo: '' }],
    preguntas: [
      {
        id: null,
        objetivo: 0,
        enunciado: '',
        opciones: ['', ''],
        correcta: 0,
        explicacion: '',
      },
    ],
    leccionId: null,
    leccionTitulo: '',
    leccionCuerpo: '',
  }
}

const OPCIONES = { ocupados: new Set<string>(), editandoExistente: false }

describe('slugLibre', () => {
  it('deriva el slug del título', () => {
    expect(slugLibre('Atención al cliente', new Set())).toBe(
      'atencion-al-cliente'
    )
  })

  it('sufija cuando el slug ya está ocupado', () => {
    expect(slugLibre('Fibra óptica', new Set(['fibra-optica']))).toBe(
      'fibra-optica-2'
    )
  })

  it('sigue sufijando hasta encontrar uno libre', () => {
    const ocupados = new Set(['portabilidad', 'portabilidad-2', 'portabilidad-3'])
    expect(slugLibre('Portabilidad', ocupados)).toBe('portabilidad-4')
  })

  it('devuelve cadena vacía si el título no da ningún slug', () => {
    expect(slugLibre('¿¡!?', new Set())).toBe('')
  })
})

describe('materialDesdePropuesta', () => {
  it('convierte una propuesta bien formada en un borrador editable', () => {
    const resultado = materialDesdePropuesta(
      {
        titulo: 'Ofertas de invierno',
        descripcion: 'Condiciones y vigencia de la campaña.',
        icono: '❄️',
        objetivos: ['Explicar la vigencia', 'Anticipar el precio final'],
        leccion: { titulo: 'Cómo presentarla', cuerpo: '## Qué incluye\n\nTexto.' },
        preguntas: [
          {
            enunciado: '¿Hasta cuándo dura?',
            opciones: ['Hasta agosto', 'Para siempre'],
            correcta: 0,
            explicacion: 'La vigencia está publicada.',
            objetivo: 1,
          },
        ],
      },
      base(),
      OPCIONES
    )

    expect(resultado.slug).toBe('ofertas-de-invierno')
    expect(resultado.titulo).toBe('Ofertas de invierno')
    expect(resultado.icono).toBe('❄️')
    expect(resultado.objetivos).toHaveLength(2)
    expect(resultado.leccionCuerpo).toContain('## Qué incluye')
    expect(resultado.preguntas[0].objetivo).toBe(1)
    expect(resultado.preguntas[0].opciones).toEqual([
      'Hasta agosto',
      'Para siempre',
    ])
  })

  it('acota el índice de la alternativa correcta fuera de rango', () => {
    const resultado = materialDesdePropuesta(
      {
        objetivos: ['Uno'],
        preguntas: [
          {
            enunciado: 'Pregunta',
            opciones: ['A', 'B'],
            correcta: 7,
            explicacion: '',
            objetivo: 0,
          },
        ],
      },
      base(),
      OPCIONES
    )
    expect(resultado.preguntas[0].correcta).toBe(1)
  })

  it('acota el objetivo asociado al número de objetivos propuestos', () => {
    const resultado = materialDesdePropuesta(
      {
        objetivos: ['Uno', 'Dos'],
        preguntas: [
          {
            enunciado: 'Pregunta',
            opciones: ['A', 'B'],
            correcta: 0,
            explicacion: '',
            objetivo: 9,
          },
        ],
      },
      base(),
      OPCIONES
    )
    expect(resultado.preguntas[0].objetivo).toBe(1)
  })

  it('descarta preguntas sin enunciado o con una sola alternativa', () => {
    const resultado = materialDesdePropuesta(
      {
        objetivos: ['Uno'],
        preguntas: [
          { enunciado: '', opciones: ['A', 'B'], correcta: 0, objetivo: 0 },
          { enunciado: 'Válida', opciones: ['A', 'B'], correcta: 0, objetivo: 0 },
          { enunciado: 'Coja', opciones: ['A'], correcta: 0, objetivo: 0 },
        ],
      },
      base(),
      OPCIONES
    )
    expect(resultado.preguntas).toHaveLength(1)
    expect(resultado.preguntas[0].enunciado).toBe('Válida')
  })

  it('recorta las alternativas al máximo permitido', () => {
    const resultado = materialDesdePropuesta(
      {
        objetivos: ['Uno'],
        preguntas: [
          {
            enunciado: 'Pregunta',
            opciones: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            correcta: 7,
            objetivo: 0,
          },
        ],
      },
      base(),
      OPCIONES
    )
    expect(resultado.preguntas[0].opciones).toHaveLength(6)
    expect(resultado.preguntas[0].correcta).toBe(5)
  })

  it('recorta los objetivos al máximo permitido', () => {
    const resultado = materialDesdePropuesta(
      { objetivos: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
      base(),
      OPCIONES
    )
    expect(resultado.objetivos).toHaveLength(6)
  })

  it('conserva lo que el administrador ya había escrito si la IA no lo propone', () => {
    const previo: BorradorMaterial = {
      ...base(),
      titulo: 'Mi título',
      descripcion: 'Mi descripción',
      leccionCuerpo: 'Mi lección',
    }
    const resultado = materialDesdePropuesta({}, previo, OPCIONES)
    expect(resultado.titulo).toBe('Mi título')
    expect(resultado.descripcion).toBe('Mi descripción')
    expect(resultado.leccionCuerpo).toBe('Mi lección')
  })

  it('nunca cambia el slug de un material que ya existe', () => {
    const previo: BorradorMaterial = { ...base(), slug: 'ya-existente' }
    const resultado = materialDesdePropuesta(
      { titulo: 'Otro título completamente distinto' },
      previo,
      { ocupados: new Set(), editandoExistente: true }
    )
    expect(resultado.slug).toBe('ya-existente')
  })

  it('evita colisionar con un dominio ya ocupado', () => {
    const resultado = materialDesdePropuesta(
      { titulo: 'Fibra óptica' },
      base(),
      { ocupados: new Set(['fibra-optica']), editandoExistente: false }
    )
    expect(resultado.slug).toBe('fibra-optica-2')
  })

  it('tolera una respuesta nula o con tipos inesperados', () => {
    expect(materialDesdePropuesta(null, base(), OPCIONES).titulo).toBe('')
    const raro = materialDesdePropuesta(
      {
        titulo: 42,
        objetivos: 'no es una lista',
        preguntas: { tampoco: true },
        leccion: 'texto suelto',
      } as never,
      base(),
      OPCIONES
    )
    expect(raro.titulo).toBe('')
    expect(raro.objetivos).toHaveLength(1)
    expect(raro.preguntas).toHaveLength(1)
  })

  it('conserva la categoría y el estado de publicación del borrador previo', () => {
    const previo: BorradorMaterial = {
      ...base(),
      categoriaId: 'habilidades',
      publicado: true,
    }
    const resultado = materialDesdePropuesta(
      { titulo: 'Algo' },
      previo,
      OPCIONES
    )
    expect(resultado.categoriaId).toBe('habilidades')
    expect(resultado.publicado).toBe(true)
  })
})

describe('generarBorradorDesdeLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a la Edge Function con el link y las opciones normalizadas', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        propuesta: { titulo: 'Portabilidad' },
        fuente: { url: 'https://ejemplo.com/ayuda', tituloDetectado: 'Ayuda' },
      },
      error: null,
    } as never)

    const resultado = await generarBorradorDesdeLink({
      url: '  https://ejemplo.com/ayuda  ',
      cantidadPreguntas: 30,
      foco: '  precios  ',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'generar-ejercicios-desde-link',
      {
        body: {
          url: 'https://ejemplo.com/ayuda',
          cantidadPreguntas: 12,
          foco: 'precios',
        },
      }
    )
    expect(resultado.error).toBeNull()
    expect(resultado.propuesta?.titulo).toBe('Portabilidad')
    expect(resultado.fuente).toEqual({
      url: 'https://ejemplo.com/ayuda',
      tituloDetectado: 'Ayuda',
    })
  })

  it('devuelve el mensaje de error del cuerpo de la respuesta', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        context: {
          json: async () => ({ error: 'Ese destino no está permitido.' }),
        },
      },
    } as never)

    const resultado = await generarBorradorDesdeLink({
      url: 'http://10.0.0.5/panel',
      cantidadPreguntas: 5,
      foco: '',
    })

    expect(resultado.propuesta).toBeNull()
    expect(resultado.error).toBe('Ese destino no está permitido.')
  })

  it('usa un mensaje genérico si el error no trae cuerpo JSON', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {},
    } as never)

    const resultado = await generarBorradorDesdeLink({
      url: 'https://ejemplo.com',
      cantidadPreguntas: 5,
      foco: '',
    })

    expect(resultado.error).toBe('No se pudo generar el borrador desde el link.')
  })

  it('avisa si la IA no devuelve propuesta', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {},
      error: null,
    } as never)

    const resultado = await generarBorradorDesdeLink({
      url: 'https://ejemplo.com',
      cantidadPreguntas: 5,
      foco: '',
    })

    expect(resultado.propuesta).toBeNull()
    expect(resultado.error).toBe('La IA no devolvió una propuesta.')
  })
})
