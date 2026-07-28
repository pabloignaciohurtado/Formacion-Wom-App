import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CATEGORIAS, DOMINIOS } from '../data/contenido'
import { fusionarCategorias, fusionarDominios } from '../lib/catalogo'
import {
  CONTENIDO_VACIO,
  cargarContenidoRemoto,
  dominiosDesde,
  type ContenidoRemoto,
} from '../lib/contenidoRemoto'
import { CatalogoContext } from './CatalogoContext'

const IDS_ESTATICOS = new Set(DOMINIOS.map((d) => d.id))

// Carga una sola vez el contenido creado desde la app y lo fusiona con el
// catálogo estático. Va dentro de las rutas protegidas: la RLS exige sesión,
// y pedirlo antes del login solo devolvería una lista vacía.
export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [remoto, setRemoto] = useState<ContenidoRemoto>(CONTENIDO_VACIO)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    try {
      setRemoto(await cargarContenidoRemoto(true))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const valor = useMemo(() => {
    const dominios = fusionarDominios(DOMINIOS, dominiosDesde(remoto))
    const categorias = fusionarCategorias(
      CATEGORIAS,
      remoto.dominios,
      IDS_ESTATICOS
    )
    const porId = new Map(dominios.map((d) => [d.id, d]))
    return {
      dominios,
      categorias,
      lecciones: remoto.lecciones,
      cargando,
      obtenerDominio: (id: string) => porId.get(id),
      buscarEjercicio: (ejercicioId: string) => {
        for (const dominio of dominios) {
          const ejercicio = dominio.ejercicios.find((e) => e.id === ejercicioId)
          if (ejercicio) return { dominio, ejercicio }
        }
        return undefined
      },
      leccionDe: (dominioId: string) =>
        remoto.lecciones
          .filter((l) => l.dominio_id === dominioId)
          .sort((a, b) => a.orden - b.orden)[0],
      recargar,
    }
  }, [remoto, cargando, recargar])

  return (
    <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>
  )
}
