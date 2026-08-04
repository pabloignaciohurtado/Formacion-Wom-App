import { supabase } from './supabase'
import type { Tables } from './database.types'

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
// Las de formación siguen otorgándose UNA sola vez por usuario: `yaObtenidas`
// (calculado por quien llama, a partir de lo que ya tiene) filtra las que
// faltan, y como `insignias_usuario` ya no tiene una restricción única sobre
// (user_id, insignia_id) (ver otorgarInsigniaManual/otorgarInsigniaFamiliar,
// que sí permiten repetidos), el insert es liso y llano: no hay onConflict
// que resolver porque este camino nunca debe generar una fila repetida.
export async function sincronizarInsignias(
  userId: string,
  ctx: ContextoInsignias,
  yaObtenidas: Set<string>
): Promise<Insignia[]> {
  const nuevas = evaluarInsignias(ctx).filter((id) => !yaObtenidas.has(id))
  if (nuevas.length === 0) return []
  const { error } = await supabase.from('insignias_usuario').insert(
    // otorgado_por explícito en null: es el sistema evaluando reglas
    // (evaluarInsignias()), no un admin otorgando a mano. auth.uid() aquí
    // sería incorrecto (el usuario no se "otorga a sí mismo").
    nuevas.map((insignia_id) => ({ user_id: userId, insignia_id, otorgado_por: null }))
  )
  if (error) return []
  return INSIGNIAS.filter((i) => nuevas.includes(i.id))
}

// Otorgamiento manual de una insignia de desempeño por un admin (ver
// AdminOtorgarInsignias.tsx). A diferencia de sincronizarInsignias(),
// `otorgado_por` SIEMPRE queda con el uuid del admin que ejecuta la acción:
// es la garantía de que ningún otorgamiento manual queda sin autor
// identificable en la base. Soporta otorgamientos repetidos a propósito
// (soporte "xN" del álbum): cada llamado inserta una fila nueva con su
// propia fecha/nota, nunca actualiza una existente (la tabla es
// solo-anexado, y ya no hay restricción única que lo impida).
export async function otorgarInsigniaManual(
  userId: string,
  insigniaId: string,
  otorgadoPor: string,
  nota?: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('insignias_usuario').insert({
    user_id: userId,
    insignia_id: insigniaId,
    otorgado_por: otorgadoPor,
    nota: nota?.trim() || null,
  })
  return { error: error?.message ?? null }
}

// Registra/actualiza el progreso acumulado de un ejecutivo en una familia de
// insignias (carga manual de admin/supervisor, ver AdminFamiliasInsignias)
// y, si con el nuevo valor cruza el umbral de alguna medalla de esa familia
// que el ejecutivo todavía no tenía, la otorga automáticamente. Nunca
// revoca una medalla ya obtenida aunque el umbral suba después (no hay
// DELETE/UPDATE sobre insignias_usuario, por diseño).
export async function actualizarProgresoFamilia(
  userId: string,
  familiaId: string,
  valor: number,
  actualizadoPor: string
): Promise<{ error: string | null; otorgadas: Tables<'insignias'>[] }> {
  const { error: progresoError } = await supabase.from('progreso_familias_insignias').upsert(
    { user_id: userId, familia_id: familiaId, valor, actualizado_por: actualizadoPor },
    { onConflict: 'user_id,familia_id' }
  )
  if (progresoError) return { error: progresoError.message, otorgadas: [] }

  const { data: medallas, error: medallasError } = await supabase
    .from('insignias')
    .select('*')
    .eq('familia_id', familiaId)
    .eq('activa', true)
    .not('umbral', 'is', null)
  if (medallasError || !medallas) return { error: medallasError?.message ?? null, otorgadas: [] }

  const alcanzan = medallas.filter((m) => m.umbral !== null && valor >= m.umbral)
  if (alcanzan.length === 0) return { error: null, otorgadas: [] }

  const { data: yaObtenidas } = await supabase
    .from('insignias_usuario')
    .select('insignia_id')
    .eq('user_id', userId)
    .in(
      'insignia_id',
      alcanzan.map((m) => m.id)
    )
  const idsYaObtenidas = new Set((yaObtenidas ?? []).map((o) => o.insignia_id))
  const nuevas = alcanzan.filter((m) => !idsYaObtenidas.has(m.id))
  if (nuevas.length === 0) return { error: null, otorgadas: [] }

  const { error: insertError } = await supabase.from('insignias_usuario').insert(
    nuevas.map((m) => ({
      user_id: userId,
      insignia_id: m.id,
      otorgado_por: actualizadoPor,
      nota: 'Otorgado automáticamente al alcanzar el umbral de progreso familiar',
    }))
  )
  if (insertError) return { error: insertError.message, otorgadas: [] }
  return { error: null, otorgadas: nuevas }
}
