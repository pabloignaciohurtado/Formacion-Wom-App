export function MarcaWom({
  clara = false,
  compacta = false,
}: {
  clara?: boolean
  /** Oculta "Formación" en pantallas angostas: en la barra superior móvil
      compite por el espacio con el buscador, el selector de tema y el avatar. */
  compacta?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2 select-none">
      <span
        className={`text-3xl font-black tracking-[-0.03em] ${
          clara ? 'text-white' : 'text-enlace'
        }`}
      >
        WOM
      </span>
      <span
        className={`text-lg font-medium ${compacta ? 'hidden sm:inline' : ''} ${
          clara ? 'text-wom-100' : 'text-tinta-suave'
        }`}
      >
        Formación
      </span>
    </div>
  )
}
