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

// ── Nivel 2: rango de fechas y drill al objetivo ────────────────────

export type RangoFechas = '7d' | '30d' | '90d' | 'todo'

export const RANGOS: { id: RangoFechas; etiqueta: string }[] = [
  { id: '7d', etiqueta: '7 días' },
  { id: '30d', etiqueta: '30 días' },
  { id: '90d', etiqueta: '90 días' },
  { id: 'todo', etiqueta: 'Todo' },
]

// Fecha ISO desde la que pedir datos, o null para "todo el histórico".
export function desdeDeRango(
  rango: RangoFechas,
  ahora: number = Date.now()
): string | null {
  const dias: Record<RangoFechas, number | null> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    todo: null,
  }
  const d = dias[rango]
  return d === null ? null : new Date(ahora - d * 86400000).toISOString()
}

export type IntentoObjetivo = { objetivo_id: string; correcto: boolean }

export type PrecisionObjetivo = {
  objetivo_id: string
  intentos: number
  correctas: number
  precision: number
}

// Agrupa los intentos de una persona por objetivo y calcula su precisión.
// Es el drill de Nivel 2: no "falla en Portabilidad" sino "falla en el
// objetivo Proceso de portabilidad", que es lo accionable en un 1:1.
export function precisionPorObjetivo(
  intentos: IntentoObjetivo[]
): PrecisionObjetivo[] {
  const mapa = new Map<string, { intentos: number; correctas: number }>()
  for (const it of intentos) {
    const cur = mapa.get(it.objetivo_id) ?? { intentos: 0, correctas: 0 }
    cur.intentos += 1
    if (it.correcto) cur.correctas += 1
    mapa.set(it.objetivo_id, cur)
  }
  return [...mapa.entries()].map(([objetivo_id, v]) => ({
    objetivo_id,
    intentos: v.intentos,
    correctas: v.correctas,
    precision: Math.round((100 * v.correctas) / v.intentos),
  }))
}
