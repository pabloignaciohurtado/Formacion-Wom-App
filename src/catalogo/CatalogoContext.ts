import { createContext } from 'react'
import type { Categoria, Dominio, Ejercicio } from '../data/contenido'
import type { LeccionFila } from '../lib/catalogo'

// El catálogo que ve la app: los 13 dominios estáticos de `data/contenido.ts`
// más los publicados desde el creador de materiales. Mientras el contenido
// remoto viaja, `dominios` ya trae los estáticos, así que ninguna pantalla se
// queda en blanco esperando la red.
export interface CatalogoContextValue {
  dominios: Dominio[]
  categorias: Categoria[]
  lecciones: LeccionFila[]
  cargando: boolean
  obtenerDominio: (id: string) => Dominio | undefined
  buscarEjercicio: (
    ejercicioId: string
  ) => { dominio: Dominio; ejercicio: Ejercicio } | undefined
  leccionDe: (dominioId: string) => LeccionFila | undefined
  recargar: () => Promise<void>
}

export const CatalogoContext = createContext<CatalogoContextValue | undefined>(
  undefined
)
