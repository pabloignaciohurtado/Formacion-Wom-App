import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  cargarFuncionalidadesGrupo,
  cargarOverridesPerfil,
  tieneAcceso as evaluarAcceso,
} from '../lib/funcionalidades'
import { FuncionalidadesContext } from './FuncionalidadesContext'

// Carga una sola vez, por sesión, los overrides individuales del perfil
// logueado y, si tiene un grupo de acceso asignado, el detalle de ese
// grupo. Va dentro de las rutas protegidas, igual que CatalogoProvider: la
// RLS de `perfil_funcionalidades`/`grupo_acceso_funcionalidades` exige
// sesión.
export function FuncionalidadesProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const [overridesIndividuales, setOverridesIndividuales] = useState<Map<string, boolean>>(
    new Map()
  )
  const [accesosGrupo, setAccesosGrupo] = useState<Map<string, boolean> | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    if (!perfil) {
      setOverridesIndividuales(new Map())
      setAccesosGrupo(null)
      setCargando(false)
      return
    }
    setCargando(true)
    void Promise.all([
      cargarOverridesPerfil(perfil.id),
      perfil.grupo_acceso_id
        ? cargarFuncionalidadesGrupo(perfil.grupo_acceso_id)
        : Promise.resolve(null),
    ]).then(([overrides, grupo]) => {
      if (!cancelado) {
        setOverridesIndividuales(overrides)
        setAccesosGrupo(grupo)
        setCargando(false)
      }
    })
    return () => {
      cancelado = true
    }
  }, [perfil])

  const valor = useMemo(
    () => ({
      overridesIndividuales,
      accesosGrupo,
      cargando,
      tieneAcceso: (funcionalidadId: string) =>
        evaluarAcceso(overridesIndividuales, accesosGrupo, funcionalidadId),
    }),
    [overridesIndividuales, accesosGrupo, cargando]
  )

  return (
    <FuncionalidadesContext.Provider value={valor}>
      {children}
    </FuncionalidadesContext.Provider>
  )
}
