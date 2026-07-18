// Lógica pura de los ciclos de re-entrenamiento (recertificación periódica,
// reacción a un cambio de producto/procedimiento, o refuerzo de un dominio
// con baja precisión). Separado del componente para poder probarlo sin
// montar React ni Supabase — mismo patrón que `lib/asignacion.ts` y
// `lib/materiales.ts`.
//
// No hay columna `estado` en la tabla: se deriva aquí de fecha_limite +
// avance, igual criterio que `actividades` (que tampoco guarda "vencida").
import { CalendarClock, RefreshCw, Sparkles, Target } from 'lucide-react'
import type { Tables } from './database.types'

export type Ciclo = Tables<'ciclos_capacitacion'>
export type CicloDestinatario = Tables<'ciclos_capacitacion_destinatarios'>

// Fila que devuelve el RPC progreso_ciclos_capacitacion() — no es una tabla,
// así que no sale de Tables<>.
export interface ProgresoCiclo {
  ciclo_id: string
  user_id: string
  nombre: string
  intentos: number
  correctas: number
  precision_pct: number
  cumplida: boolean
}

export type TipoCiclo = 'recertificacion' | 'cambio_producto' | 'refuerzo'

export const TIPOS_CICLO: TipoCiclo[] = [
  'recertificacion',
  'cambio_producto',
  'refuerzo',
]

export const ETIQUETAS_TIPO_CICLO: Record<TipoCiclo, string> = {
  recertificacion: 'Recertificación periódica',
  cambio_producto: 'Cambio de producto o procedimiento',
  refuerzo: 'Refuerzo (baja precisión)',
}

export const ICONO_TIPO_CICLO: Record<TipoCiclo, typeof RefreshCw> = {
  recertificacion: RefreshCw,
  cambio_producto: Sparkles,
  refuerzo: Target,
}

export type EstadoCiclo = 'en_curso' | 'completado' | 'incompleto'

export const ETIQUETAS_ESTADO_CICLO: Record<EstadoCiclo, string> = {
  en_curso: 'En curso',
  completado: 'Completado',
  incompleto: 'Incompleto',
}

// Un ciclo está completado cuando el destinatario alcanzó la meta de
// ejercicios (lo que ya calcula el RPC en `cumplida`); si no la alcanzó y ya
// pasó la fecha límite, quedó incompleto; si no, sigue en curso.
export function estadoCiclo(fechaLimite: string, cumplida: boolean): EstadoCiclo {
  if (cumplida) return 'completado'
  const limite = new Date(`${fechaLimite}T23:59:59`)
  return limite.getTime() < Date.now() ? 'incompleto' : 'en_curso'
}

// Días hasta la fecha límite (negativo si ya pasó). Mismo cálculo que
// `EstadoLimite` en Actividades.tsx, para que "vence en 3 días" signifique
// lo mismo en toda la app.
export function diasHastaLimite(fechaLimite: string): number {
  const limite = new Date(`${fechaLimite}T23:59:59`)
  return Math.ceil((limite.getTime() - Date.now()) / 86400000)
}

export const CalendarioIcono = CalendarClock

// Progreso 0–100 hacia la meta de ejercicios, para la barra visual.
export function porcentajeAvance(intentos: number, metaEjercicios: number): number {
  if (metaEjercicios <= 0) return 100
  return Math.min(100, Math.round((100 * intentos) / metaEjercicios))
}

// Fase 2 del análisis de coherencia formación/re-entrenamiento: una meta de
// `goals` es "de mantenimiento" cuando el relator ya está en o sobre el
// objetivo al momento de mirarla — no se le pide crecer, se le pide no caer
// del umbral. Es una etiqueta descriptiva calculada en cada carga, no un
// campo guardado (evita que quede desactualizada si el relator practica).
export type TipoMeta = 'progreso' | 'mantenimiento'

export function tipoMeta(actual: number, objetivo: number): TipoMeta {
  return actual >= objetivo ? 'mantenimiento' : 'progreso'
}

export const ETIQUETAS_TIPO_META: Record<TipoMeta, string> = {
  progreso: 'en progreso',
  mantenimiento: 'mantener',
}
