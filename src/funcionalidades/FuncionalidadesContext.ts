import { createContext } from 'react'

export interface FuncionalidadesContextValue {
  // Overrides individuales del perfil actual (perfil_funcionalidades) y,
  // si tiene un grupo de acceso asignado, el detalle de ese grupo
  // (grupo_acceso_funcionalidades). Ver `lib/funcionalidades.ts` para la
  // cascada completa de resolución (override individual > grupo > default
  // habilitado).
  overridesIndividuales: Map<string, boolean>
  accesosGrupo: Map<string, boolean> | null
  cargando: boolean
  tieneAcceso: (funcionalidadId: string) => boolean
}

export const FuncionalidadesContext = createContext<
  FuncionalidadesContextValue | undefined
>(undefined)
