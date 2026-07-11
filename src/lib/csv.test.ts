import { describe, expect, it } from 'vitest'
import { escaparCampoCSV, generarCSV } from './csv'

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
