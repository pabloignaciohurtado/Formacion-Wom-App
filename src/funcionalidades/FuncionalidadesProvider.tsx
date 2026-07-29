import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  cargarRestriccionesPerfil,
  tieneAcceso as evaluarAcceso,
} from '../lib/funcionalidades'
import { FuncionalidadesContext } from './FuncionalidadesContext'

// Carga una sola vez, por sesión, qué funcionalidades tiene restringidas el
// perfil logueado. Va dentro de las rutas protegidas, igual que
// CatalogoProvider: la RLS de `perfil_funcionalidades` exige sesión.
export function FuncionalidadesProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const [restringidas, setRestringidas] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    if (!perfil) {
      setRestringidas(new Set())
      setCargando(false)
      return
    }
    setCargando(true)
    void cargarRestriccionesPerfil(perfil.id).then((restricciones) => {
      if (!cancelado) {
        setRestringidas(restricciones)
        setCargando(false)
      }
    })
    return () => {
      cancelado = true
    }
  }, [perfil])

  const valor = useMemo(
    () => ({
      restringidas,
      cargando,
      tieneAcceso: (funcionalidadId: string) =>
        evaluarAcceso(restringidas, funcionalidadId),
    }),
    [restringidas, cargando]
  )

  return (
    <FuncionalidadesContext.Provider value={valor}>
      {children}
    </FuncionalidadesContext.Provider>
  )
}
