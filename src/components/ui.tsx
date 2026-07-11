import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { clasesBoton, type VarianteBoton } from './estilosBoton'

// forwardRef: la pantalla de práctica necesita mover el foco de teclado a
// "Siguiente" al mostrar el feedback (accesibilidad), y para eso hace falta
// una referencia al <button> real.
export const Boton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton }
>(function Boton({ variante = 'primario', className = '', ...props }, ref) {
  return (
    <button ref={ref} className={clasesBoton(variante, className)} {...props} />
  )
})

export function Campo({
  etiqueta,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-tinta">
        {etiqueta}
      </label>
      <input
        id={id}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-tinta placeholder:text-gray-400 transition-shadow focus:outline-none focus:ring-2 focus:ring-wom-600 focus:border-transparent"
        {...props}
      />
    </div>
  )
}

export function Tarjeta({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-[20px] bg-white p-6 shadow-[0_10px_30px_-14px_rgba(39,0,70,0.28)] ring-1 ring-black/5 dark:ring-white/10 ${className}`}
    >
      {children}
    </div>
  )
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
    >
      {children}
    </p>
  )
}

export function MensajeAviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700"
    >
      {children}
    </p>
  )
}

export function Esqueleto({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-gray-300/50 ${className}`} />
  )
}

export function EstadoCarga({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-tinta-suave">
      <span className="size-5 animate-spin rounded-full border-2 border-wom-300 border-t-wom-600" />
      {texto}
    </div>
  )
}
