import { describe, expect, it } from 'vitest'
import {
  esAdmin,
  etiquetaRol,
  puedeAsignar,
  puedeTenerSupervisor,
} from './roles'

describe('etiquetaRol', () => {
  it('traduce cada rol conocido', () => {
    expect(etiquetaRol('admin')).toBe('Administrador')
    expect(etiquetaRol('supervisor')).toBe('Supervisor')
    expect(etiquetaRol('ejecutivo')).toBe('Ejecutivo')
  })

  it('ante un rol desconocido o nulo cae al de menor privilegio', () => {
    expect(etiquetaRol('relator')).toBe('Ejecutivo')
    expect(etiquetaRol(null)).toBe('Ejecutivo')
    expect(etiquetaRol(undefined)).toBe('Ejecutivo')
  })
})

describe('esAdmin', () => {
  it('solo el admin es admin', () => {
    expect(esAdmin('admin')).toBe(true)
    expect(esAdmin('supervisor')).toBe(false)
    expect(esAdmin('ejecutivo')).toBe(false)
    expect(esAdmin(null)).toBe(false)
  })
})

describe('puedeAsignar', () => {
  it('supervisores y admins asignan; ejecutivos no', () => {
    expect(puedeAsignar('admin')).toBe(true)
    expect(puedeAsignar('supervisor')).toBe(true)
    expect(puedeAsignar('ejecutivo')).toBe(false)
    expect(puedeAsignar(undefined)).toBe(false)
  })
})

describe('puedeTenerSupervisor', () => {
  it('ejecutivos y supervisores pueden tener jefe', () => {
    expect(puedeTenerSupervisor('ejecutivo')).toBe(true)
    expect(puedeTenerSupervisor('supervisor')).toBe(true)
  })

  it('el admin no reporta a nadie dentro de la plataforma', () => {
    expect(puedeTenerSupervisor('admin')).toBe(false)
  })

  it('un rol desconocido o nulo no ofrece jefe', () => {
    expect(puedeTenerSupervisor('relator')).toBe(false)
    expect(puedeTenerSupervisor(null)).toBe(false)
    expect(puedeTenerSupervisor(undefined)).toBe(false)
  })
})
