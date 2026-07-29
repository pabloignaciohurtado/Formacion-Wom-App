import { useRef, useState, type ChangeEvent } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import {
  crearUsuariosMasivo,
  parsearCSVUsuarios,
  resolverSupervisores,
  validarFilasCarga,
  ENCABEZADOS_PLANTILLA,
  type FilaValidada,
  type ResumenCargaMasiva,
} from '../lib/cargaMasivaUsuarios'
import { descargarCSV, generarCSV } from '../lib/csv'
import { etiquetaRol } from '../lib/roles'
import { Boton, MensajeError } from './ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>

// Alternativa a `AdminCrearUsuario` para cuando hay que dar de alta a
// muchas personas de una vez (ej. la incorporación de un nuevo equipo):
// sube un CSV, se previsualiza con validación por fila y solo entonces se
// procesa — una invocación del mismo Edge Function `admin-crear-usuario`
// por fila válida, con progreso visible porque puede tardar (no hay una vía
// de creación por lote en `auth.admin`).
export function AdminCargaMasivaUsuarios({
  usuarios,
  onCreados,
}: {
  usuarios: Perfil[]
  onCreados: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [filas, setFilas] = useState<FilaValidada[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null)
  const [resumen, setResumen] = useState<ResumenCargaMasiva | null>(null)

  const reiniciar = () => {
    setFilas(null)
    setError(null)
    setResumen(null)
    setProgreso(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const descargarPlantilla = () => {
    const csv = generarCSV(ENCABEZADOS_PLANTILLA, [
      ['Sole Rojas', 'sole.rojas@wom.cl', 'ejecutivo', ''],
      ['Erik Soto', 'erik.soto@wom.cl', 'supervisor', 'sole.rojas@wom.cl'],
    ])
    descargarCSV('plantilla-carga-usuarios.csv', csv)
  }

  const handleArchivo = async (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]
    if (!archivo) return
    setError(null)
    setResumen(null)
    try {
      const texto = await archivo.text()
      const crudas = parsearCSVUsuarios(texto)
      if (crudas.length === 0) {
        setError('El archivo no tiene filas de datos (o solo trae el encabezado).')
        setFilas(null)
        return
      }
      const validadas = validarFilasCarga(crudas)
      const resueltas = resolverSupervisores(
        validadas,
        usuarios.map((u) => ({ id: u.id, email: u.email }))
      )
      setFilas(resueltas)
    } catch {
      setError('No se pudo leer el archivo. ¿Es un CSV válido?')
      setFilas(null)
    }
  }

  const validas = filas?.filter((f) => f.valida) ?? []
  const invalidas = filas?.filter((f) => !f.valida) ?? []

  const confirmar = async () => {
    if (validas.length === 0) return
    setProcesando(true)
    setProgreso({ hechos: 0, total: validas.length })
    const resultado = await crearUsuariosMasivo(validas, (hechos, total) =>
      setProgreso({ hechos, total })
    )
    setProcesando(false)
    setResumen(resultado)
    setFilas(null)
    if (inputRef.current) inputRef.current.value = ''
    if (resultado.exitosos > 0) onCreados()
  }

  return (
    <div className="mt-3">
      {!abierto ? (
        <Boton
          type="button"
          variante="secundario"
          className="!px-4 !py-2 text-sm"
          onClick={() => setAbierto(true)}
        >
          <Upload className="size-4" />
          Carga masiva
        </Boton>
      ) : (
        <div className="rounded-[20px] bg-superficie p-6 shadow-[0_10px_30px_-14px_rgba(39,0,70,0.28)] ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center justify-between">
            <p className="font-bold">Carga masiva de usuarios</p>
            <Boton
              type="button"
              variante="fantasma"
              className="!px-2 !py-1 text-sm"
              onClick={() => {
                setAbierto(false)
                reiniciar()
              }}
            >
              Cerrar
            </Boton>
          </div>

          <p className="mt-2 text-sm text-tinta-suave">
            Sube un CSV con las columnas <code>{ENCABEZADOS_PLANTILLA.join(', ')}</code>.{' '}
            <code>supervisor_email</code> es opcional y debe ser el correo de un usuario ya
            existente en la plataforma.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Boton
              type="button"
              variante="fantasma"
              className="!px-3 !py-1.5 text-sm"
              onClick={descargarPlantilla}
            >
              <FileSpreadsheet className="size-4" />
              Descargar plantilla CSV
            </Boton>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-tinta hover:bg-wom-50">
              <Upload className="size-4" />
              Elegir archivo CSV
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => void handleArchivo(e)}
              />
            </label>
          </div>

          {error && (
            <div className="mt-3">
              <MensajeError>{error}</MensajeError>
            </div>
          )}

          {filas && filas.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-tinta">
                {validas.length} fila(s) lista(s) para crear
                {invalidas.length > 0 && `, ${invalidas.length} con errores`}.
              </p>
              <div className="mt-2 max-h-80 overflow-auto rounded-xl ring-1 ring-black/5">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-niebla bg-gray-50 text-left text-xs uppercase tracking-wide text-tinta-suave dark:bg-white/5">
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Rol</th>
                      <th className="px-3 py-2">Supervisor</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr
                        key={f.fila}
                        className={`border-b border-niebla last:border-0 ${
                          f.valida ? '' : 'bg-red-50/60'
                        }`}
                      >
                        <td className="px-3 py-2 text-tinta-suave">{f.fila}</td>
                        <td className="px-3 py-2">{f.nombre || '—'}</td>
                        <td className="px-3 py-2">{f.email || '—'}</td>
                        <td className="px-3 py-2">{etiquetaRol(f.role)}</td>
                        <td className="px-3 py-2 text-tinta-suave">
                          {f.supervisorEmail || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {f.valida ? (
                            <span className="text-xs font-semibold text-exito-texto">Ok</span>
                          ) : (
                            <span className="text-xs font-medium text-red-700">
                              {f.errores.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Boton
                  type="button"
                  disabled={procesando || validas.length === 0}
                  onClick={() => void confirmar()}
                >
                  {procesando
                    ? `Creando ${progreso?.hechos ?? 0} de ${progreso?.total ?? validas.length}…`
                    : `Crear ${validas.length} usuario(s)`}
                </Boton>
                <Boton
                  type="button"
                  variante="fantasma"
                  disabled={procesando}
                  onClick={reiniciar}
                >
                  Cancelar
                </Boton>
              </div>
            </>
          )}

          {resumen && (
            <div className="mt-4 rounded-xl bg-superficie p-4 ring-1 ring-black/5">
              <p className="font-semibold text-exito-texto">
                {resumen.exitosos} usuario(s) creado(s) correctamente.
              </p>
              {resumen.fallidos.length > 0 && (
                <>
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    {resumen.fallidos.length} fila(s) fallaron:
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-tinta-suave">
                    {resumen.fallidos.map((f) => (
                      <li key={f.fila}>
                        Fila {f.fila} ({f.email}): {f.motivo}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-tinta-suave">
                    Corrige esas filas en tu planilla y vuelve a subir solo esas.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
