// Lógica pura de la asignación de módulos obligatorios.
//
// Vive separada del componente para poder probarla sin montar React ni
// simular Supabase: quién puede asignar ya lo decide la base (RLS); aquí
// solo se calcula qué opciones tiene sentido OFRECER en la interfaz, que
// nunca debe ofrecer lo que la base va a rechazar.
import { puedeAsignar, type Rol } from './roles'

export type Alcance = 'todos' | 'equipo' | 'persona'

export const ETIQUETAS_ALCANCE: Record<Alcance, string> = {
  todos: 'Todos',
  equipo: 'Mi equipo',
  persona: 'Personas concretas',
}

export type PersonaAsignable = {
  id: string
  nombre: string
  activo: boolean
  supervisor_id: string | null
}

// El universo de personas a las que quien asigna puede dirigir una actividad.
// - admin: cualquier persona activa (menos él mismo; asignarse tareas a uno
//   mismo no tiene destinatario que supervisar).
// - supervisor: solo su equipo activo. La RLS lo exige en la inserción de
//   destinatarios; aquí se refleja para que el buscador no muestre a nadie
//   que la base rechazaría.
export function personasAsignables(
  rol: Rol | string | null | undefined,
  miId: string,
  personas: PersonaAsignable[]
): PersonaAsignable[] {
  const activas = personas.filter((p) => p.activo && p.id !== miId)
  if (rol === 'admin') return activas
  if (rol === 'supervisor') return activas.filter((p) => p.supervisor_id === miId)
  return []
}

// Qué alcances ofrecer según el rol y si existe equipo que asignar.
// - 'todos' es de admin: publica a toda la operación.
// - 'equipo' y 'persona' requieren tener a alguien asignable.
export function opcionesAlcance(
  rol: Rol | string | null | undefined,
  nAsignables: number
): Alcance[] {
  if (!puedeAsignar(rol)) return []
  const opciones: Alcance[] = []
  if (rol === 'admin') opciones.push('todos')
  if (rol === 'supervisor' && nAsignables > 0) opciones.push('equipo')
  if (nAsignables > 0) opciones.push('persona')
  return opciones
}

// Filas de actividades_destinatarios que corresponde insertar al crear.
// 'todos' no lleva destinatarios: la visibilidad la da el propio alcance.
export function destinatariosAInsertar(
  alcance: Alcance,
  asignables: PersonaAsignable[],
  seleccion: Set<string>
): string[] {
  if (alcance === 'todos') return []
  if (alcance === 'equipo') return asignables.map((p) => p.id)
  return asignables.filter((p) => seleccion.has(p.id)).map((p) => p.id)
}

// Contra cuántas personas se mide el avance de una actividad.
export function denominadorAvance(
  alcance: string,
  nDestinatarios: number,
  totalActivos: number
): number {
  return alcance === 'todos' ? totalActivos : nDestinatarios
}
