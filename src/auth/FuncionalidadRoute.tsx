import { Outlet } from 'react-router-dom'
import { useFuncionalidades } from '../funcionalidades/useFuncionalidades'
import { EstadoCarga } from '../components/ui'
import SinAccesoFuncionalidad from '../pages/SinAccesoFuncionalidad'

// Cierra el acceso a una sección concreta si un admin la restringió para
// este usuario en `perfil_funcionalidades`. Va anidada dentro de
// FuncionalidadesProvider, que ya resolvió las restricciones del perfil.
export function FuncionalidadRoute({
  funcionalidadId,
}: {
  funcionalidadId: string
}) {
  const { cargando, tieneAcceso } = useFuncionalidades()

  if (cargando) {
    return <EstadoCarga />
  }

  if (!tieneAcceso(funcionalidadId)) {
    return <SinAccesoFuncionalidad />
  }

  return <Outlet />
}
