// Catálogo unificado: los dominios estáticos de `data/contenido.ts` más los
// que se crean desde la app (tablas `contenido_*`).
//
// Por qué conviven dos fuentes en vez de migrar todo a la base: `attempts` y
// `srs_cards` guardan `exercise_id`, `domain_id` y `objetivo_id` como texto
// libre, sin llave foránea. Mover los 127 ejercicios estáticos a la base
// obligaría a reescribir esas referencias y cualquier error dejaría a un
// relator sin su historial. El catálogo estático queda intacto y el contenido
// nuevo se fusiona en tiempo de ejecución.
//
// La unicidad de los ids nuevos se apoya en un solo dato: el slug del dominio.
// Los objetivos y ejercicios derivan su id de ese slug (`<slug>-o1`,
// `<slug>-e1`), así que basta validar el slug una vez contra el catálogo
// fusionado para que ningún id nuevo pise a uno existente.
//
// Lógica pura, sin React ni Supabase, para poder probarla — mismo patrón que
// `lib/materiales.ts` y `lib/reentrenamiento.ts`.
import type { Categoria, Dominio, Ejercicio, Objetivo } from '../data/contenido'
import type { Tables } from './database.types'

export type DominioFila = Tables<'contenido_dominios'>
export type ObjetivoFila = Tables<'contenido_objetivos'>
export type EjercicioFila = Tables<'contenido_ejercicios'>
export type LeccionFila = Tables<'contenido_lecciones'>

// Debe coincidir con el CHECK de `contenido_dominios.id` en la migración
// `creador_de_materiales_de_aprendizaje`: si aquí aceptamos algo que la base
// rechaza, el error aparecería recién al guardar.
export const PATRON_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const LARGO_MINIMO_SLUG = 3
export const LARGO_MAXIMO_SLUG = 48

// Convierte un título libre en un slug candidato. Quita tildes (NFD + rango
// de diacríticos) para que "Atención al cliente" dé "atencion-al-cliente" y
// no "atenci-n-al-cliente".
export function normalizarSlug(texto: string): string {
  const base = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base.length <= LARGO_MAXIMO_SLUG) return base
  // Al recortar preferimos perder la \u00faltima palabra completa antes que dejar
  // un id cortado a la mitad ("fibra-optica-resid"), que se lee como error.
  const recortado = base.slice(0, LARGO_MAXIMO_SLUG)
  const ultimoGuion = recortado.lastIndexOf('-')
  return ultimoGuion > 0 ? recortado.slice(0, ultimoGuion) : recortado
}

export function idObjetivo(slug: string, numero: number): string {
  return `${slug}-o${numero}`
}

export function idEjercicio(slug: string, numero: number): string {
  return `${slug}-e${numero}`
}

// Siguiente número libre para un hijo del dominio. Nunca se reutiliza un
// número dado de baja: `attempts` y `srs_cards` guardan el id del ejercicio
// como texto, así que reciclar `<slug>-e3` para una pregunta distinta le
// atribuiría a la nueva el historial de la vieja.
export function siguienteNumero(
  idsExistentes: string[],
  slug: string,
  prefijo: 'o' | 'e'
): number {
  const patron = new RegExp(`^${slug}-${prefijo}(\\d+)$`)
  let maximo = 0
  for (const id of idsExistentes) {
    const encontrado = patron.exec(id)
    if (encontrado) maximo = Math.max(maximo, Number(encontrado[1]))
  }
  return maximo + 1
}

// Todos los ids que ya están en uso en un catálogo: dominios, objetivos y
// ejercicios. Se usa para validar un slug nuevo — no basta con mirar los ids
// de dominio, porque un slug como `po` generaría `po-e1`, que podría chocar
// con un ejercicio estático.
export function idsOcupados(dominios: Dominio[]): Set<string> {
  const ocupados = new Set<string>()
  for (const dominio of dominios) {
    ocupados.add(dominio.id)
    for (const objetivo of dominio.objetivos) ocupados.add(objetivo.id)
    for (const ejercicio of dominio.ejercicios) ocupados.add(ejercicio.id)
  }
  return ocupados
}

// `null` si el slug sirve; si no, el mensaje que ve el administrador.
export function validarSlugDominio(
  slug: string,
  ocupados: Set<string>
): string | null {
  if (slug.length < LARGO_MINIMO_SLUG) {
    return `El identificador debe tener al menos ${LARGO_MINIMO_SLUG} caracteres.`
  }
  if (slug.length > LARGO_MAXIMO_SLUG) {
    return `El identificador no puede superar los ${LARGO_MAXIMO_SLUG} caracteres.`
  }
  if (!PATRON_SLUG.test(slug)) {
    return 'Usa solo minúsculas, números y guiones simples (ej.: atencion-cliente).'
  }
  if (ocupados.has(slug)) {
    return 'Ya existe un contenido con ese identificador.'
  }
  // El slug ya pasó PATRON_SLUG, así que no trae metacaracteres de regex.
  const patronHijos = new RegExp(`^${slug}-(o|e)\\d+$`)
  for (const id of ocupados) {
    if (patronHijos.test(id)) {
      return `El identificador choca con contenido existente (${id}). Elige otro.`
    }
  }
  return null
}

// Errores de una pregunta antes de guardarla. Devuelve la lista completa (no
// se corta en el primero) para que el editor pueda mostrarlos todos juntos.
export interface BorradorEjercicio {
  enunciado: string
  opciones: string[]
  correcta: number
  explicacion: string
}

export const MINIMO_OPCIONES = 2
export const MAXIMO_OPCIONES = 6

export function validarEjercicio(borrador: BorradorEjercicio): string[] {
  const errores: string[] = []
  if (!borrador.enunciado.trim()) errores.push('La pregunta no puede quedar vacía.')

  const opciones = borrador.opciones.map((o) => o.trim())
  const conTexto = opciones.filter((o) => o.length > 0)
  if (conTexto.length < MINIMO_OPCIONES) {
    errores.push(`Debes escribir al menos ${MINIMO_OPCIONES} alternativas.`)
  }
  if (opciones.length > MAXIMO_OPCIONES) {
    errores.push(`No puedes tener más de ${MAXIMO_OPCIONES} alternativas.`)
  }
  if (conTexto.length !== new Set(conTexto).size) {
    errores.push('Hay alternativas repetidas.')
  }
  if (
    borrador.correcta < 0 ||
    borrador.correcta >= opciones.length ||
    !opciones[borrador.correcta]
  ) {
    errores.push('Marca cuál es la alternativa correcta.')
  }
  // La explicación es obligatoria a propósito: es lo que el relator lee
  // después de responder, y sin ella el ejercicio enseña a adivinar.
  if (!borrador.explicacion.trim()) {
    errores.push('Escribe la explicación que verá el relator al responder.')
  }
  return errores
}

// Arma un `Dominio` (la forma que ya entienden las 11 pantallas que consumen
// el catálogo) a partir de las filas de la base. Objetivos y ejercicios se
// filtran por dominio y se ordenan por `orden` y luego por id, para que el
// resultado sea estable entre cargas.
export function armarDominio(
  fila: DominioFila,
  objetivos: ObjetivoFila[],
  ejercicios: EjercicioFila[]
): Dominio {
  const porOrden = <T extends { orden: number; id: string }>(a: T, b: T) =>
    a.orden - b.orden || a.id.localeCompare(b.id)

  const objetivosDelDominio: Objetivo[] = objetivos
    .filter((o) => o.dominio_id === fila.id)
    .sort(porOrden)
    .map((o) => ({ id: o.id, titulo: o.titulo }))

  const idsObjetivo = new Set(objetivosDelDominio.map((o) => o.id))

  const ejerciciosDelDominio: Ejercicio[] = ejercicios
    .filter((e) => e.dominio_id === fila.id && idsObjetivo.has(e.objetivo_id))
    .sort(porOrden)
    .map((e) => ({
      id: e.id,
      objetivoId: e.objetivo_id,
      enunciado: e.enunciado,
      opciones: e.opciones,
      correcta: e.correcta,
      explicacion: e.explicacion,
    }))

  return {
    id: fila.id,
    titulo: fila.titulo,
    icono: fila.icono,
    descripcion: fila.descripcion,
    objetivos: objetivosDelDominio,
    ejercicios: ejerciciosDelDominio,
  }
}

// Fusión estático + base. El estático siempre gana: si por cualquier motivo
// llegara un dominio de la base con un id repetido, se descarta en vez de
// tapar contenido con historial asociado.
export function fusionarDominios(
  estaticos: Dominio[],
  remotos: Dominio[]
): Dominio[] {
  const idsEstaticos = new Set(estaticos.map((d) => d.id))
  const nuevos = remotos.filter((d) => !idsEstaticos.has(d.id))
  return [...estaticos, ...nuevos]
}

// Los dominios nuevos deben aparecer dentro de su categoría en la pantalla de
// Ejercicios. Si un dominio trae una categoría desconocida, cae en la primera
// para que nunca quede invisible.
export function fusionarCategorias(
  categorias: Categoria[],
  filas: DominioFila[],
  idsEstaticos: Set<string>
): Categoria[] {
  if (categorias.length === 0) return categorias
  const porCategoria = new Map<string, string[]>()
  for (const fila of filas) {
    if (idsEstaticos.has(fila.id)) continue
    const destino = categorias.some((c) => c.id === fila.categoria_id)
      ? fila.categoria_id
      : categorias[0].id
    const lista = porCategoria.get(destino) ?? []
    lista.push(fila.id)
    porCategoria.set(destino, lista)
  }
  return categorias.map((categoria) => {
    const extra = porCategoria.get(categoria.id)
    if (!extra || extra.length === 0) return categoria
    return { ...categoria, dominios: [...categoria.dominios, ...extra] }
  })
}
