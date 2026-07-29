import { supabase } from './supabase'
import type { Tables } from './database.types'

// Control de acceso por usuario a las secciones navegables de la app.
//
// Orden de resolución del acceso a una funcionalidad, para un (usuario,
// funcionalidad) dado (ver `tieneAcceso` más abajo):
//   1. Override individual en `perfil_funcionalidades`: si existe una fila
//      para ese (profile_id, funcionalidad_id), su valor de `habilitado`
//      manda, sin importar el grupo. Máxima prioridad: son excepciones
//      puntuales por sobre cualquier plantilla.
//   2. Grupo de acceso: si el usuario tiene `profiles.grupo_acceso_id` y
//      ese grupo tiene una fila en `grupo_acceso_funcionalidades` para esa
//      funcionalidad, manda el valor de esa fila.
//   3. Default: si no hay override individual ni fila de grupo aplicable,
//      el acceso está HABILITADO. Mismo default que existía antes de que
//      hubiera grupos, para no romper a nadie sin grupo asignado ni
//      excepciones.
//
// `perfil_funcionalidades` sigue siendo un allowlist invertido en la
// práctica (solo se siembran filas para restringir), pero el modelo de
// datos admite habilitado=true como override explícito (por ejemplo, para
// devolverle el acceso a alguien cuyo grupo se lo quita). `grupo_acceso_
// funcionalidades`, en cambio, sí guarda ambos valores a propósito: un
// grupo puede ser un allowlist positivo completo (ej. "Solo Álbum de
// Premios": todas las demás funcionalidades en habilitado=false, `premios`
// en true).
//
// Rutas que NO pasan por este control (no son "funcionalidades" del
// catálogo): /  (Panel, la home, imprescindible), /login, /registro,
// /recuperar, /restablecer (fuera del área autenticada), /equipo y /admin*
// (ya controladas por rol vía SupervisorRoute/AdminRoute; el acceso ahí
// depende de qué es alguien, no de qué se le habilita a mano).
export type Funcionalidad = Tables<'funcionalidades'>
export type PerfilFuncionalidad = Tables<'perfil_funcionalidades'>
export type GrupoAcceso = Tables<'grupos_acceso'>
export type GrupoAccesoFuncionalidad = Tables<'grupo_acceso_funcionalidades'>

export async function cargarCatalogoFuncionalidades(): Promise<Funcionalidad[]> {
  const { data, error } = await supabase
    .from('funcionalidades')
    .select('*')
    .order('orden')
  if (error) return []
  return data ?? []
}

// Overrides individuales de un perfil: un Map con TODAS las filas que
// existan en `perfil_funcionalidades` para ese usuario (en la práctica casi
// siempre habilitado=false, pero el modelo admite el caso inverso — ver
// comentario de cabecera). Ausencia de entrada = "sin override individual",
// no "acceso deshabilitado": eso lo decide la cascada completa en
// `tieneAcceso`.
export async function cargarOverridesPerfil(
  profileId: string
): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('perfil_funcionalidades')
    .select('funcionalidad_id, habilitado')
    .eq('profile_id', profileId)
  if (error || !data) return new Map()
  return new Map(data.map((f) => [f.funcionalidad_id, f.habilitado]))
}

// Compatibilidad: algunos llamadores solo necesitan saber qué está
// restringido (habilitado=false) para un perfil, sin distinguir de dónde
// viene. Se deriva del Map de overrides.
export async function cargarRestriccionesPerfil(
  profileId: string
): Promise<Set<string>> {
  const overrides = await cargarOverridesPerfil(profileId)
  return new Set(
    [...overrides.entries()].filter(([, habilitado]) => !habilitado).map(([id]) => id)
  )
}

// Detalle de acceso de un grupo/plantilla: Map con TODAS las filas de
// `grupo_acceso_funcionalidades` para ese grupo (true y false, a
// diferencia de los overrides individuales).
export async function cargarFuncionalidadesGrupo(
  grupoId: string
): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('grupo_acceso_funcionalidades')
    .select('funcionalidad_id, habilitado')
    .eq('grupo_id', grupoId)
  if (error || !data) return new Map()
  return new Map(data.map((f) => [f.funcionalidad_id, f.habilitado]))
}

// Punto de entrada único: catálogo completo + qué está habilitado para ese
// perfil, aplicando la cascada completa (override individual > grupo >
// default habilitado). `origen` es solo para la UI de Admin, así puede
// mostrar de dónde viene cada valor ("excepción" vs. "por el grupo X" vs.
// "por defecto").
export interface FuncionalidadConAcceso extends Funcionalidad {
  habilitada: boolean
  origen: 'individual' | 'grupo' | 'default'
}

export async function cargarAccesosPerfil(
  profileId: string,
  grupoId: string | null = null
): Promise<FuncionalidadConAcceso[]> {
  const [catalogo, overrides, accesosGrupo] = await Promise.all([
    cargarCatalogoFuncionalidades(),
    cargarOverridesPerfil(profileId),
    grupoId ? cargarFuncionalidadesGrupo(grupoId) : Promise.resolve(new Map<string, boolean>()),
  ])
  return catalogo.map((f) => {
    if (overrides.has(f.id)) {
      return { ...f, habilitada: overrides.get(f.id)!, origen: 'individual' as const }
    }
    if (accesosGrupo.has(f.id)) {
      return { ...f, habilitada: accesosGrupo.get(f.id)!, origen: 'grupo' as const }
    }
    return { ...f, habilitada: true, origen: 'default' as const }
  })
}

// Chequeo puntual con la cascada completa: 1) override individual, si
// existe, manda; 2) si no, el valor del grupo, si el grupo tiene fila para
// esta funcionalidad; 3) si no hay ninguna de las dos, default habilitado.
export function tieneAcceso(
  overridesIndividuales: Map<string, boolean>,
  accesosGrupo: Map<string, boolean> | null,
  funcionalidadId: string
): boolean {
  if (overridesIndividuales.has(funcionalidadId)) {
    return overridesIndividuales.get(funcionalidadId)!
  }
  if (accesosGrupo?.has(funcionalidadId)) {
    return accesosGrupo.get(funcionalidadId)!
  }
  return true
}

// Guarda el estado del multiselector individual de Admin (EditarAccesosUsuario):
// una fila de override por funcionalidad cuya casilla quedó distinta del
// valor que tendría SIN override (el del grupo asignado, o habilitado si no
// hay grupo o el grupo no opina) — y borra la fila cuando coincide, para no
// acumular overrides innecesarios. `defaults` es ese valor "sin override":
// pásalo ya resuelto (grupo actual del usuario, o `{}` si no tiene grupo).
export async function guardarAccesosPerfil(
  profileId: string,
  seleccion: Record<string, boolean>,
  defaults: Record<string, boolean> = {}
): Promise<{ error: string | null }> {
  const aBorrar: string[] = []
  const aGuardar: { funcionalidad_id: string; habilitado: boolean }[] = []

  for (const [funcionalidadId, habilitado] of Object.entries(seleccion)) {
    const defaultSinOverride = defaults[funcionalidadId] ?? true
    if (habilitado === defaultSinOverride) {
      aBorrar.push(funcionalidadId)
    } else {
      aGuardar.push({ funcionalidad_id: funcionalidadId, habilitado })
    }
  }

  if (aBorrar.length > 0) {
    const { error: deleteError } = await supabase
      .from('perfil_funcionalidades')
      .delete()
      .eq('profile_id', profileId)
      .in('funcionalidad_id', aBorrar)
    if (deleteError) return { error: deleteError.message }
  }

  if (aGuardar.length > 0) {
    const { error: upsertError } = await supabase.from('perfil_funcionalidades').upsert(
      aGuardar.map(({ funcionalidad_id, habilitado }) => ({
        profile_id: profileId,
        funcionalidad_id,
        habilitado,
      })),
      { onConflict: 'profile_id,funcionalidad_id' }
    )
    if (upsertError) return { error: upsertError.message }
  }

  return { error: null }
}

// ---- Grupos de acceso (plantillas reutilizables) ----

export async function cargarGruposAcceso(): Promise<GrupoAcceso[]> {
  const { data, error } = await supabase
    .from('grupos_acceso')
    .select('*')
    .order('nombre')
  if (error) return []
  return data ?? []
}

export async function crearGrupoAcceso(
  nombre: string,
  descripcion: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('grupos_acceso')
    .insert({ nombre, descripcion: descripcion || null })
    .select('id')
    .single()
  if (error) return { id: null, error: error.message }
  return { id: data.id, error: null }
}

export async function actualizarGrupoAcceso(
  grupoId: string,
  cambios: { nombre?: string; descripcion?: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('grupos_acceso')
    .update({
      ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
      ...(cambios.descripcion !== undefined
        ? { descripcion: cambios.descripcion || null }
        : {}),
    })
    .eq('id', grupoId)
  if (error) return { error: error.message }
  return { error: null }
}

export async function eliminarGrupoAcceso(grupoId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('grupos_acceso').delete().eq('id', grupoId)
  if (error) return { error: error.message }
  return { error: null }
}

// Guarda el detalle completo de un grupo: reemplaza todas sus filas en
// `grupo_acceso_funcionalidades` por el estado actual del multiselector
// (una fila por funcionalidad del catálogo, con su valor true/false
// explícito — a diferencia de los overrides individuales, aquí SÍ se
// guardan ambos valores, para que el grupo pueda ser un allowlist positivo
// completo).
export async function guardarFuncionalidadesGrupo(
  grupoId: string,
  seleccion: Record<string, boolean>
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from('grupo_acceso_funcionalidades')
    .delete()
    .eq('grupo_id', grupoId)
  if (deleteError) return { error: deleteError.message }

  const filas = Object.entries(seleccion).map(([funcionalidad_id, habilitado]) => ({
    grupo_id: grupoId,
    funcionalidad_id,
    habilitado,
  }))
  if (filas.length === 0) return { error: null }

  const { error: insertError } = await supabase
    .from('grupo_acceso_funcionalidades')
    .insert(filas)
  if (insertError) return { error: insertError.message }
  return { error: null }
}

export async function cargarUsuariosDeGrupo(
  grupoId: string
): Promise<Tables<'profiles'>[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('grupo_acceso_id', grupoId)
    .order('nombre')
  if (error) return []
  return data ?? []
}

// Asigna (o quita, con grupoId=null) un grupo de acceso a varios usuarios
// de una sola vez — la asignación masiva que pidió Ignacio para no tener
// que repetir el mismo patrón de accesos usuario por usuario.
export async function asignarGrupoAUsuarios(
  usuarioIds: string[],
  grupoId: string | null
): Promise<{ error: string | null }> {
  if (usuarioIds.length === 0) return { error: null }
  const { error } = await supabase
    .from('profiles')
    .update({ grupo_acceso_id: grupoId })
    .in('id', usuarioIds)
  if (error) return { error: error.message }
  return { error: null }
}

// Acción masiva de la asignación por grupo: en vez de asignar/quitar un
// grupo entero, toca UNA sola funcionalidad para varios usuarios a la vez
// (ej. "deshabilita Consultas para todo este equipo"). Igual que
// `guardarAccesosPerfil`, escribe/borra en `perfil_funcionalidades` (el
// override individual, máxima prioridad en la cascada de `tieneAcceso`),
// pero en batch: un solo upsert o un solo delete para todos los IDs, en vez
// de N llamadas secuenciales.
export type AccionFuncionalidadMasiva = 'habilitar' | 'deshabilitar' | 'quitar_excepcion'

export async function aplicarFuncionalidadAUsuarios(
  usuarioIds: string[],
  funcionalidadId: string,
  accion: AccionFuncionalidadMasiva
): Promise<{ actualizados: number; error: string | null }> {
  if (usuarioIds.length === 0) return { actualizados: 0, error: null }

  if (accion === 'quitar_excepcion') {
    const { error } = await supabase
      .from('perfil_funcionalidades')
      .delete()
      .eq('funcionalidad_id', funcionalidadId)
      .in('profile_id', usuarioIds)
    if (error) return { actualizados: 0, error: error.message }
    return { actualizados: usuarioIds.length, error: null }
  }

  const habilitado = accion === 'habilitar'
  const { error } = await supabase.from('perfil_funcionalidades').upsert(
    usuarioIds.map((profile_id) => ({
      profile_id,
      funcionalidad_id: funcionalidadId,
      habilitado,
    })),
    { onConflict: 'profile_id,funcionalidad_id' }
  )
  if (error) return { actualizados: 0, error: error.message }
  return { actualizados: usuarioIds.length, error: null }
}
