import { createContext } from 'react'

export interface FuncionalidadesContextValue {
  // Ids de funcionalidades explícitamente restringidas para el perfil
  // actual. Cualquier id que NO esté en este set tiene acceso habilitado
  // (default de la app, ver `lib/funcionalidades.ts`).
  restringidas: Set<string>
  cargando: boolean
  tieneAcceso: (funcionalidadId: string) => boolean
}

export const FuncionalidadesContext = createContext<
  FuncionalidadesContextValue | undefined
>(undefined)
