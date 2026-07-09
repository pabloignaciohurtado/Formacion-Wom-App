import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react'

export function Boton({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'fantasma'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wom-600'
  const variantes = {
    primario:
      'bg-magenta-500 text-white shadow-lg shadow-magenta-500/25 hover:bg-magenta-600',
    secundario:
      'bg-wom-600 text-white shadow-lg shadow-wom-600/25 hover:bg-wom-700',
    fantasma: 'text-wom-600 hover:bg-wom-50',
  }
  return (
    <button className={`${base} ${variantes[variante]} ${className}`} {...props} />
  )
}

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
      className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 ${className}`}
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
