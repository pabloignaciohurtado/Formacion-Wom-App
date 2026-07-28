import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import {
  aplicarTema,
  escucharSistema,
  guardarTema,
  leerTema,
  type Tema,
} from '../lib/tema'

const OPCIONES: { valor: Tema; etiqueta: string; Icono: typeof Sun }[] = [
  { valor: 'claro', etiqueta: 'Claro', Icono: Sun },
  { valor: 'oscuro', etiqueta: 'Oscuro', Icono: Moon },
  { valor: 'sistema', etiqueta: 'Automático', Icono: Monitor },
]

/**
 * Control segmentado de tema. Tres opciones en vez de un interruptor: así
 * "seguir al sistema" se puede recuperar después de haber elegido a mano.
 *
 * Semántica de radiogroup (no de botones sueltos) porque son opciones
 * excluyentes de un mismo ajuste: el lector de pantalla anuncia "Tema, 1 de 3"
 * y las flechas del teclado recorren el grupo.
 */
export function SelectorTema({ className = '' }: { className?: string }) {
  const [tema, setTema] = useState<Tema>(() => leerTema())

  // Mientras la preferencia sea "automático", el sistema manda: si el equipo
  // cambia a oscuro al anochecer, la app lo sigue sin recargar.
  useEffect(() => {
    if (tema !== 'sistema') return
    return escucharSistema(() => aplicarTema('sistema'))
  }, [tema])

  const elegir = (valor: Tema) => {
    setTema(valor)
    guardarTema(valor)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la aplicación"
      className={`flex items-center gap-0.5 rounded-full bg-niebla p-0.5 ring-1 ring-black/5 dark:ring-white/10 ${className}`}
    >
      {OPCIONES.map(({ valor, etiqueta, Icono }) => {
        const activo = tema === valor
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={etiqueta}
            title={etiqueta}
            onClick={() => elegir(valor)}
            className={`grid size-8 place-items-center rounded-full transition-colors ${
              activo
                ? 'bg-superficie text-enlace shadow-sm'
                : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            <Icono className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
