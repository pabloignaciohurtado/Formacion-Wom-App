import { supabase } from './supabase'

export interface Insignia {
  id: string
  nombre: string
  descripcion: string
  icono: string
}

// Catálogo de insignias. Las condiciones se evalúan en evaluarInsignias().
export const INSIGNIAS: Insignia[] = [
  { id: 'primera-sesion', nombre: 'Primer paso', descripcion: 'Respondiste tu primer ejercicio', icono: '🎬' },
  { id: 'racha-3', nombre: 'Encendido', descripcion: '3 días seguidos practicando', icono: '🔥' },
  { id: 'racha-7', nombre: 'Semana perfecta', descripcion: '7 días seguidos practicando', icono: '🧨' },
  { id: 'racha-14', nombre: 'Imparable', descripcion: '14 días seguidos practicando', icono: '🌋' },
  { id: 'ejercicios-50', nombre: 'Constancia', descripcion: '50 ejercicios respondidos', icono: '💪' },
  { id: 'ejercicios-100', nombre: 'Centurión', descripcion: '100 ejercicios respondidos', icono: '🏛️' },
  { id: 'dominio-100', nombre: 'Dominio total', descripcion: 'Un dominio con maestría 100%', icono: '🎓' },
  { id: 'heroe-semana', nombre: 'Héroe WOM', descripcion: 'Podio de los Héroes de la Semana', icono: '🏆' },
  { id: 'obligatorias-al-dia', nombre: 'Siempre al día', descripcion: 'Todas las actividades obligatorias completadas', icono: '✅' },
]

export interface ContextoInsignias {
  intentos: number
  racha: number
  tieneDominio100: boolean
  fueHeroe: boolean
  obligatoriasAlDia: boolean
}

export function evaluarInsignias(ctx: ContextoInsignias): string[] {
  const merecidas: string[] = []
  if (ctx.intentos >= 1) merecidas.push('primera-sesion')
  if (ctx.racha >= 3) merecidas.push('racha-3')
  if (ctx.racha >= 7) merecidas.push('racha-7')
  if (ctx.racha >= 14) merecidas.push('racha-14')
  if (ctx.intentos >= 50) merecidas.push('ejercicios-50')
  if (ctx.intentos >= 100) merecidas.push('ejercicios-100')
  if (ctx.tieneDominio100) merecidas.push('dominio-100')
  if (ctx.fueHeroe) merecidas.push('heroe-semana')
  if (ctx.obligatoriasAlDia) merecidas.push('obligatorias-al-dia')
  return merecidas
}

// Inserta las insignias merecidas que aún no estaban y devuelve las nuevas.
export async function sincronizarInsignias(
  userId: string,
  ctx: ContextoInsignias,
  yaObtenidas: Set<string>
): Promise<Insignia[]> {
  const nuevas = evaluarInsignias(ctx).filter((id) => !yaObtenidas.has(id))
  if (nuevas.length === 0) return []
  const { error } = await supabase
    .from('insignias_usuario')
    .upsert(
      nuevas.map((insignia_id) => ({ user_id: userId, insignia_id })),
      { onConflict: 'user_id,insignia_id', ignoreDuplicates: true }
    )
  if (error) return []
  return INSIGNIAS.filter((i) => nuevas.includes(i.id))
}
