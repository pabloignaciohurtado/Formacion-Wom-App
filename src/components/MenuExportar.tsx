import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ChevronDown, Download } from 'lucide-react'

export type OpcionExportar = {
  icono: ComponentType<{ className?: string }>
  etiqueta: string
  detalle: string
  onClick: () => void
  cargando?: boolean
}

// Menú de exportación reutilizable: un disparador "Exportar" que despliega las
// opciones dadas (PDF, Excel, CSV…). Se cierra al hacer clic fuera o con
// Escape. `ocupado` deshabilita todo mientras se genera un archivo.
export function MenuExportar({
  opciones,
  ocupado = false,
}: {
  opciones: OpcionExportar[]
  ocupado?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        disabled={ocupado}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-tinta-suave transition-colors hover:text-wom-600 disabled:opacity-60"
      >
        <Download className="size-4" />
        {ocupado ? 'Generando…' : 'Exportar'}
        <ChevronDown className="size-3.5" />
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {opciones.map((op) => {
            const Icono = op.icono
            return (
              <button
                key={op.etiqueta}
                type="button"
                role="menuitem"
                disabled={ocupado}
                onClick={() => {
                  setAbierto(false)
                  op.onClick()
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-niebla disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icono className="mt-0.5 size-4 shrink-0 text-wom-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {op.etiqueta}
                    {op.cargando ? ' · generando…' : ''}
                  </span>
                  <span className="block text-xs text-tinta-suave">
                    {op.detalle}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
