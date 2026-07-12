import { CATEGORIAS, DOMINIOS, type Dominio } from '../data/contenido'

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
const CATEGORIA_DE: Record<string, string> = {}
for (const c of CATEGORIAS) {
  for (const id of c.dominios) CATEGORIA_DE[id] = c.titulo
}

// Índice armado una sola vez: cada dominio con su texto buscable (título,
// descripción, objetivos y enunciados de sus ejercicios).
const INDICE = DOMINIOS.map((d) => ({
  dominio: d,
  categoria: CATEGORIA_DE[d.id] ?? '',
  texto: normalizar(
    [
      d.titulo,
      d.descripcion,
      ...d.objetivos.map((o) => o.titulo),
      ...d.ejercicios.map((e) => e.enunciado),
    ].join(' ')
  ),
}))

export interface ResultadoDominio {
  dominio: Dominio
  categoria: string
}

export function buscarDominios(consulta: string): ResultadoDominio[] {
  const q = normalizar(consulta.trim())
  if (!q) return []
  return INDICE.filter((x) => x.texto.includes(q)).map((x) => ({
    dominio: x.dominio,
    categoria: x.categoria,
  }))
}
