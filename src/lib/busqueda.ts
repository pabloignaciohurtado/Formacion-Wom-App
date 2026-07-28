import {
  CATEGORIAS,
  DOMINIOS,
  type Categoria,
  type Dominio,
  type Ejercicio,
} from '../data/contenido'

// Normaliza (minúsculas, sin acentos) para que "esim" encuentre "eSIM" y
// "gestion" encuentre "gestión".
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

// Título de la categoría a la que pertenece cada dominio (para nombrar el
// resultado en el buscador).
function categoriasDe(categorias: Categoria[]): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const c of categorias) {
    for (const id of c.dominios) mapa[id] = c.titulo
  }
  return mapa
}

interface EntradaIndice {
  dominio: Dominio
  categoria: string
  texto: string
}

// El índice se arma una vez por catálogo y se cachea contra el propio arreglo
// de dominios: el catálogo estático lo construye una sola vez, y el fusionado
// (estático + materiales creados desde la app) se reindexa solo cuando el
// proveedor entrega un arreglo nuevo.
const CACHE = new WeakMap<Dominio[], EntradaIndice[]>()

function indice(dominios: Dominio[], categorias: Categoria[]): EntradaIndice[] {
  const guardado = CACHE.get(dominios)
  if (guardado) return guardado
  const mapa = categoriasDe(categorias)
  const armado = dominios.map((d) => ({
    dominio: d,
    categoria: mapa[d.id] ?? '',
    texto: normalizar(
      [
        d.titulo,
        d.descripcion,
        ...d.objetivos.map((o) => o.titulo),
        ...d.ejercicios.map((e) => e.enunciado),
      ].join(' ')
    ),
  }))
  CACHE.set(dominios, armado)
  return armado
}

export interface ResultadoDominio {
  dominio: Dominio
  categoria: string
}

export function buscarDominios(
  consulta: string,
  dominios: Dominio[] = DOMINIOS,
  categorias: Categoria[] = CATEGORIAS
): ResultadoDominio[] {
  const q = normalizar(consulta.trim())
  if (!q) return []
  return indice(dominios, categorias)
    .filter((x) => x.texto.includes(q))
    .map((x) => ({
      dominio: x.dominio,
      categoria: x.categoria,
    }))
}

// Índice de ejercicios: cada enunciado con su dominio, para poder encontrar
// un ejercicio puntual (p. ej. "VoLTE") y saber en qué dominio está.
interface EntradaEjercicio {
  ejercicio: Ejercicio
  dominio: Dominio
  texto: string
}

const CACHE_EJERCICIOS = new WeakMap<Dominio[], EntradaEjercicio[]>()

function indiceEjercicios(dominios: Dominio[]): EntradaEjercicio[] {
  const guardado = CACHE_EJERCICIOS.get(dominios)
  if (guardado) return guardado
  const armado = dominios.flatMap((d) =>
    d.ejercicios.map((e) => ({
      ejercicio: e,
      dominio: d,
      texto: normalizar(e.enunciado),
    }))
  )
  CACHE_EJERCICIOS.set(dominios, armado)
  return armado
}

export interface ResultadoEjercicio {
  ejercicio: Ejercicio
  dominio: Dominio
}

export function buscarEjercicios(
  consulta: string,
  dominios: Dominio[] = DOMINIOS
): ResultadoEjercicio[] {
  const q = normalizar(consulta.trim())
  if (!q) return []
  return indiceEjercicios(dominios)
    .filter((x) => x.texto.includes(q))
    .map((x) => ({
      ejercicio: x.ejercicio,
      dominio: x.dominio,
    }))
}
