import { describe, expect, it } from 'vitest'
import { CATEGORIAS, DOMINIOS, type Dominio } from '../data/contenido'
import {
  armarDominio,
  fusionarCategorias,
  fusionarDominios,
  idEjercicio,
  idObjetivo,
  idsOcupados,
  normalizarSlug,
  validarEjercicio,
  validarSlugDominio,
  type DominioFila,
  type EjercicioFila,
  type ObjetivoFila,
} from './catalogo'

function filaDominio(parcial: Partial<DominioFila> = {}): DominioFila {
  return {
    id: 'retencion-avanzada',
    titulo: 'Retención avanzada',
    icono: '🛟',
    descripcion: 'Cómo retener a un cliente que quiere irse.',
    categoria_id: 'habilidades',
    publicado: true,
    activo: true,
    creado_por: null,
    creado_en: '2026-07-10T00:00:00Z',
    actualizado_en: '2026-07-10T00:00:00Z',
    ...parcial,
  }
}

describe('normalizarSlug', () => {
  it('quita tildes, espacios y mayúsculas', () => {
    expect(normalizarSlug('Atención al Cliente')).toBe('atencion-al-cliente')
    expect(normalizarSlug('  Fibra   Óptica  ')).toBe('fibra-optica')
    expect(normalizarSlug('Plan 5G / Roaming')).toBe('plan-5g-roaming')
  })

  it('no deja guiones al inicio ni al final, ni siquiera al recortar', () => {
    expect(normalizarSlug('¡¿Qué?!')).toBe('que')
    expect(normalizarSlug('a'.repeat(46) + ' bc')).toBe('a'.repeat(46))
  })
})

describe('validarSlugDominio', () => {
  const ocupados = idsOcupados(DOMINIOS)

  it('acepta un slug nuevo que no choca con nada', () => {
    expect(validarSlugDominio('retencion-avanzada', ocupados)).toBeNull()
  })

  it('rechaza un id de dominio existente', () => {
    expect(validarSlugDominio('portabilidad', ocupados)).toContain('Ya existe')
  })

  it('rechaza un slug cuyos hijos chocarían con ids estáticos', () => {
    // El catálogo estático usa ids tipo `po-01`… pero también `cw-01`; un
    // slug corto podría generar colisiones si algún día se usa el formato
    // `<slug>-e<N>`. Se prueba con un catálogo sintético para fijar la regla.
    const sintetico: Dominio[] = [
      {
        id: 'otro',
        titulo: 'Otro',
        icono: '📘',
        descripcion: '',
        objetivos: [{ id: 'ret-o1', titulo: 'Objetivo' }],
        ejercicios: [],
      },
    ]
    expect(validarSlugDominio('ret', idsOcupados(sintetico))).toContain('choca')
  })

  it('rechaza formatos inválidos y largos fuera de rango', () => {
    expect(validarSlugDominio('ab', ocupados)).toContain('al menos')
    expect(validarSlugDominio('a'.repeat(49), ocupados)).toContain('superar')
    expect(validarSlugDominio('Con Mayúsculas', ocupados)).toContain('minúsculas')
    expect(validarSlugDominio('doble--guion', ocupados)).toContain('minúsculas')
    expect(validarSlugDominio('-inicio', ocupados)).toContain('minúsculas')
  })
})

describe('ids derivados', () => {
  it('derivan del slug para heredar su unicidad', () => {
    expect(idObjetivo('retencion', 2)).toBe('retencion-o2')
    expect(idEjercicio('retencion', 11)).toBe('retencion-e11')
  })
})

describe('validarEjercicio', () => {
  const valido = {
    enunciado: '¿Qué es la portabilidad?',
    opciones: ['Cambiar de equipo', 'Cambiar de operador manteniendo el número'],
    correcta: 1,
    explicacion: 'Es un derecho del cliente.',
  }

  it('no devuelve errores para una pregunta bien formada', () => {
    expect(validarEjercicio(valido)).toEqual([])
  })

  it('exige enunciado, explicación y alternativa correcta marcada', () => {
    const errores = validarEjercicio({
      ...valido,
      enunciado: '   ',
      explicacion: '',
      correcta: 5,
    })
    expect(errores).toHaveLength(3)
    expect(errores.join(' ')).toContain('explicación')
  })

  it('detecta alternativas repetidas y cantidad insuficiente', () => {
    expect(validarEjercicio({ ...valido, opciones: ['Una', 'Una'] })).toContain(
      'Hay alternativas repetidas.'
    )
    expect(
      validarEjercicio({ ...valido, opciones: ['Una', ''], correcta: 0 }).join(' ')
    ).toContain('al menos 2')
  })

  it('rechaza marcar como correcta una alternativa vacía', () => {
    const errores = validarEjercicio({
      ...valido,
      opciones: ['Una', '  ', 'Tres'],
      correcta: 1,
    })
    expect(errores.join(' ')).toContain('correcta')
  })
})

describe('armarDominio', () => {
  const fila = filaDominio()
  const objetivos: ObjetivoFila[] = [
    { id: 'retencion-avanzada-o2', dominio_id: fila.id, titulo: 'Segundo', orden: 2 },
    { id: 'retencion-avanzada-o1', dominio_id: fila.id, titulo: 'Primero', orden: 1 },
    { id: 'otro-o1', dominio_id: 'otro', titulo: 'Ajeno', orden: 1 },
  ]
  const ejercicios: EjercicioFila[] = [
    {
      id: 'retencion-avanzada-e1',
      dominio_id: fila.id,
      objetivo_id: 'retencion-avanzada-o1',
      enunciado: 'Pregunta',
      opciones: ['A', 'B'],
      correcta: 1,
      explicacion: 'Porque sí',
      orden: 1,
      activo: true,
    },
    {
      id: 'huerfano-e1',
      dominio_id: fila.id,
      objetivo_id: 'objetivo-borrado',
      enunciado: 'Sin objetivo',
      opciones: ['A', 'B'],
      correcta: 0,
      explicacion: '...',
      orden: 2,
      activo: true,
    },
  ]

  it('ordena por `orden` y descarta lo que es de otro dominio', () => {
    const dominio = armarDominio(fila, objetivos, ejercicios)
    expect(dominio.objetivos.map((o) => o.id)).toEqual([
      'retencion-avanzada-o1',
      'retencion-avanzada-o2',
    ])
  })

  it('descarta ejercicios cuyo objetivo ya no existe', () => {
    const dominio = armarDominio(fila, objetivos, ejercicios)
    expect(dominio.ejercicios.map((e) => e.id)).toEqual(['retencion-avanzada-e1'])
    expect(dominio.ejercicios[0].objetivoId).toBe('retencion-avanzada-o1')
  })
})

describe('fusionarDominios', () => {
  it('agrega los remotos al final y conserva los 13 estáticos', () => {
    const remoto = armarDominio(filaDominio(), [], [])
    const fusionado = fusionarDominios(DOMINIOS, [remoto])
    expect(fusionado).toHaveLength(DOMINIOS.length + 1)
    expect(fusionado.slice(0, DOMINIOS.length)).toEqual(DOMINIOS)
  })

  it('el estático gana ante un id repetido', () => {
    const impostor = armarDominio(filaDominio({ id: 'portabilidad' }), [], [])
    const fusionado = fusionarDominios(DOMINIOS, [impostor])
    expect(fusionado).toHaveLength(DOMINIOS.length)
    expect(fusionado.find((d) => d.id === 'portabilidad')?.titulo).toBe('Portabilidad')
  })
})

describe('fusionarCategorias', () => {
  const idsEstaticos = new Set(DOMINIOS.map((d) => d.id))

  it('suma el dominio nuevo a su categoría sin tocar las demás', () => {
    const resultado = fusionarCategorias(
      CATEGORIAS,
      [filaDominio({ categoria_id: 'habilidades' })],
      idsEstaticos
    )
    const habilidades = resultado.find((c) => c.id === 'habilidades')
    expect(habilidades?.dominios).toContain('retencion-avanzada')
    expect(resultado.find((c) => c.id === 'productos')).toBe(
      CATEGORIAS.find((c) => c.id === 'productos')
    )
  })

  it('manda a la primera categoría un dominio con categoría desconocida', () => {
    const resultado = fusionarCategorias(
      CATEGORIAS,
      [filaDominio({ categoria_id: 'inexistente' })],
      idsEstaticos
    )
    expect(resultado[0].dominios).toContain('retencion-avanzada')
  })

  it('ignora un dominio que ya existe como estático', () => {
    const resultado = fusionarCategorias(
      CATEGORIAS,
      [filaDominio({ id: 'portabilidad', categoria_id: 'habilidades' })],
      idsEstaticos
    )
    expect(resultado).toEqual(CATEGORIAS)
  })
})
