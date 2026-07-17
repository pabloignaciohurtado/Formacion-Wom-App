import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, ExternalLink, Link2, UploadCloud } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { esAdmin } from '../lib/roles'
import {
  ETIQUETAS_TIPO,
  ICONO_TIPO,
  MIME_POR_TIPO,
  TIPOS_ARCHIVO,
  formatoTamano,
  inferirTipoPorMime,
  rutaAlmacenamiento,
  validarArchivo,
  type Material,
  type TipoMaterial,
} from '../lib/materiales'
import { Boton, Campo, EstadoCarga, MensajeError, Tarjeta } from './ui'

const ACEPTA_ARCHIVO = TIPOS_ARCHIVO.flatMap((t) => MIME_POR_TIPO[t]).join(',')

type Modo = 'archivo' | 'enlace'

// Biblioteca de materiales de capacitación: se suben archivos (PDF, Word,
// PowerPoint/Excel, imagen — hasta 20 MB) o se referencian por enlace externo
// (video, u otro recurso), quedando disponibles para adjuntar a cualquier
// actividad obligatoria desde `AdminActividades`. La usan el admin y los
// supervisores (mismo par de pantallas que las actividades, §8 de
// DOCUMENTACION.md) — la RLS decide qué ve y qué puede archivar cada quien.
export function AdminMateriales() {
  const { user, perfil } = useAuth()
  const soyAdmin = esAdmin(perfil?.role)
  const idArchivo = useId()

  const [materiales, setMateriales] = useState<Material[] | null>(null)
  const [modo, setModo] = useState<Modo>('archivo')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [urlEnlace, setUrlEnlace] = useState('')
  const [tipoEnlace, setTipoEnlace] = useState<'video' | 'enlace'>('video')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('materiales')
      .select('*')
      .order('creado_en', { ascending: false })
    setMateriales(data ?? [])
  }, [user])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const propios = useMemo(
    () => new Set((materiales ?? []).filter((m) => m.creado_por === user?.id).map((m) => m.id)),
    [materiales, user?.id]
  )
  const puedeGestionar = (m: Material) => soyAdmin || propios.has(m.id)

  const limpiarFormulario = () => {
    setTitulo('')
    setDescripcion('')
    setArchivo(null)
    setUrlEnlace('')
    setTipoEnlace('video')
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  const crear = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setError(null)

    if (modo === 'archivo') {
      if (!archivo) {
        setError('Elige un archivo para subir.')
        return
      }
      const validacion = validarArchivo(archivo)
      if (!validacion.ok) {
        setError(validacion.error)
        return
      }
      const tipo = inferirTipoPorMime(archivo.type)
      if (!tipo) {
        setError('No se reconoce el tipo del archivo.')
        return
      }

      setSubiendo(true)
      const path = rutaAlmacenamiento(crypto.randomUUID(), archivo.name)
      const { error: subidaError } = await supabase.storage
        .from('materiales')
        .upload(path, archivo, { contentType: archivo.type })
      if (subidaError) {
        setSubiendo(false)
        setError(subidaError.message)
        return
      }

      const { error: insertError } = await supabase.from('materiales').insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        storage_path: path,
        nombre_archivo: archivo.name,
        tamano_bytes: archivo.size,
        creado_por: user.id,
      })
      if (insertError) {
        // No dejar el archivo huérfano en Storage sin fila que lo referencie.
        await supabase.storage.from('materiales').remove([path])
        setSubiendo(false)
        setError(insertError.message)
        return
      }
    } else {
      if (!urlEnlace.trim()) {
        setError('Pega el enlace del material.')
        return
      }
      setSubiendo(true)
      const { error: insertError } = await supabase.from('materiales').insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo: tipoEnlace,
        url: urlEnlace.trim(),
        creado_por: user.id,
      })
      if (insertError) {
        setSubiendo(false)
        setError(insertError.message)
        return
      }
    }

    setSubiendo(false)
    limpiarFormulario()
    void cargar()
  }

  const archivar = async (material: Material) => {
    setError(null)
    const { error: updateError } = await supabase
      .from('materiales')
      .update({ activo: false })
      .eq('id', material.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    void cargar()
  }

  const abrir = async (material: Material) => {
    if (material.storage_path) {
      const { data, error: urlError } = await supabase.storage
        .from('materiales')
        .createSignedUrl(material.storage_path, 60)
      if (urlError || !data) {
        setError(urlError?.message ?? 'No se pudo generar el enlace de descarga.')
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } else if (material.url) {
      window.open(material.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (materiales === null) {
    return (
      <>
        <h2 className="mt-8 text-lg font-bold">Biblioteca de materiales</h2>
        <EstadoCarga texto="Cargando materiales…" />
      </>
    )
  }

  const activos = materiales.filter((m) => m.activo)
  const archivados = materiales.filter((m) => !m.activo)

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Biblioteca de materiales</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Sube documentos o agrega enlaces de video y los podrás adjuntar a
        cualquier actividad obligatoria al crearla.
      </p>
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      <Tarjeta className="mt-3">
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Título"
              id="mat-titulo"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Descripción (opcional)"
              id="mat-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold text-tinta">Origen</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(
                [
                  ['archivo', 'Subir archivo'],
                  ['enlace', 'Enlace externo (video, etc.)'],
                ] as const
              ).map(([m, etiqueta]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  aria-pressed={modo === m}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    modo === m
                      ? 'bg-wom-600 text-white'
                      : 'bg-niebla text-tinta-suave hover:text-tinta'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </fieldset>

          {modo === 'archivo' ? (
            <div className="sm:col-span-2">
              <label htmlFor={idArchivo} className="block text-sm font-semibold text-tinta">
                Archivo (PDF, Word, PowerPoint, Excel o imagen — máx. 20 MB)
              </label>
              <div className="mt-1.5">
                <input
                  ref={inputArchivoRef}
                  id={idArchivo}
                  type="file"
                  accept={ACEPTA_ARCHIVO}
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  className="block w-full rounded-xl border border-gray-200 bg-white text-sm text-tinta-suave file:mr-4 file:rounded-lg file:border-0 file:bg-wom-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-wom-700"
                />
              </div>
              {archivo && (
                <p className="mt-1.5 text-xs text-tinta-suave">
                  {archivo.name} · {formatoTamano(archivo.size)}
                </p>
              )}
            </div>
          ) : (
            <>
              <Campo
                etiqueta="Enlace"
                id="mat-url"
                type="url"
                placeholder="https://…"
                value={urlEnlace}
                onChange={(e) => setUrlEnlace(e.target.value)}
              />
              <div>
                <label htmlFor="mat-tipo-enlace" className="block text-sm font-semibold text-tinta">
                  Tipo
                </label>
                <select
                  id="mat-tipo-enlace"
                  value={tipoEnlace}
                  onChange={(e) => setTipoEnlace(e.target.value as 'video' | 'enlace')}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-tinta transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  <option value="video">Video</option>
                  <option value="enlace">Otro enlace</option>
                </select>
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <Boton
              type="submit"
              disabled={
                subiendo ||
                !titulo.trim() ||
                (modo === 'archivo' ? !archivo : !urlEnlace.trim())
              }
            >
              <UploadCloud className="size-5" />
              {subiendo ? 'Guardando…' : 'Agregar a la biblioteca'}
            </Boton>
          </div>
        </form>
      </Tarjeta>

      {activos.length === 0 ? (
        <p className="mt-3 text-tinta-suave">Aún no hay materiales en la biblioteca.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {activos.map((m) => {
            const Icono = ICONO_TIPO[(m.tipo as TipoMaterial) ?? 'enlace'] ?? Link2
            return (
              <li key={m.id}>
                <Tarjeta className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-wom-600/10 text-wom-600">
                    <Icono className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.titulo}</p>
                    <p className="text-xs text-tinta-suave">
                      {ETIQUETAS_TIPO[(m.tipo as TipoMaterial) ?? 'enlace']}
                      {m.tamano_bytes ? ` · ${formatoTamano(m.tamano_bytes)}` : ''}
                    </p>
                    {m.descripcion && (
                      <p className="mt-1 text-sm text-tinta-suave">{m.descripcion}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void abrir(m)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-wom-600 hover:underline"
                      >
                        Ver <ExternalLink className="size-3.5" />
                      </button>
                      {puedeGestionar(m) && (
                        <button
                          type="button"
                          onClick={() => void archivar(m)}
                          className="inline-flex items-center gap-1 text-sm text-tinta-suave transition-colors hover:text-red-500"
                          aria-label={`Archivar ${m.titulo}`}
                          title="Archivar material"
                        >
                          <Archive className="size-3.5" /> Archivar
                        </button>
                      )}
                    </div>
                  </div>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}

      {archivados.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-tinta-suave">
            Archivados ({archivados.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {archivados.map((m) => (
              <li key={m.id} className="text-sm text-tinta-suave opacity-70">
                {m.titulo}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
