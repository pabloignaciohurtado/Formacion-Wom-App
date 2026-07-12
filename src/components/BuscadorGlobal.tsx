import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { buscarDominios } from '../lib/busqueda'

// Buscador global (paleta de comandos) accesible desde el encabezado en
// cualquier pantalla. Se abre con el disparador, con "/" o con ⌘/Ctrl+K;
// al elegir un dominio lleva directo a practicarlo.
export function BuscadorGlobal() {
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const resultados = buscarDominios(q).slice(0, 8)

  // Atajos de teclado: "/" o ⌘/Ctrl+K abren; Escape cierra.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const escribiendo =
        !!t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      if (
        !abierto &&
        ((e.key === '/' && !escribiendo) ||
          ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))
      ) {
        e.preventDefault()
        setAbierto(true)
      } else if (abierto && e.key === 'Escape') {
        setAbierto(false)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto])

  useEffect(() => {
    if (abierto) {
      inputRef.current?.focus()
    } else {
      setQ('')
      setSel(0)
    }
  }, [abierto])

  useEffect(() => {
    setSel(0)
  }, [q])

  const ir = (id: string) => {
    setAbierto(false)
    navigate(`/ejercicios/${id}`)
  }

  const alTeclearInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(s + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && resultados[sel]) {
      e.preventDefault()
      ir(resultados[sel].dominio.id)
    }
  }

  return (
    <>
      {/* Disparador móvil: solo ícono */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Buscar"
        className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-niebla sm:hidden"
      >
        <Search className="size-5" />
      </button>

      {/* Disparador escritorio: campo simulado */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="hidden items-center gap-2 rounded-full bg-niebla px-3.5 py-2 text-sm text-tinta-suave transition-colors hover:bg-wom-50 sm:flex"
      >
        <Search className="size-4" />
        <span>Buscar dominio o tema…</span>
        <kbd className="ml-1 rounded border border-black/10 bg-white px-1.5 text-xs font-semibold text-tinta-suave">
          /
        </kbd>
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Buscar dominios o temas"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center gap-3 border-b border-black/5 px-4">
              <Search className="size-5 shrink-0 text-tinta-suave" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={alTeclearInput}
                placeholder="Buscar un dominio o tema (roaming, eSIM, Club WOM…)"
                aria-label="Buscar dominios o temas"
                className="w-full bg-transparent py-4 text-base outline-none placeholder:text-tinta-suave/70"
              />
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="grid size-7 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-niebla"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {q.trim() === '' ? (
                <p className="px-3 py-6 text-center text-sm text-tinta-suave">
                  Escribe para buscar entre los dominios de formación.
                </p>
              ) : resultados.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-tinta-suave">
                  Sin resultados para “{q.trim()}”.
                </p>
              ) : (
                <ul>
                  {resultados.map((r, i) => (
                    <li key={r.dominio.id}>
                      <button
                        type="button"
                        onClick={() => ir(r.dominio.id)}
                        onMouseEnter={() => setSel(i)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          i === sel ? 'bg-wom-50' : 'hover:bg-niebla'
                        }`}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-wom-600 to-magenta-500 text-lg">
                          {r.dominio.icono}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {r.dominio.titulo}
                          </span>
                          <span className="block truncate text-xs text-tinta-suave">
                            {r.categoria} · {r.dominio.ejercicios.length}{' '}
                            ejercicios
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-wom-600">
                          Practicar
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
