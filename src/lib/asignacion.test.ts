import { describe, expect, it } from 'vitest'
import {
  denominadorAvance,
  destinatariosAInsertar,
  opcionesAlcance,
  personasAsignables,
  type PersonaAsignable,
} from './asignacion'

const SUP = 'sup-1'
const personas: PersonaAsignable[] = [
  { id: SUP, nombre: 'Sole Supervisora', activo: true, supervisor_id: null },
  { id: 'eje-1', nombre: 'Elena', activo: true, supervisor_id: SUP },
  { id: 'eje-2', nombre: 'Erik', activo: true, supervisor_id: SUP },
  { id: 'eje-3', nombre: 'Baja', activo: false, supervisor_id: SUP },
  { id: 'eje-4', nombre: 'De otro equipo', activo: true, supervisor_id: 'sup-2' },
]

describe('personasAsignables', () => {
  it('admin ve a todas las personas activas menos a sí mismo', () => {
    const ids = personasAsignables('admin', 'eje-1', personas).map((p) => p.id)
    expect(ids).toEqual([SUP, 'eje-2', 'eje-4'])
  })

  it('supervisor ve solo a su equipo activo', () => {
    const ids = personasAsignables('supervisor', SUP, personas).map((p) => p.id)
    expect(ids).toEqual(['eje-1', 'eje-2'])
  })

  it('excluye a inactivos siempre', () => {
    const ids = personasAsignables('admin', SUP, personas).map((p) => p.id)
    expect(ids).not.toContain('eje-3')
  })

  it('un ejecutivo no tiene a quién asignar', () => {
    expect(personasAsignables('ejecutivo', 'eje-1', personas)).toEqual([])
  })
})

describe('opcionesAlcance', () => {
  it('admin: todos, y personas si hay asignables', () => {
    expect(opcionesAlcance('admin', 3)).toEqual(['todos', 'persona'])
    expect(opcionesAlcance('admin', 0)).toEqual(['todos'])
  })

  it('supervisor: equipo y personas, nunca todos', () => {
    expect(opcionesAlcance('supervisor', 2)).toEqual(['equipo', 'persona'])
  })

  it('supervisor sin equipo no tiene opciones', () => {
    expect(opcionesAlcance('supervisor', 0)).toEqual([])
  })

  it('ejecutivo no tiene opciones', () => {
    expect(opcionesAlcance('ejecutivo', 5)).toEqual([])
  })
})

describe('destinatariosAInsertar', () => {
  const equipo = personasAsignables('supervisor', SUP, personas)

  it("'todos' no lleva destinatarios: la visibilidad la da el alcance", () => {
    expect(destinatariosAInsertar('todos', equipo, new Set(['eje-1']))).toEqual([])
  })

  it("'equipo' incluye a todo el equipo asignable", () => {
    expect(destinatariosAInsertar('equipo', equipo, new Set())).toEqual([
      'eje-1',
      'eje-2',
    ])
  })

  it("'persona' respeta la selección, ignorando ids fuera del universo", () => {
    const seleccion = new Set(['eje-2', 'eje-4', 'fantasma'])
    expect(destinatariosAInsertar('persona', equipo, seleccion)).toEqual(['eje-2'])
  })
})

describe('denominadorAvance', () => {
  it("'todos' se mide contra los activos de la plataforma", () => {
    expect(denominadorAvance('todos', 0, 8)).toBe(8)
  })

  it("'equipo' y 'persona' se miden contra sus destinatarios", () => {
    expect(denominadorAvance('equipo', 4, 8)).toBe(4)
    expect(denominadorAvance('persona', 1, 8)).toBe(1)
  })
})
