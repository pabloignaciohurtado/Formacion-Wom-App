import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EstadoCarga } from '../components/ui'

// Admin creció a 10 secciones distintas en una sola columna de scroll
// infinito, sin ninguna navegación interna. Se reorganizó en pestañas
// (agrupación acordada con Ignacio) para que cada bloque temático se
// encuentre rápido. Cada pestaña es un chunk aparte que solo se descarga al
// abrirla (React.lazy), así el bundle inicial de /admin no crece con todo
// junto. La pestaña activa vive en la URL (?tab=…) para poder compartir un
// link directo.
const TabUsuariosAccesos = lazy(() => import('../components/admin-tabs/TabUsuariosAccesos'))
const TabDesempeno = lazy(() => import('../components/admin-tabs/TabDesempeno'))
const TabFormacion = lazy(() => import('../components/admin-tabs/TabFormacion'))
const TabActividades = lazy(() => import('../components/admin-tabs/TabActividades'))
const TabConsultas = lazy(() => import('../components/admin-tabs/TabConsultas'))

const pestanas = [
  { clave: 'usuarios', texto: 'Usuarios y Accesos', Componente: TabUsuariosAccesos },
  { clave: 'desempeno', texto: 'Desempeño y Reconocimiento', Componente: TabDesempeno },
  { clave: 'formacion', texto: 'Formación y Contenido', Componente: TabFormacion },
  { clave: 'actividades', texto: 'Actividades Obligatorias', Componente: TabActividades },
  { clave: 'consultas', texto: 'Consultas', Componente: TabConsultas },
] as const

type ClavePestana = (typeof pestanas)[number]['clave']

const clavePorDefecto: ClavePestana = pestanas[0].clave

function esClaveValida(valor: string | null): valor is ClavePestana {
  return pestanas.some((p) => p.clave === valor)
}

// Misma pista visual de sombra en los bordes que la barra inferior móvil de
// Layout.tsx: indica que hay pestañas ocultas a un swipe de distancia.
function sombraDeslizamiento(izq: boolean, der: boolean) {
  const sombraIzq = 'inset_14px_0_10px_-10px_rgba(0,0,0,0.16)'
  const sombraDer = 'inset_-14px_0_10px_-10px_rgba(0,0,0,0.16)'
  if (izq && der) return `shadow-[${sombraIzq},${sombraDer}]`
  if (izq) return `shadow-[${sombraIzq}]`
  if (der) return `shadow-[${sombraDer}]`
  return ''
}

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabsRef = useRef<HTMLDivElement>(null)
  const [puedeDeslizarIzq, setPuedeDeslizarIzq] = useState(false)
  const [puedeDeslizarDer, setPuedeDeslizarDer] = useState(false)

  const parametroTab = searchParams.get('tab')
  const pestanaActiva: ClavePestana = esClaveValida(parametroTab) ? parametroTab : clavePorDefecto

  // Si el query param no es válido (o falta), se cae en la primera pestaña
  // reflejándolo en la URL, para que un link a /admin siempre resuelva a un
  // estado consistente y compartible.
  useEffect(() => {
    if (!esClaveValida(parametroTab)) {
      setSearchParams((prev) => {
        const siguiente = new URLSearchParams(prev)
        siguiente.set('tab', clavePorDefecto)
        return siguiente
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametroTab])

  const seleccionarPestana = (clave: ClavePestana) => {
    setSearchParams((prev) => {
      const siguiente = new URLSearchParams(prev)
      siguiente.set('tab', clave)
      return siguiente
    })
  }

  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const actualizarPistas = () => {
      setPuedeDeslizarIzq(el.scrollLeft > 4)
      setPuedeDeslizarDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    actualizarPistas()
    el.addEventListener('scroll', actualizarPistas, { passive: true })
    window.addEventListener('resize', actualizarPistas)
    return () => {
      el.removeEventListener('scroll', actualizarPistas)
      window.removeEventListener('resize', actualizarPistas)
    }
  }, [])

  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const activa = el.querySelector('[aria-selected="true"]')
    activa?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pestanaActiva])

  const ComponenteActivo = useMemo(
    () => pestanas.find((p) => p.clave === pestanaActiva)?.Componente ?? TabUsuariosAccesos,
    [pestanaActiva]
  )

  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">Administración</h1>

      <div
        ref={tabsRef}
        role="tablist"
        aria-label="Secciones de administración"
        className={`scrollbar-none mt-5 flex items-center gap-1 overflow-x-auto border-b border-niebla transition-shadow [-webkit-overflow-scrolling:touch] ${sombraDeslizamiento(puedeDeslizarIzq, puedeDeslizarDer)}`}
      >
        {pestanas.map(({ clave, texto }) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={pestanaActiva === clave}
            onClick={() => seleccionarPestana(clave)}
            className={`flex-shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              pestanaActiva === clave
                ? 'border-magenta-500 text-magenta-500'
                : 'border-transparent text-tinta-suave hover:text-tinta'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Suspense fallback={<EstadoCarga texto="Cargando…" />}>
          <ComponenteActivo />
        </Suspense>
      </div>
    </section>
  )
}
