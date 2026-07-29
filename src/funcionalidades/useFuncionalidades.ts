import { useContext } from 'react'
import { FuncionalidadesContext } from './FuncionalidadesContext'

export function useFuncionalidades() {
  const context = useContext(FuncionalidadesContext)
  if (!context) {
    throw new Error(
      'useFuncionalidades debe usarse dentro de <FuncionalidadesProvider>'
    )
  }
  return context
}
