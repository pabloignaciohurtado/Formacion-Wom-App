// Lectura y escritura del contenido creado desde la app (tablas `contenido_*`).
//
// Aquí vive todo lo que toca la red; `lib/catalogo.ts` se queda con la lógica
// pura (validaciones, ids, fusión) para poder probarla sin Supabase.
import { supabase } from './supabase'
import {
  armarDominio,
  idEjercicio,
  idObjetivo,
  siguienteNumero,
  type DominioFila,
  type EjercicioFila,
  type LeccionFila,
  type ObjetivoFila,
} from './catalogo'
import type { Dominio } from '../data/contenido'

export interface ContenidoRemoto {
  dominios: DominioFila[]
  objetivos: ObjetivoFila[]
  ejercicios: EjercicioFila[]
  lecciones: LeccionFila[]
}

export const CONTENIDO_VACIO: ContenidoRemoto = {
  dominios: [],
  objetivos: [],
  ejercicios: [],
  lecciones: [],
}

// `soloPublicado` es lo que ven los relatores: la RLS ya filtra por permisos,
// pero un administrador también recibe sus borradores, y esos no deben
// aparecer mezclados en la pantalla de Ejercicios.
export async function cargarContenidoRemoto(
  soloPublicado = true
): Promise<ContenidoRemoto> {
  const [dominios, objetivos, ejercicios, lecciones] = await Promise.all([
    supabase.from('contenido_dominios').select('*').order('creado_en'),
    supabase.from('contenido_objetivos').select('*'),
    supabase.from('contenido_ejercicios').select('*'),
    supabase.from('contenido_lecciones').select('*'),
  ])

  const filas = (dominios.data ?? []).filter(
    (d) => d.activo && (!soloPublicado || d.publicado)
  )
  const ids = new Set(filas.map((d) => d.id))
  return {
    dominios: filas,
    objetivos: (objetivos.data ?? []).filter((o) => ids.has(o.dominio_id)),
    ejercicios: (ejercicios.data ?? []).filter(
      (e) => ids.has(e.dominio_id) && e.activo
    ),
    lecciones: (lecciones.data ?? []).filter(
      (l) => ids.has(l.dominio_id) && l.activo
    ),
  }
}

export function dominiosDesde(contenido: ContenidoRemoto): Dominio[] {
  return contenido.dominios.map((fila) =>
    armarDominio(fila, contenido.objetivos, contenido.ejercicios)
  )
}

export interface BorradorObjetivo {
  id: string | null
  titulo: string
}

export interface BorradorPregunta {
  id: string | null
  objetivo: number // índice dentro de `objetivos`
  enunciado: string
  opciones: string[]
  correcta: number
  explicacion: string
}

export interface BorradorMaterial {
  slug: string
  titulo: string
  icono: string
  descripcion: string
  categoriaId: string
  publicado: boolean
  objetivos: BorradorObjetivo[]
  preguntas: BorradorPregunta[]
  leccionId: string | null
  leccionTitulo: string
  leccionCuerpo: string
}

// Guarda el material completo. No es una transacción — Supabase no expone una
// desde el cliente — así que el orden importa: primero lo que otros
// referencian (dominio, objetivos) y las bajas al final, para no dejar un
// ejercicio apuntando a un objetivo que ya no existe.
export async function guardarMaterial(
  borrador: BorradorMaterial,
  usuarioId: string,
  previo: ContenidoRemoto
): Promise<string | null> {
  const slug = borrador.slug
  const ahora = new Date().toISOString()

  const objetivosPrevios = previo.objetivos.filter((o) => o.dominio_id === slug)
  const ejerciciosPrevios = previo.ejercicios.filter((e) => e.dominio_id === slug)

  const dominio = await supabase.from('contenido_dominios').upsert({
    id: slug,
    titulo: borrador.titulo.trim(),
    icono: borrador.icono.trim() || '📘',
    descripcion: borrador.descripcion.trim(),
    categoria_id: borrador.categoriaId,
    publicado: borrador.publicado,
    activo: true,
    creado_por: usuarioId,
    actualizado_en: ahora,
  })
  if (dominio.error) return dominio.error.message

  // Ids nuevos: se numeran a continuación del mayor ya usado, nunca
  // reutilizando uno dado de baja.
  let numeroObjetivo = siguienteNumero(
    objetivosPrevios.map((o) => o.id),
    slug,
    'o'
  )
  const objetivos = borrador.objetivos.map((objetivo, indice) => ({
    id: objetivo.id ?? idObjetivo(slug, numeroObjetivo++),
    dominio_id: slug,
    titulo: objetivo.titulo.trim(),
    orden: indice + 1,
  }))
  if (objetivos.length > 0) {
    const guardado = await supabase.from('contenido_objetivos').upsert(objetivos)
    if (guardado.error) return guardado.error.message
  }

  let numeroEjercicio = siguienteNumero(
    ejerciciosPrevios.map((e) => e.id),
    slug,
    'e'
  )
  const ejercicios = borrador.preguntas.map((pregunta, indice) => {
    const opciones = pregunta.opciones.map((o) => o.trim()).filter(Boolean)
    return {
      id: pregunta.id ?? idEjercicio(slug, numeroEjercicio++),
      dominio_id: slug,
      objetivo_id: objetivos[pregunta.objetivo]?.id ?? objetivos[0].id,
      enunciado: pregunta.enunciado.trim(),
      opciones,
      correcta: pregunta.correcta,
      explicacion: pregunta.explicacion.trim(),
      orden: indice + 1,
      activo: true,
    }
  })
  if (ejercicios.length > 0) {
    const guardado = await supabase.from('contenido_ejercicios').upsert(ejercicios)
    if (guardado.error) return guardado.error.message
  }

  const cuerpo = borrador.leccionCuerpo.trim()
  if (cuerpo || borrador.leccionTitulo.trim()) {
    const leccion = {
      ...(borrador.leccionId ? { id: borrador.leccionId } : {}),
      dominio_id: slug,
      objetivo_id: null,
      titulo: borrador.leccionTitulo.trim() || borrador.titulo.trim(),
      cuerpo,
      orden: 1,
      activo: true,
      actualizado_en: ahora,
    }
    const guardado = await supabase.from('contenido_lecciones').upsert(leccion)
    if (guardado.error) return guardado.error.message
  }

  // Bajas al final: lo que el editor quitó de la lista.
  const idsEjercicio = new Set(ejercicios.map((e) => e.id))
  const ejerciciosFuera = ejerciciosPrevios
    .filter((e) => !idsEjercicio.has(e.id))
    .map((e) => e.id)
  if (ejerciciosFuera.length > 0) {
    // Baja lógica: el ejercicio puede tener intentos asociados y el historial
    // del relator no se toca. Deja de aparecer, pero su id sigue reservado.
    const baja = await supabase
      .from('contenido_ejercicios')
      .update({ activo: false })
      .in('id', ejerciciosFuera)
    if (baja.error) return baja.error.message
  }

  const idsObjetivo = new Set(objetivos.map((o) => o.id))
  const objetivosFuera = objetivosPrevios
    .filter((o) => !idsObjetivo.has(o.id))
    .map((o) => o.id)
  if (objetivosFuera.length > 0) {
    const baja = await supabase
      .from('contenido_objetivos')
      .delete()
      .in('id', objetivosFuera)
    if (baja.error) return baja.error.message
  }

  return null
}

export async function archivarMaterial(slug: string): Promise<string | null> {
  const { error } = await supabase
    .from('contenido_dominios')
    .update({ activo: false, publicado: false })
    .eq('id', slug)
  return error?.message ?? null
}

export async function cambiarPublicacion(
  slug: string,
  publicado: boolean
): Promise<string | null> {
  const { error } = await supabase
    .from('contenido_dominios')
    .update({ publicado, actualizado_en: new Date().toISOString() })
    .eq('id', slug)
  return error?.message ?? null
}
