// Generación de CSV en el cliente, para que las jefaturas se lleven el
// seguimiento a sus propios cruces de datos sin depender de un export del
// servidor. Sin dependencias: un CSV bien escapado y una descarga por Blob.

type Celda = string | number | null | undefined

// Escapa un campo según RFC 4180: si contiene coma, comilla o salto de línea,
// se envuelve en comillas y las comillas internas se duplican.
export function escaparCampoCSV(valor: Celda): string {
  const texto = valor == null ? '' : String(valor)
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

// Filas + encabezados a texto CSV (CRLF entre filas, por compatibilidad).
export function generarCSV(encabezados: string[], filas: Celda[][]): string {
  return [encabezados, ...filas]
    .map((fila) => fila.map(escaparCampoCSV).join(','))
    .join('\r\n')
}

// Efecto de descarga (no puro): antepone un BOM para que Excel abra los
// acentos bien, crea un Blob y dispara el guardado.
export function descargarCSV(nombreArchivo: string, contenido: string): void {
  const blob = new Blob(['﻿' + contenido], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

// Parser de CSV a mano (sin dependencias, mismo criterio que `generarCSV`):
// entiende comillas, comas y saltos de línea dentro de un campo entrecomillado
// (RFC 4180), CRLF y LF indistintamente, y descarta un BOM inicial si viene
// de Excel. Se usa para la carga masiva de usuarios (ver
// `lib/cargaMasivaUsuarios.ts`) — el volumen esperado (decenas/centenas de
// filas escritas a mano en una planilla) no justifica sumar una dependencia
// como papaparse solo para esto.
export function parsearCSV(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, '')
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]

    if (entreComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"'
          i++
        } else {
          entreComillas = false
        }
      } else {
        campo += c
      }
      continue
    }

    if (c === '"') {
      entreComillas = true
    } else if (c === ',') {
      fila.push(campo)
      campo = ''
    } else if (c === '\r') {
      // se ignora: el \n que sigue (si hay) cierra la fila
    } else if (c === '\n') {
      fila.push(campo)
      filas.push(fila)
      fila = []
      campo = ''
    } else {
      campo += c
    }
  }

  // Última fila, si el archivo no termina en salto de línea.
  if (campo !== '' || fila.length > 0) {
    fila.push(campo)
    filas.push(fila)
  }

  // Descarta filas completamente vacías (ej. una línea en blanco al final
  // del archivo), típicas de exportar/editar la planilla a mano.
  return filas.filter((f) => !(f.length === 1 && f[0] === ''))
}
