import { useId, useState, type FormEvent } from 'react'
import { Check, Copy, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { etiquetaRol, puedeAsignar, puedeTenerSupervisor, type Rol } from '../lib/roles'
import { Boton, Campo, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Perfil = Tables<'profiles'>

interface Credenciales {
  email: string
  password: string
}

// Da de alta una cuenta directamente desde Administración, sin pasar por el
// autorregistro (/registro) ni la activación manual: quien la crea aquí ya
// decidió conscientemente incorporar a esa persona, así que queda activa de
// inmediato con el rol y el supervisor elegidos.
//
// La creación real ocurre en el Edge Function `admin-crear-usuario`, que usa
// la clave service_role (nunca expuesta al cliente) para llamar a
// auth.admin.createUser y luego ajustar la fila en `profiles`. Este
// componente solo arma el formulario y muestra la contraseña generada una
// única vez, ya que nadie puede volver a leerla después.
export function AdminCrearUsuario({
  usuarios,
  onCreado,
}: {
  usuarios: Perfil[]
  onCreado: () => void
}) {
  const idBase = useId()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('ejecutivo')
  const [supervisorId, setSupervisorId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null)
  const [copiado, setCopiado] = useState(false)

  const limpiarFormulario = () => {
    setNombre('')
    setEmail('')
    setPassword('')
    setRol('ejecutivo')
    setSupervisorId('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setEnviando(true)

    const { data, error: invokeError } = await supabase.functions.invoke<{
      id: string
      email: string
      password: string
    }>('admin-crear-usuario', {
      body: {
        nombre: nombre.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        role: rol,
        supervisor_id: puedeTenerSupervisor(rol) ? supervisorId || null : null,
      },
    })

    setEnviando(false)
    if (invokeError || !data) {
      setError(await extraerMensajeError(invokeError))
      return
    }

    setCredenciales({ email: data.email, password: data.password })
    setCopiado(false)
    limpiarFormulario()
    setAbierto(false)
    onCreado()
  }

  const copiarCredenciales = async () => {
    if (!credenciales) return
    const texto = `Correo: ${credenciales.email}\nContraseña: ${credenciales.password}`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      // Sin permiso de portapapeles: el texto sigue visible para copiar a mano.
    }
  }

  return (
    <div className="mt-3">
      {credenciales && (
        <Tarjeta className="mb-4 border-2 border-exito/30 bg-exito/5">
          <p className="font-bold text-exito-texto">Usuario creado</p>
          <p className="mt-1 text-sm text-tinta-suave">
            Comparte estas credenciales por un canal seguro — la contraseña no
            vuelve a mostrarse. Quien la reciba puede cambiarla desde su
            cuenta cuando quiera.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 font-mono text-sm ring-1 ring-black/5">
            <span>
              <strong>Correo:</strong> {credenciales.email}
            </span>
            <span>
              <strong>Contraseña:</strong> {credenciales.password}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <Boton
              type="button"
              variante="secundario"
              className="!px-3 !py-1.5 text-sm"
              onClick={() => void copiarCredenciales()}
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Boton>
            <Boton
              type="button"
              variante="fantasma"
              className="!px-3 !py-1.5 text-sm"
              onClick={() => setCredenciales(null)}
            >
              Cerrar
            </Boton>
          </div>
        </Tarjeta>
      )}

      {!abierto ? (
        <Boton
          type="button"
          variante="secundario"
          className="!px-4 !py-2 text-sm"
          onClick={() => setAbierto(true)}
        >
          <UserPlus className="size-4" />
          Nuevo usuario
        </Boton>
      ) : (
        <Tarjeta>
          <div className="flex items-center justify-between">
            <p className="font-bold">Crear usuario</p>
            <Boton
              type="button"
              variante="fantasma"
              className="!px-2 !py-1 text-sm"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Boton>
          </div>

          {error && (
            <div className="mt-3">
              <MensajeError>{error}</MensajeError>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Nombre"
              id={`${idBase}-nombre`}
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <Campo
              etiqueta="Correo electrónico"
              id={`${idBase}-email`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Campo
              etiqueta="Contraseña (opcional — si se deja vacía, se genera una)"
              id={`${idBase}-password`}
              type="text"
              minLength={8}
              placeholder="Se genera automáticamente"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="space-y-1.5">
              <label
                htmlFor={`${idBase}-rol`}
                className="block text-sm font-semibold text-tinta"
              >
                Rol
              </label>
              <select
                id={`${idBase}-rol`}
                value={rol}
                onChange={(e) => setRol(e.target.value as Rol)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
              >
                <option value="ejecutivo">{etiquetaRol('ejecutivo')}</option>
                <option value="supervisor">{etiquetaRol('supervisor')}</option>
                <option value="admin">{etiquetaRol('admin')}</option>
              </select>
            </div>

            {puedeTenerSupervisor(rol) && (
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor={`${idBase}-supervisor`}
                  className="block text-sm font-semibold text-tinta"
                >
                  Supervisor
                </label>
                <select
                  id={`${idBase}-supervisor`}
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  <option value="">Sin supervisor</option>
                  {usuarios
                    .filter((u) => puedeAsignar(u.role))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <Boton type="submit" disabled={enviando || !nombre.trim() || !email.trim()}>
                {enviando ? 'Creando…' : 'Crear usuario'}
              </Boton>
            </div>
          </form>
        </Tarjeta>
      )}
    </div>
  )
}

// supabase-js no siempre expone el mensaje de error del cuerpo de la
// respuesta en `error.message` para errores 4xx/5xx de un Edge Function; el
// texto real viaja en `error.context`, que es la Response cruda.
async function extraerMensajeError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const contexto = (error as { context?: Response }).context
    if (contexto) {
      try {
        const cuerpo = await contexto.json()
        if (cuerpo && typeof cuerpo.error === 'string') return cuerpo.error
      } catch {
        // sin cuerpo JSON legible: cae al mensaje genérico de abajo
      }
    }
  }
  return error instanceof Error ? error.message : 'No se pudo crear el usuario'
}
