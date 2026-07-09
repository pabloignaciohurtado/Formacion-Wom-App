export function MarcaWom({ clara = false }: { clara?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 select-none">
      <span
        className={`text-3xl font-extrabold tracking-tight ${
          clara ? 'text-white' : 'text-wom-600'
        }`}
      >
        WOM
      </span>
      <span
        className={`text-lg font-medium ${
          clara ? 'text-wom-100' : 'text-tinta-suave'
        }`}
      >
        Formación
      </span>
    </div>
  )
}
