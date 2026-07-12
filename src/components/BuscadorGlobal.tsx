import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { buscarDominios, buscarEjercicios } from '../lib/busqueda'
import type { Dominio, Ejercicio } from '../data/contenido'

type Entrada =
  | { tipo: 'dominio'; dominio: Dominio; categoria: string }
  | { tipo: 'ejercicio'; ejercicio: Ejercicio; dominio: Dominio }

// Buscador global (paleta de comandos) accesible desde el encabezado en
// cualquier pantalla. Se abre con el disparador, con "/" o con ⌘/Ctrl+K.
// Encuentra dominios y ejercicios puntuales; al elegir cualquiera lleva a
// practicar el dominio correspondiente.
export function BuscadorGlobal() {
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const dominios = buscarDominios(q).slice(0, 5)
  const ejercicios = buscarEjercicios(q).slice(0, 6)
  const entradas: Entrada[] = [
    ...dominios.map(
      (r): Entrada => ({
        tipo: 'dominio',
        dominio: r.dominio,
        categoria: r.categoria,
      })
    ),
    ...ejercicios.map(
      (r): Entrada => ({
        tipo: 'ejercicio',
        ejercicio: r.ejercicio,
        dominio: r.dominio,
      })
    ),
  ]

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
      setSel((s) => Math.min(s + 1, entradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && entradas[sel]) {
      e.preventDefault()
      ir(entradas[sel].dominio.id)
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
                placeholder="Buscar un dominio o tema (roaming, eSIM, VoLTE…)"
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
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {q.trim() === '' ? (
                <p className="px-3 py-6 text-center text-sm text-tinta-suave">
                  Escribe para buscar entre dominios y ejercicios.
                </p>
              ) : entradas.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-tinta-suave">
                  Sin resultados para “{q.trim()}”.
                </p>
              ) : (
                <ul>
                  {entradas.map((e, i) => {
                    const encabezado =
                      i === 0 || entradas[i - 1].tipo !== e.tipo ? (
                        <li
                          className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-tinta-suave/70"
                          aria-hidden="true"
                        >
                          {e.tipo === 'dominio' ? 'Dominios' : 'Ejercicios'}
                        </li>
                      ) : null
                    const clave =
                      e.tipo === 'dominio'
                        ? `d-${e.dominio.id}`
                        : `e-${e.dominio.id}-${e.ejercicio.id}`
                    return (
                      <Fragment key={clave}>
                        {encabezado}
                        <li>
                          <button
                            type="button"
                            onClick={() => ir(e.dominio.id)}
                            onMouseEnter={() => setSel(i)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                              i === sel ? 'bg-wom-50' : 'hover:bg-niebla'
                            }`}
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-wom-600 to-magenta-500 text-lg">
                              {e.dominio.icono}
                            </span>
                            {e.tipo === 'dominio' ? (
                              <>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-semibold">
                                    {e.dominio.titulo}
                                  </span>
                                  <span className="block truncate text-xs text-tinta-suave">
                                    {e.categoria} ·{' '}
                                    {e.dominio.ejercicios.length} ejercicios
                                  </span>
                                </span>
                                <span className="shrink-0 text-xs font-semibold text-wom-600">
                                  Practicar
                                </span>
                              </>
                            ) : (
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">
                                  {e.ejercicio.enunciado}
                                </span>
                                <span className="block truncate text-xs text-tinta-suave">
                                  en {e.dominio.titulo}
                                </span>
                              </span>
                            )}
                          </button>
                        </li>
                      </Fragment>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
