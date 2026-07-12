import { describe, expect, it } from 'vitest'
import { DOMINIOS } from '../data/contenido'
import type { FilaEquipo } from './seguimiento'
import {
  CABECERAS_EQUIPO,
  etiquetaRango,
  filasDificiles,
  filasEquipo,
  filasTendencia,
  nombreDominio,
  resumenReporte,
  textoPeriodo,
} from './reportes'

const AHORA = Date.parse('2026-07-12T12:00:00Z')

function persona(sobre: Partial<FilaEquipo> = {}): FilaEquipo {
  return {
    user_id: 'u1',
    nombre: 'Sole Rojas',
    liga: 'oro',
    xp: 520,
    intentos: 10,
    correctas: 9,
    ultima_actividad: '2026-07-09T12:00:00Z', // hace 3 días
    obligatorias_pendientes: 0,
    ...sobre,
  }
}

describe('filasEquipo', () => {
  it('arma una fila por persona con liga, precisión y días', () => {
    const filas = filasEquipo([persona()], AHORA)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toEqual([
      'Sole Rojas',
      'Liga Oro',
      520,
      10,
      9,
      90, // 9/10
      3, // días desde última práctica
      0,
    ])
  })

  it('precisión vacía sin intentos y "nunca" sin actividad', () => {
    const filas = filasEquipo(
      [persona({ intentos: 0, correctas: 0, ultima_actividad: null })],
      AHORA
    )
    expect(filas[0][5]).toBe('') // precisión vacía
    expect(filas[0][6]).toBe('nunca')
  })

  it('el número de columnas coincide con las cabeceras', () => {
    const filas = filasEquipo([persona()], AHORA)
    expect(filas[0]).toHaveLength(CABECERAS_EQUIPO.length)
  })
})

describe('filasDificiles', () => {
  it('traduce el domain_id a su título y mantiene las métricas', () => {
    const dom = DOMINIOS[0]
    const filas = filasDificiles([
      { domain_id: dom.id, intentos: 20, correctas: 10, precision_pct: 50 },
    ])
    expect(filas[0]).toEqual([dom.titulo, 50, 10, 20])
  })

  it('si el dominio no existe, deja el id crudo', () => {
    const filas = filasDificiles([
      { domain_id: 'inexistente', intentos: 4, correctas: 1, precision_pct: 25 },
    ])
    expect(filas[0][0]).toBe('inexistente')
  })
})

describe('filasTendencia', () => {
  it('proyecta las cinco columnas en orden', () => {
    const filas = filasTendencia([
      {
        semana: '2026-07-06',
        intentos: 40,
        correctas: 34,
        precision_pct: 85,
        activos: 6,
      },
    ])
    expect(filas[0]).toEqual(['2026-07-06', 40, 34, 85, 6])
  })
})

describe('resumenReporte', () => {
  it('cuenta inactivos, baja precisión y obligatorios sobre el equipo', () => {
    const equipo = [
      persona({ user_id: 'a' }), // al día
      persona({ user_id: 'b', ultima_actividad: null }), // inactivo
      persona({ user_id: 'c', intentos: 10, correctas: 4 }), // 40% baja precisión
      persona({ user_id: 'd', obligatorias_pendientes: 2 }), // obligatorios
    ]
    expect(resumenReporte(equipo, AHORA)).toEqual({
      total: 4,
      inactivos: 1,
      bajaPrecision: 1,
      obligatorios: 1,
    })
  })
})

describe('textoPeriodo y etiquetaRango', () => {
  it('describe el período según el rango', () => {
    expect(textoPeriodo('30d')).toBe('Últimos 30 días')
    expect(textoPeriodo('todo')).toBe('Histórico completo')
    expect(etiquetaRango('7d')).toBe('7 días')
  })
})

describe('nombreDominio', () => {
  it('devuelve el título de un dominio real', () => {
    const dom = DOMINIOS[0]
    expect(nombreDominio(dom.id)).toBe(dom.titulo)
  })
})
