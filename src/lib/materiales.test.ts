import { describe, expect, it } from 'vitest'
import {
  formatoTamano,
  inferirTipoPorMime,
  rutaAlmacenamiento,
  TAMANO_MAXIMO_BYTES,
  validarArchivo,
} from './materiales'

describe('inferirTipoPorMime', () => {
  it('reconoce los mimes admitidos', () => {
    expect(inferirTipoPorMime('application/pdf')).toBe('pdf')
    expect(inferirTipoPorMime('image/png')).toBe('imagen')
    expect(
      inferirTipoPorMime(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
    ).toBe('presentacion')
  })

  it('devuelve null para un mime no admitido', () => {
    expect(inferirTipoPorMime('video/mp4')).toBeNull()
    expect(inferirTipoPorMime('application/zip')).toBeNull()
  })
})

describe('validarArchivo', () => {
  it('acepta un PDF liviano', () => {
    expect(validarArchivo({ type: 'application/pdf', size: 1024 })).toEqual({ ok: true })
  })

  it('rechaza un mime no admitido', () => {
    const r = validarArchivo({ type: 'video/mp4', size: 1024 })
    expect(r.ok).toBe(false)
  })

  it('rechaza un archivo que supera el máximo', () => {
    const r = validarArchivo({ type: 'application/pdf', size: TAMANO_MAXIMO_BYTES + 1 })
    expect(r.ok).toBe(false)
  })

  it('acepta exactamente el máximo permitido', () => {
    expect(
      validarArchivo({ type: 'application/pdf', size: TAMANO_MAXIMO_BYTES })
    ).toEqual({ ok: true })
  })
})

describe('rutaAlmacenamiento', () => {
  it('conserva la extensión del archivo original', () => {
    expect(rutaAlmacenamiento('abc-123', 'guía de portabilidad.pdf')).toBe('abc-123.pdf')
  })

  it('sin extensión, no agrega punto', () => {
    expect(rutaAlmacenamiento('abc-123', 'archivo-sin-extension')).toBe('abc-123')
  })
})

describe('formatoTamano', () => {
  it('formatea bytes, KB y MB', () => {
    expect(formatoTamano(500)).toBe('500 B')
    expect(formatoTamano(2048)).toBe('2 KB')
    expect(formatoTamano(1_572_864)).toBe('1.5 MB')
  })

  it('devuelve — cuando no hay tamaño', () => {
    expect(formatoTamano(null)).toBe('—')
    expect(formatoTamano(0)).toBe('—')
  })
})
