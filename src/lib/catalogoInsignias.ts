import { supabase } from './supabase'
import type { Tables } from './database.types'

// Catálogo maestro de insignias (tabla `insignias`): la fuente de verdad para
// MOSTRAR insignias (nombre, ícono, color, categoría, criterio). Cubre tanto
// las de formación (auto-otorgadas, ver `insignias.ts`) como las de
// desempeño de call center (ventas, retención, post-venta, habilidades
// blandas, satisfacción, constancia, cultura), otorgadas por supervisión.
// `insignias_usuario` sigue siendo la tabla de "quién ganó qué" para ambos
// orígenes.
export type InsigniaCatalogo = Tables<'insignias'>

export interface InsigniaConEstado extends InsigniaCatalogo {
  obtenida: boolean
  obtenidaEn: string | null
  // Trazabilidad de otorgamiento manual (categorías de desempeño, no
  // 'formacion'): nombre del admin que la otorgó y su nota opcional. Ambos
  // quedan en null para insignias auto-otorgadas por el sistema o fuera de
  // este flujo.
  otorgadoPorNombre: string | null
  nota: string | null
}

// Detalle de una insignia obtenida: fecha, y si fue un otorgamiento manual
// de admin, quién la otorgó y por qué.
export interface DetalleObtenida {
  obtenidaEn: string
  otorgadoPorNombre: string | null
  nota: string | null
}

export const ETIQUETAS_CATEGORIA: Record<string, string> = {
  ventas: 'Ventas',
  retencion: 'Retención',
  postventa: 'Post-venta',
  habilidades_blandas: 'Habilidades Blandas',
  satisfaccion: 'Satisfacción del Cliente',
  constancia: 'Constancia y Mejora Continua',
  cultura: 'Cultura y Reconocimiento',
  formacion: 'Formación',
}

// Orden de despliegue del álbum: desempeño primero (lo que motiva el día a
// día del ejecutivo), formación al final.
export const ORDEN_CATEGORIAS = [
  'ventas',
  'retencion',
  'postventa',
  'habilidades_blandas',
  'satisfaccion',
  'constancia',
  'cultura',
  'formacion',
]

export function etiquetaCategoria(categoria: string): string {
  return ETIQUETAS_CATEGORIA[categoria] ?? categoria
}

export async function cargarCatalogoInsignias(): Promise<InsigniaCatalogo[]> {
  const { data, error } = await supabase
    .from('insignias')
    .select('*')
    .eq('activa', true)
    .order('categoria')
    .order('orden')
  if (error) return []
  return data ?? []
}

// Devuelve un mapa insignia_id -> detalle de obtención (fecha y, si fue un
// otorgamiento manual, quién lo hizo), para el usuario dado. El nombre del
// admin se resuelve con un join contra `profiles` vía la FK `otorgado_por`
// (alias explícito porque `insignias_usuario` tiene dos FKs hacia
// `profiles`: `user_id` y `otorgado_por`).
export async function cargarInsigniasObtenidas(
  userId: string
): Promise<Map<string, DetalleObtenida>> {
  const { data, error } = await supabase
    .from('insignias_usuario')
    .select(
      'insignia_id, obtenida_en, nota, otorgado_por, admin:profiles!insignias_usuario_otorgado_por_fkey(nombre)'
    )
    .eq('user_id', userId)
  if (error || !data) return new Map()
  return new Map(
    data.map((d) => {
      const admin = d.admin as unknown as { nombre: string } | null
      return [
        d.insignia_id,
        {
          obtenidaEn: d.obtenida_en,
          otorgadoPorNombre: admin?.nombre ?? null,
          nota: d.nota,
        },
      ]
    })
  )
}

export function combinarInsignias(
  catalogo: InsigniaCatalogo[],
  obtenidas: Map<string, DetalleObtenida>
): InsigniaConEstado[] {
  return catalogo.map((i) => {
    const detalle = obtenidas.get(i.id)
    return {
      ...i,
      obtenida: obtenidas.has(i.id),
      obtenidaEn: detalle?.obtenidaEn ?? null,
      otorgadoPorNombre: detalle?.otorgadoPorNombre ?? null,
      nota: detalle?.nota ?? null,
    }
  })
}

export interface GrupoCategoria {
  categoria: string
  etiqueta: string
  insignias: InsigniaConEstado[]
}

// Agrupa por categoría en el orden fijo de ORDEN_CATEGORIAS; una categoría
// sin insignias activas simplemente no aparece (no deja un grupo vacío).
export function agruparPorCategoria(
  insignias: InsigniaConEstado[]
): GrupoCategoria[] {
  const grupos = new Map<string, InsigniaConEstado[]>()
  for (const i of insignias) {
    const arr = grupos.get(i.categoria) ?? []
    arr.push(i)
    grupos.set(i.categoria, arr)
  }
  const categorias = [
    ...ORDEN_CATEGORIAS.filter((c) => grupos.has(c)),
    // Por si aparece una categoría nueva en la base que aún no está en el
    // orden fijo: se muestra igual, al final, en vez de desaparecer.
    ...[...grupos.keys()].filter((c) => !ORDEN_CATEGORIAS.includes(c)),
  ]
  return categorias.map((categoria) => ({
    categoria,
    etiqueta: etiquetaCategoria(categoria),
    insignias: grupos.get(categoria) ?? [],
  }))
}

export interface AlbumInsignias {
  insignias: InsigniaConEstado[]
  total: number
  obtenidas: number
}

// Punto de entrada único para la página del álbum: catálogo + estado del
// usuario, ya combinados.
export async function obtenerAlbumInsignias(
  userId: string
): Promise<AlbumInsignias> {
  const [catalogo, obtenidas] = await Promise.all([
    cargarCatalogoInsignias(),
    cargarInsigniasObtenidas(userId),
  ])
  return {
    insignias: combinarInsignias(catalogo, obtenidas),
    total: catalogo.length,
    obtenidas: obtenidas.size,
  }
}

export interface UltimaInsignia {
  insignia: InsigniaCatalogo
  obtenidaEn: string
}

// Últimas N insignias obtenidas (cualquier categoría), para el teaser
// compacto del Panel. `insignias_usuario` no tiene FK declarada hacia
// `insignias` (ambas son texto libre), así que se resuelve en dos pasos.
export async function cargarUltimasInsignias(
  userId: string,
  limite = 4
): Promise<UltimaInsignia[]> {
  const { data: obtenidas, error } = await supabase
    .from('insignias_usuario')
    .select('insignia_id, obtenida_en')
    .eq('user_id', userId)
    .order('obtenida_en', { ascending: false })
    .limit(limite)
  if (error || !obtenidas || obtenidas.length === 0) return []

  const ids = obtenidas.map((o) => o.insignia_id)
  const { data: catalogo } = await supabase.from('insignias').select('*').in('id', ids)
  const porId = new Map((catalogo ?? []).map((c) => [c.id, c]))

  return obtenidas
    .map((o) => {
      const insignia = porId.get(o.insignia_id)
      return insignia ? { insignia, obtenidaEn: o.obtenida_en } : null
    })
    .filter((x): x is UltimaInsignia => x !== null)
}

export async function contarCatalogoActivo(): Promise<number> {
  const { count } = await supabase
    .from('insignias')
    .select('id', { count: 'exact', head: true })
    .eq('activa', true)
  return count ?? 0
}
