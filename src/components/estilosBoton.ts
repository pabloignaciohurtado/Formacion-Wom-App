// Clases del botón, aisladas de ui.tsx para no romper el fast refresh
// (react-refresh exige que un archivo de componentes solo exporte componentes).
//
// Existe para que los elementos que deben *verse* como botón sin serlo
// —<Link>, <a>— reutilicen el estilo en vez de copiarlo a mano y
// desincronizarse. Un cambio de marca se hace aquí y en ningún otro lugar.

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold transition-[transform,background-color,box-shadow] duration-180 ease-ui hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wom-600'

const VARIANTES: Record<VarianteBoton, string> = {
  // magenta-600 sobre blanco = 5.31:1 (AA). magenta-500 daba 4.28:1 y no pasaba.
  primario:
    'bg-magenta-600 text-white shadow-lg shadow-magenta-600/40 hover:bg-magenta-700 hover:shadow-xl hover:shadow-magenta-600/45',
  secundario:
    'bg-wom-600 text-white shadow-lg shadow-wom-600/30 hover:bg-wom-700',
  fantasma: 'text-wom-600 hover:bg-wom-50',
}

export function clasesBoton(variante: VarianteBoton = 'primario', extra = '') {
  return `${BASE} ${VARIANTES[variante]} ${extra}`.trim()
}
