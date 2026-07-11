// Lógica pura del seguimiento del equipo: días de inactividad, precisión y
// clasificación en segmentos de atención. Separada del componente para poder
// probarla sin React, y para que el panel convierta el dato en acción
// ("a quién atender") en vez de solo mostrarlo.

export const UMBRAL_INACTIVO_DIAS = 7
export const UMBRAL_PRECISION = 70

// Coincide con la forma que devuelve la función SQL resumen_equipo().
export type FilaEquipo = {
  user_id: string
  nombre: string
  liga: string
  xp: number
  intentos: number
  correctas: number
  ultima_actividad: string | null
  obligatorias_pendientes: number
}

export type Segmento = 'inactivo' | 'baja-precision' | 'obligatorios'

export function diasDesde(
  fecha: string | null,
  ahora: number = Date.now()
): number | null {
  if (!fecha) return null
  return Math.floor((ahora - new Date(fecha).getTime()) / 86400000)
}

export function precisionPct(
  intentos: number,
  correctas: number
): number | null {
  return intentos > 0 ? Math.round((100 * correctas) / intentos) : null
}

// ¿La persona cae en un segmento que pide atención?
//  - inactivo: nunca practicó, o hace ≥ 7 días.
//  - baja-precision: tiene intentos y su precisión está bajo 70%.
//  - obligatorios: tiene módulos obligatorios pendientes.
export function enSegmento(
  fila: FilaEquipo,
  segmento: Segmento,
  ahora: number = Date.now()
): boolean {
  switch (segmento) {
    case 'inactivo': {
      const d = diasDesde(fila.ultima_actividad, ahora)
      return d === null || d >= UMBRAL_INACTIVO_DIAS
    }
    case 'baja-precision': {
      const p = precisionPct(fila.intentos, fila.correctas)
      return p !== null && p < UMBRAL_PRECISION
    }
    case 'obligatorios':
      return fila.obligatorias_pendientes > 0
  }
}

export function contarAtencion(
  filas: FilaEquipo[],
  ahora: number = Date.now()
): Record<Segmento, number> {
  return {
    inactivo: filas.filter((f) => enSegmento(f, 'inactivo', ahora)).length,
    'baja-precision': filas.filter((f) => enSegmento(f, 'baja-precision', ahora))
      .length,
    obligatorios: filas.filter((f) => enSegmento(f, 'obligatorios', ahora))
      .length,
  }
}
