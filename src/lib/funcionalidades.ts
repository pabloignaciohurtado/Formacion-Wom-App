import { supabase } from './supabase'
import type { Tables } from './database.types'

// Control de acceso por usuario a las secciones navegables de la app.
//
// El modelo es un allowlist explícito INVERTIDO: `perfil_funcionalidades`
// solo guarda RESTRICCIONES (habilitado=false). La ausencia de fila para
// (usuario, funcionalidad) significa acceso HABILITADO por defecto. Esta
// decisión es deliberada: los ejecutivos ya activos usan hoy todas las
// secciones libremente, y sembrar filas "habilitado=true" para cada uno
// (allowlist positivo) los dejaría sin acceso a cualquier funcionalidad
// nueva hasta que un admin la habilite a mano, uno por uno. Con el default
// invertido, una funcionalidad nueva queda visible para todos de inmediato,
// y el trabajo de un admin es únicamente restringir casos puntuales.
//
// Rutas que NO pasan por este control (no son "funcionalidades" del
// catálogo): /  (Panel, la home, imprescindible), /login, /registro,
// /recuperar, /restablecer (fuera del área autenticada), /equipo y /admin*
// (ya controladas por rol vía SupervisorRoute/AdminRoute; el acceso ahí
// depende de qué es alguien, no de qué se le habilita a mano).
export type Funcionalidad = Tables<'funcionalidades'>
export type PerfilFuncionalidad = Tables<'perfil_funcionalidades'>

export async function cargarCatalogoFuncionalidades(): Promise<Funcionalidad[]> {
  const { data, error } = await supabase
    .from('funcionalidades')
    .select('*')
    .order('orden')
  if (error) return []
  return data ?? []
}

// Restricciones explícitas de un perfil: solo existen filas cuando algo fue
// deshabilitado a mano. Se expone como Set de ids DESHABILITADOS para que
// `tieneAcceso` no tenga que distinguir habilitado=true (que no debería
// existir en la práctica, pero la columna lo admite) de "sin fila".
export async function cargarRestriccionesPerfil(
  profileId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('perfil_funcionalidades')
    .select('funcionalidad_id, habilitado')
    .eq('profile_id', profileId)
  if (error || !data) return new Set()
  return new Set(
    data.filter((f) => f.habilitado === false).map((f) => f.funcionalidad_id)
  )
}

// Punto de entrada único: catálogo completo + qué está habilitado para ese
// perfil (todo, salvo lo explícitamente restringido).
export interface FuncionalidadConAcceso extends Funcionalidad {
  habilitada: boolean
}

export async function cargarAccesosPerfil(
  profileId: string
): Promise<FuncionalidadConAcceso[]> {
  const [catalogo, restringidas] = await Promise.all([
    cargarCatalogoFuncionalidades(),
    cargarRestriccionesPerfil(profileId),
  ])
  return catalogo.map((f) => ({
    ...f,
    habilitada: !restringidas.has(f.id),
  }))
}

// Chequeo puntual: por defecto true (acceso habilitado); false solo si hay
// una fila explícita con habilitado=false para ese (perfil, funcionalidad).
export function tieneAcceso(
  restricciones: Set<string>,
  funcionalidadId: string
): boolean {
  return !restricciones.has(funcionalidadId)
}

// Guarda el estado del multiselector de Admin: una fila por funcionalidad
// deshabilitada, y elimina la fila de las que vuelven a estar habilitadas
// (así la tabla nunca acumula filas "habilitado=true" innecesarias).
export async function guardarAccesosPerfil(
  profileId: string,
  seleccion: Record<string, boolean>
): Promise<{ error: string | null }> {
  const deshabilitadas = Object.entries(seleccion)
    .filter(([, habilitado]) => !habilitado)
    .map(([funcionalidad_id]) => funcionalidad_id)
  const habilitadas = Object.entries(seleccion)
    .filter(([, habilitado]) => habilitado)
    .map(([funcionalidad_id]) => funcionalidad_id)

  if (habilitadas.length > 0) {
    const { error: deleteError } = await supabase
      .from('perfil_funcionalidades')
      .delete()
      .eq('profile_id', profileId)
      .in('funcionalidad_id', habilitadas)
    if (deleteError) return { error: deleteError.message }
  }

  if (deshabilitadas.length > 0) {
    const { error: upsertError } = await supabase
      .from('perfil_funcionalidades')
      .upsert(
        deshabilitadas.map((funcionalidad_id) => ({
          profile_id: profileId,
          funcionalidad_id,
          habilitado: false,
        })),
        { onConflict: 'profile_id,funcionalidad_id' }
      )
    if (upsertError) return { error: upsertError.message }
  }

  return { error: null }
}
