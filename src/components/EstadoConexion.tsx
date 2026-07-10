import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { EVENTO_COLA, pendientesOffline } from '../lib/colaOffline'

// Chip discreto que solo aparece cuando hay algo que contar: se perdió la red
// o quedaron intentos esperando subir. En condiciones normales no ocupa espacio.
export function EstadoConexion() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)
  const [pendientes, setPendientes] = useState(() => pendientesOffline())

  useEffect(() => {
    const verRed = () => setEnLinea(navigator.onLine)
    const verCola = () => setPendientes(pendientesOffline())
    window.addEventListener('online', verRed)
    window.addEventListener('offline', verRed)
    window.addEventListener(EVENTO_COLA, verCola)
    return () => {
      window.removeEventListener('online', verRed)
      window.removeEventListener('offline', verRed)
      window.removeEventListener(EVENTO_COLA, verCola)
    }
  }, [])

  if (enLinea && pendientes === 0) return null

  const sinRed = !enLinea
  const texto = sinRed
    ? pendientes > 0
      ? `Sin conexión · ${pendientes} por subir`
      : 'Sin conexión'
    : `Sincronizando ${pendientes}…`

  return (
    <span
      role="status"
      aria-live="polite"
      title={
        sinRed
          ? 'Tu práctica se guarda en este dispositivo y se subirá sola al volver la red.'
          : 'Subiendo los intentos que quedaron guardados sin conexión.'
      }
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        sinRed
          ? 'bg-amber-100 text-amber-700'
          : 'bg-exito/15 text-exito-texto'
      }`}
    >
      {sinRed ? (
        <CloudOff className="size-3.5" />
      ) : (
        <RefreshCw className="size-3.5 animate-spin" />
      )}
      <span className="hidden sm:inline">{texto}</span>
    </span>
  )
}
