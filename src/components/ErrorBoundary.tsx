import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clasesBoton } from './estilosBoton'

// Clave de sesión que evita el bucle de recargas: si el chunk sigue fallando
// después de recargar una vez, mostramos la pantalla de error en vez de
// recargar para siempre.
const CLAVE_RECARGA = 'wom-recarga-por-chunk'

// Un despliegue nuevo borra los chunks viejos. Una pestaña abierta desde antes
// pide un archivo que ya no existe y React.lazy rechaza. El navegador no avisa:
// la pantalla se queda en blanco. Recargar resuelve el 100% de estos casos,
// porque el index.html nuevo apunta a los chunks nuevos.
function esErrorDeChunk(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|chunkloaderror/i.test(
    texto
  )
}

interface Props {
  children: ReactNode
}

interface Estado {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, Estado> {
  state: Estado = { error: null }

  static getDerivedStateFromError(error: Error): Estado {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sin servicio de errores todavía: al menos que quede en la consola del
    // navegador, que es donde mirará quien reciba el reporte.
    console.error('Error no capturado:', error, info.componentStack)

    if (esErrorDeChunk(error) && !sessionStorage.getItem(CLAVE_RECARGA)) {
      sessionStorage.setItem(CLAVE_RECARGA, '1')
      window.location.reload()
    }
  }

  private recargar = () => {
    sessionStorage.removeItem(CLAVE_RECARGA)
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const esChunk = esErrorDeChunk(error)

    return (
      <div
        role="alert"
        className="grid min-h-dvh place-items-center bg-niebla p-6 text-tinta"
      >
        <div className="w-full max-w-md rounded-[20px] bg-white p-8 text-center shadow-[0_10px_30px_-14px_rgba(39,0,70,0.28)] ring-1 ring-black/5">
          <p className="text-4xl">{esChunk ? '🔄' : '🔧'}</p>
          <h1 className="mt-4 text-2xl font-black tracking-[-0.02em]">
            {esChunk ? 'Hay una versión nueva' : 'Algo se rompió'}
          </h1>
          <p className="mt-2 text-tinta-suave">
            {esChunk
              ? 'La app se actualizó mientras la tenías abierta. Recarga para continuar; tu progreso está guardado.'
              : 'Tu progreso está guardado. Recarga la página; si vuelve a pasar, avísale al equipo de formación.'}
          </p>
          <button
            type="button"
            onClick={this.recargar}
            className={clasesBoton('primario', 'mt-6 w-full')}
          >
            Recargar
          </button>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs font-semibold text-tinta-suave">
              Detalle técnico
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-niebla p-3 text-[11px] leading-snug text-tinta-suave">
              {error.name}: {error.message}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
