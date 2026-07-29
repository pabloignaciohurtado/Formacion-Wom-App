import { describe, expect, it } from 'vitest'
import { escaparCampoCSV, generarCSV, parsearCSV } from './csv'

describe('escaparCampoCSV', () => {
  it('deja los valores simples tal cual', () => {
    expect(escaparCampoCSV('Sole')).toBe('Sole')
    expect(escaparCampoCSV(42)).toBe('42')
  })

  it('null e indefinido son celda vacía', () => {
    expect(escaparCampoCSV(null)).toBe('')
    expect(escaparCampoCSV(undefined)).toBe('')
  })

  it('envuelve en comillas cuando hay coma, comilla o salto de línea', () => {
    expect(escaparCampoCSV('Rojas, Sole')).toBe('"Rojas, Sole"')
    expect(escaparCampoCSV('dice "hola"')).toBe('"dice ""hola"""')
    expect(escaparCampoCSV('línea1\nlínea2')).toBe('"línea1\nlínea2"')
  })
})

describe('generarCSV', () => {
  it('arma encabezados + filas separadas por CRLF', () => {
    const csv = generarCSV(
      ['Nombre', 'XP'],
      [
        ['Sole', 152],
        ['Erik', 96],
      ]
    )
    expect(csv).toBe('Nombre,XP\r\nSole,152\r\nErik,96')
  })

  it('escapa dentro de las celdas', () => {
    const csv = generarCSV(['Nombre'], [['Rojas, Sole']])
    expect(csv).toBe('Nombre\r\n"Rojas, Sole"')
  })
})

describe('parsearCSV', () => {
  it('parsea filas simples separadas por coma y CRLF', () => {
    expect(parsearCSV('Nombre,XP\r\nSole,152\r\nErik,96')).toEqual([
      ['Nombre', 'XP'],
      ['Sole', '152'],
      ['Erik', '96'],
    ])
  })

  it('también acepta LF solo (sin \\r)', () => {
    expect(parsearCSV('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('entiende campos entrecomillados con comas y comillas escapadas', () => {
    expect(parsearCSV('Nombre,Nota\r\n"Rojas, Sole","dice ""hola"""')).toEqual([
      ['Nombre', 'Nota'],
      ['Rojas, Sole', 'dice "hola"'],
    ])
  })

  it('entiende saltos de línea dentro de un campo entrecomillado', () => {
    expect(parsearCSV('Nombre\r\n"línea1\nlínea2"')).toEqual([['Nombre'], ['línea1\nlínea2']])
  })

  it('es el inverso de generarCSV para datos simples', () => {
    const csv = generarCSV(
      ['Nombre', 'Email'],
      [['Sole', 'sole@wom.cl'], ['Rojas, Erik', 'erik@wom.cl']]
    )
    expect(parsearCSV(csv)).toEqual([
      ['Nombre', 'Email'],
      ['Sole', 'sole@wom.cl'],
      ['Rojas, Erik', 'erik@wom.cl'],
    ])
  })

  it('quita un BOM inicial y descarta líneas en blanco al final', () => {
    expect(parsearCSV('﻿a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('archivo vacío es lista vacía', () => {
    expect(parsearCSV('')).toEqual([])
  })
})
