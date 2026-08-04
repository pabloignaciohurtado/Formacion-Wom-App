// Borrador asistido por IA para el creador de materiales.
//
// La clave de la API **no** vive aquí: el navegador solo llama a la Edge
// Function `generar-borrador-material` con el JWT del usuario, y es esa
// función la que habla con el proveedor de IA. Desde el cliente nunca sale ni
// se guarda ninguna credencial de IA.
//
// Todo lo que sigue a la respuesta es lógica pura y probada: la propuesta que
// devuelve un modelo es texto, no un contrato. Puede traer diez objetivos, un
// índice de alternativa correcta fuera de rango o un título de 300 caracteres.
// `materialDesdePropuesta` la normaliza hasta dejarla dentro de las mismas
// reglas que valida el formulario, para que el administrador reciba un
// borrador editable y nunca un estado imposible de guardar.
import { supabase } from './supabase'
import {
  LARGO_MAXIMO_SLUG,
  MAXIMO_OPCIONES,
  normalizarSlug,
} from './catalogo'
import type {
  BorradorMaterial,
  BorradorObjetivo,
  BorradorPregunta,
} from './contenidoRemoto'

export const MAXIMO_OBJETIVOS = 6
export const MINIMO_PREGUNTAS_PEDIDAS = 1
export const MAXIMO_PREGUNTAS_PEDIDAS = 12
export const MAXIMO_CARACTERES_MATERIAL = 24000

export interface PropuestaPregunta {
  enunciado?: unknown
  opciones?: unknown
  correcta?: unknown
  explicacion?: unknown
  objetivo?: unknown
}

export interface PropuestaMaterial {
  titulo?: unknown
  descripcion?: unknown
  icono?: unknown
  objetivos?: unknown
  leccion?: unknown
  preguntas?: unknown
}

// Metadatos de la página de la que se extrajo el texto, informativos para
// que el administrador sepa qué se scrapeo. No forman parte del contrato de
// `materialDesdePropuesta`.
export interface FuenteLink {
  url: string
  tituloDetectado: string | null
}

function texto(valor: unknown, maximo = 400): string {
  if (typeof valor !== 'string') return ''
  return valor.trim().slice(0, maximo)
}

function entero(valor: unknown): number {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(numero) ? Math.round(numero) : 0
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

// El campo "Ícono" acepta hasta 4 unidades UTF-16, y un emoji puede ocupar
// varias (más aún si lleva modificador de tono o une varios con ZWJ). Se corta
// por *grapheme* con `Intl.Segmenter` — con respaldo al primer code point
// donde no exista — para no partir un emoji por la mitad y dejar basura.
function primerIcono(valor: unknown, porDefecto: string): string {
  const crudo = texto(valor, 16)
  if (!crudo) return porDefecto
  const Segmentador = (
    Intl as unknown as { Segmenter?: typeof Intl.Segmenter }
  ).Segmenter
  const primero = Segmentador
    ? [...new Segmentador('es', { granularity: 'grapheme' }).segment(crudo)][0]
        ?.segment
    : [...crudo][0]
  if (!primero) return porDefecto
  return primero.length <= 4 ? primero : porDefecto
}

// El slug se deriva del título, pero puede chocar con un dominio existente
// (estático o creado antes). Se sufija -2, -3… en vez de fallar: el
// administrador puede corregirlo a mano, y mientras tanto el formulario no
// arranca ya en estado inválido.
export function slugLibre(titulo: string, ocupados: Set<string>): string {
  const base = normalizarSlug(titulo)
  if (!base) return ''
  if (!ocupados.has(base)) return base
  for (let n = 2; n <= 99; n += 1) {
    const sufijo = `-${n}`
    const recortado = normalizarSlug(
      base.slice(0, LARGO_MAXIMO_SLUG - sufijo.length)
    )
    const candidato = `${recortado}${sufijo}`
    if (!ocupados.has(candidato)) return candidato
  }
  return ''
}

function objetivosDesde(valor: unknown): BorradorObjetivo[] {
  if (!Array.isArray(valor)) return []
  return valor
    .map((titulo) => texto(titulo, 200))
    .filter((titulo) => titulo.length > 0)
    .slice(0, MAXIMO_OBJETIVOS)
    .map((titulo) => ({ id: null, titulo }))
}

function preguntasDesde(
  valor: unknown,
  cantidadObjetivos: number
): BorradorPregunta[] {
  if (!Array.isArray(valor)) return []
  const preguntas: BorradorPregunta[] = []
  for (const bruta of valor as PropuestaPregunta[]) {
    const enunciado = texto(bruta?.enunciado, 600)
    const opciones = Array.isArray(bruta?.opciones)
      ? (bruta.opciones as unknown[])
          .map((o) => texto(o, 300))
          .filter((o) => o.length > 0)
          .slice(0, MAXIMO_OPCIONES)
      : []
    // Una pregunta sin enunciado o con una sola alternativa no es editable,
    // es ruido: se descarta en vez de dejarla molestando en el formulario.
    if (!enunciado || opciones.length < 2) continue
    preguntas.push({
      id: null,
      enunciado,
      opciones,
      correcta: acotar(entero(bruta?.correcta), 0, opciones.length - 1),
      explicacion: texto(bruta?.explicacion, 600),
      objetivo: acotar(entero(bruta?.objetivo), 0, Math.max(0, cantidadObjetivos - 1)),
    })
  }
  return preguntas
}

// Funde la propuesta sobre el borrador que el administrador ya tenía abierto.
// Lo que la IA no proponga se conserva: si alguien escribió el título a mano y
// el modelo no devuelve uno, no se le borra.
export function materialDesdePropuesta(
  propuesta: PropuestaMaterial | null | undefined,
  base: BorradorMaterial,
  opciones: { ocupados: Set<string>; editandoExistente: boolean }
): BorradorMaterial {
  const datos = propuesta ?? {}
  const titulo = texto(datos.titulo, 120) || base.titulo
  const objetivos = objetivosDesde(datos.objetivos)
  const preguntas = preguntasDesde(datos.preguntas, objetivos.length)
  const leccion = (datos.leccion ?? {}) as { titulo?: unknown; cuerpo?: unknown }

  // Editando un material ya publicado el slug es inmutable: cambiarlo
  // romparía los `attempts` y las tarjetas de repaso que lo referencian.
  const slug = opciones.editandoExistente
    ? base.slug
    : slugLibre(titulo, opciones.ocupados) || base.slug

  return {
    ...base,
    slug,
    titulo,
    icono: primerIcono(datos.icono, base.icono),
    descripcion: texto(datos.descripcion, 300) || base.descripcion,
    objetivos: objetivos.length > 0 ? objetivos : base.objetivos,
    preguntas: preguntas.length > 0 ? preguntas : base.preguntas,
    leccionTitulo: texto(leccion.titulo, 160) || base.leccionTitulo,
    leccionCuerpo:
      typeof leccion.cuerpo === 'string' && leccion.cuerpo.trim()
        ? leccion.cuerpo.trim()
        : base.leccionCuerpo,
  }
}

export interface PeticionBorrador {
  material: string
  cantidadPreguntas: number
  foco: string
}

export interface ResultadoBorrador {
  propuesta: PropuestaMaterial | null
  error: string | null
}

// Llama a la Edge Function. Devuelve el mensaje de error ya en español y listo
// para mostrar: los errores de `functions.invoke` llegan como un
// `FunctionsHttpError` cuyo cuerpo hay que leer para saber qué pasó.
export async function pedirBorradorIa(
  peticion: PeticionBorrador
): Promise<ResultadoBorrador> {
  const { data, error } = await supabase.functions.invoke<{
    propuesta: PropuestaMaterial
  }>('generar-borrador-material', {
    body: {
      material: peticion.material.slice(0, MAXIMO_CARACTERES_MATERIAL),
      cantidadPreguntas: acotar(
        entero(peticion.cantidadPreguntas),
        MINIMO_PREGUNTAS_PEDIDAS,
        MAXIMO_PREGUNTAS_PEDIDAS
      ),
      foco: peticion.foco.trim(),
    },
  })

  if (error) {
    let mensaje = 'No se pudo generar el borrador.'
    const contexto = (error as { context?: Response }).context
    if (contexto && typeof contexto.json === 'function') {
      try {
        const cuerpo = await contexto.json()
        if (typeof cuerpo?.error === 'string') mensaje = cuerpo.error
      } catch {
        // Sin cuerpo JSON útil: se queda el mensaje genérico.
      }
    }
    return { propuesta: null, error: mensaje }
  }

  if (!data?.propuesta) {
    return { propuesta: null, error: 'La IA no devolvió una propuesta.' }
  }
  return { propuesta: data.propuesta, error: null }
}

export interface PeticionBorradorDesdeLink {
  url: string
  cantidadPreguntas: number
  foco: string
}

export interface ResultadoBorradorDesdeLink {
  propuesta: PropuestaMaterial | null
  fuente: FuenteLink | null
  error: string | null
}

// Extrae el texto legible de un link y pide a la IA la misma propuesta que
// `pedirBorradorIa`. La llama a una Edge Function distinta
// (`generar-ejercicios-desde-link`) porque el scraping y el fetch con
// límites propios (tamaño, tiempo, guardas de SSRF) viven ahí, pero la forma
// de la respuesta es idéntica: `materialDesdePropuesta` se reutiliza sin
// adaptarla.
export async function generarBorradorDesdeLink(
  peticion: PeticionBorradorDesdeLink
): Promise<ResultadoBorradorDesdeLink> {
  const { data, error } = await supabase.functions.invoke<{
    propuesta: PropuestaMaterial
    fuente?: FuenteLink
  }>('generar-ejercicios-desde-link', {
    body: {
      url: peticion.url.trim(),
      cantidadPreguntas: acotar(
        entero(peticion.cantidadPreguntas),
        MINIMO_PREGUNTAS_PEDIDAS,
        MAXIMO_PREGUNTAS_PEDIDAS
      ),
      foco: peticion.foco.trim(),
    },
  })

  if (error) {
    let mensaje = 'No se pudo generar el borrador desde el link.'
    const contexto = (error as { context?: Response }).context
    if (contexto && typeof contexto.json === 'function') {
      try {
        const cuerpo = await contexto.json()
        if (typeof cuerpo?.error === 'string') mensaje = cuerpo.error
      } catch {
        // Sin cuerpo JSON útil: se queda el mensaje genérico.
      }
    }
    return { propuesta: null, fuente: null, error: mensaje }
  }

  if (!data?.propuesta) {
    return { propuesta: null, fuente: null, error: 'La IA no devolvió una propuesta.' }
  }
  return { propuesta: data.propuesta, fuente: data.fuente ?? null, error: null }
}
