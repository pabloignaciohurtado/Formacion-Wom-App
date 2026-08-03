// De transcripciones de llamadas a lección.
//
// El creador de materiales parte hoy de un instructivo o de un link. Este
// módulo agrega el origen que más se parece al trabajo real de calidad: se
// pega un lote de llamadas mal evaluadas, la IA detecta los patrones de error
// que se repiten, propone qué dominio reforzar y redacta la lección con sus
// preguntas.
//
// Todo lo que hay aquí es lógica pura y probada, salvo la última función que
// llama a la Edge Function. La clave de la IA nunca sale del servidor, y la
// propuesta que vuelve tiene la misma forma que las otras dos vías: se funde
// con `materialDesdePropuesta` de `borradorIa.ts` sin adaptarla.
import { supabase } from './supabase'
import type { PropuestaMaterial } from './borradorIa'

export const MAXIMO_CARACTERES_LLAMADAS = 60000
export const MAXIMO_LLAMADAS = 40
export const MINIMO_CARACTERES_LLAMADAS = 200
export const MAXIMO_PATRONES = 8

// Separadores que aparecen de verdad al pegar un lote: una línea de guiones
// o iguales, o un encabezado del tipo "Llamada 3", "Caso 2:", "Interacción 4".
// Se exige que el encabezado ocupe su propia línea para no partir una llamada
// donde el ejecutivo dijo "es la tercera llamada que hago".
const LINEA_SEPARADORA = /^[ \t]*(?:-{3,}|={3,}|\*{3,}|_{3,})[ \t]*$/
// El encabezado admite la decoración con la que se pega en la práctica:
// "Llamada 3", "### Caso 2:", "--- Llamada 1 ---", "=== Interacción 4 ===".
const ENCABEZADO_LLAMADA =
  /^[ \t]*[-=*_#]{0,6}[ \t]*(?:llamada|caso|interacci[oó]n|contacto|ticket|audio|grabaci[oó]n)[ \t]*(?:n[.°º]?[ \t]*)?[#nN]?[ \t]*\d+[ \t]*[:.)]?[ \t]*[-=*_#]{0,6}[ \t]*$/i

function esSeparador(linea: string): boolean {
  return LINEA_SEPARADORA.test(linea) || ENCABEZADO_LLAMADA.test(linea)
}

/**
 * Parte el texto pegado en llamadas individuales.
 *
 * Si no encuentra ningún separador devuelve el texto completo como una sola
 * llamada: pegar una transcripción suelta tiene que funcionar igual que pegar
 * un lote, sin obligar al usuario a aprender un formato.
 */
export function separarLlamadas(texto: string): string[] {
  return separarLlamadasSinTope(texto).slice(0, MAXIMO_LLAMADAS)
}

function separarLlamadasSinTope(texto: string): string[] {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n')
  const bloques: string[][] = [[]]
  for (const linea of lineas) {
    if (esSeparador(linea)) {
      // Un encabezado abre bloque nuevo solo si el actual ya trae contenido;
      // así "--- Llamada 1 ---" al comienzo no genera un bloque vacío.
      if (bloques[bloques.length - 1].some((l) => l.trim())) bloques.push([])
      continue
    }
    bloques[bloques.length - 1].push(linea)
  }
  return bloques
    .map((bloque) => bloque.join('\n').trim())
    .filter((bloque) => bloque.length > 0)
}

export interface ResumenLote {
  llamadas: number
  caracteres: number
  /** Llamadas que quedaron fuera por el tope de `MAXIMO_LLAMADAS`. */
  descartadas: number
  /** Motivo por el que todavía no se puede generar, o `null` si se puede. */
  impedimento: string | null
}

export function resumenLote(texto: string): ResumenLote {
  const recortado = texto.slice(0, MAXIMO_CARACTERES_LLAMADAS)
  const todas = separarLlamadasSinTope(recortado)
  const llamadas = todas.slice(0, MAXIMO_LLAMADAS)
  const caracteres = llamadas.reduce((total, l) => total + l.length, 0)
  const impedimento =
    llamadas.length === 0
      ? 'Pega al menos una transcripción.'
      : caracteres < MINIMO_CARACTERES_LLAMADAS
        ? 'El texto es muy corto para detectar patrones. Pega las transcripciones completas.'
        : null
  return {
    llamadas: llamadas.length,
    caracteres,
    descartadas: todas.length - llamadas.length,
    impedimento,
  }
}

export type Gravedad = 'alta' | 'media' | 'baja'

export interface PatronError {
  titulo: string
  descripcion: string
  /** En cuántas de las llamadas del lote aparece. */
  llamadas: number
  gravedad: Gravedad
  /** Frase textual de alguna llamada que ilustra el patrón. */
  ejemplo: string
  /** Qué le cuesta a la operación o al cliente que esto pase. */
  impacto: string
}

export interface DominioSugerido {
  /** Id del dominio existente a reforzar, o `null` si propone uno nuevo. */
  id: string | null
  titulo: string
  esNuevo: boolean
  motivo: string
}

export interface Diagnostico {
  patrones: PatronError[]
  dominioSugerido: DominioSugerido | null
  resumen: string
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

function gravedadDesde(valor: unknown): Gravedad {
  const crudo = texto(valor, 10).toLowerCase()
  return crudo === 'alta' || crudo === 'baja' ? crudo : 'media'
}

/**
 * Normaliza el diagnóstico que devuelve el modelo.
 *
 * Es texto, no un contrato: puede traer quince patrones, una gravedad
 * inventada, o decir que un error aparece en 40 llamadas cuando el lote tenía
 * 3. Se acota todo antes de mostrarlo — un conteo inflado sería peor que no
 * mostrarlo, porque es justo el número que se usa para priorizar.
 */
export function diagnosticoDesde(
  valor: unknown,
  contexto: { llamadasAnalizadas: number; idsValidos: Set<string> }
): Diagnostico {
  const datos = (valor ?? {}) as {
    patrones?: unknown
    dominioSugerido?: unknown
    resumen?: unknown
  }

  const patrones: PatronError[] = Array.isArray(datos.patrones)
    ? (datos.patrones as Record<string, unknown>[])
        .map((bruto) => ({
          titulo: texto(bruto?.titulo, 120),
          descripcion: texto(bruto?.descripcion, 500),
          llamadas: acotar(
            entero(bruto?.llamadas),
            1,
            Math.max(1, contexto.llamadasAnalizadas)
          ),
          gravedad: gravedadDesde(bruto?.gravedad),
          ejemplo: texto(bruto?.ejemplo, 300),
          impacto: texto(bruto?.impacto, 300),
        }))
        // Un patrón sin título no es accionable: es ruido en la pantalla.
        .filter((patron) => patron.titulo.length > 0)
        .slice(0, MAXIMO_PATRONES)
    : []

  const bruto = (datos.dominioSugerido ?? {}) as Record<string, unknown>
  const tituloDominio = texto(bruto?.titulo, 120)
  const idPropuesto = texto(bruto?.id, 64)
  // El id solo se acepta si existe de verdad en el catálogo: si el modelo se
  // inventa uno, se trata como dominio nuevo en vez de enlazar a la nada.
  const idValido = contexto.idsValidos.has(idPropuesto) ? idPropuesto : null

  return {
    patrones,
    dominioSugerido: tituloDominio
      ? {
          id: idValido,
          titulo: tituloDominio,
          esNuevo: idValido === null,
          motivo: texto(bruto?.motivo, 400),
        }
      : null,
    resumen: texto(datos.resumen, 600),
  }
}

/** Ordena los patrones por prioridad: gravedad primero, luego frecuencia. */
export function patronesPriorizados(patrones: PatronError[]): PatronError[] {
  const peso: Record<Gravedad, number> = { alta: 0, media: 1, baja: 2 }
  return [...patrones].sort(
    (a, b) => peso[a.gravedad] - peso[b.gravedad] || b.llamadas - a.llamadas
  )
}

export interface DominioConocido {
  id: string
  titulo: string
}

export interface PeticionLlamadas {
  transcripciones: string
  cantidadPreguntas: number
  foco: string
  dominios: DominioConocido[]
}

export interface ResultadoLlamadas {
  propuesta: PropuestaMaterial | null
  diagnostico: Diagnostico | null
  error: string | null
}

export async function generarLeccionDesdeLlamadas(
  peticion: PeticionLlamadas
): Promise<ResultadoLlamadas> {
  const llamadas = separarLlamadas(
    peticion.transcripciones.slice(0, MAXIMO_CARACTERES_LLAMADAS)
  )
  const idsValidos = new Set(peticion.dominios.map((d) => d.id))

  const { data, error } = await supabase.functions.invoke<{
    propuesta: PropuestaMaterial
    diagnostico?: unknown
  }>('generar-leccion-desde-llamadas', {
    body: {
      llamadas,
      cantidadPreguntas: acotar(entero(peticion.cantidadPreguntas), 1, 12),
      foco: peticion.foco.trim(),
      // Se mandan los dominios existentes (solo id y título, nada sensible)
      // para que el modelo pueda mapear el refuerzo a uno que ya existe en
      // vez de proponer siempre un dominio nuevo y fragmentar el catálogo.
      dominios: peticion.dominios.slice(0, 60),
    },
  })

  if (error) {
    let mensaje = 'No se pudo analizar las llamadas.'
    const contexto = (error as { context?: Response }).context
    if (contexto && typeof contexto.json === 'function') {
      try {
        const cuerpo = await contexto.json()
        if (typeof cuerpo?.error === 'string') mensaje = cuerpo.error
      } catch {
        // Sin cuerpo JSON útil: se queda el mensaje genérico.
      }
    }
    return { propuesta: null, diagnostico: null, error: mensaje }
  }

  if (!data?.propuesta) {
    return {
      propuesta: null,
      diagnostico: null,
      error: 'La IA no devolvió una propuesta.',
    }
  }

  return {
    propuesta: data.propuesta,
    diagnostico: diagnosticoDesde(data.diagnostico, {
      llamadasAnalizadas: llamadas.length,
      idsValidos,
    }),
    error: null,
  }
}
