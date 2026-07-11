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
