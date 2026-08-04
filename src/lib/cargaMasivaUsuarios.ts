import { supabase } from './supabase'
import { parsearCSV } from './csv'
import type { Rol } from './roles'
import type { Tables } from './database.types'

// Carga masiva de usuarios desde un CSV, complementaria a la creación
// individual de `AdminCrearUsuario.tsx`. Reutiliza el mismo Edge Function
// `admin-crear-usuario` (una invocación por fila) en vez de duplicar su
// lógica de creación de cuenta — este módulo solo parsea, valida y resuelve
// referencias (supervisor_email -> supervisor_id) antes de llamarlo.

export const ENCABEZADOS_PLANTILLA = ['nombre', 'email', 'role', 'supervisor_email']

const ROLES_VALIDOS = new Set<Rol>(['ejecutivo', 'supervisor', 'admin'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Fila cruda, tal como sale del CSV (todavía sin validar).
export interface FilaCargaUsuario {
  nombre: string
  email: string
  role: string
  supervisorEmail: string
}

// Fila ya validada/resuelta: `fila` es el número de fila humano (1 = primera
// fila de datos, sin contar el encabezado), útil para que el admin ubique el
// error en su planilla. `supervisorId` queda resuelto solo si no hay errores
// bloqueantes relacionados; `valida` es la señal que usa la UI y
// `crearUsuariosMasivo` para decidir si se procesa la fila.
export interface FilaValidada {
  fila: number
  nombre: string
  email: string
  role: Rol
  supervisorEmail: string
  supervisorId: string | null
  errores: string[]
  valida: boolean
}

// Parsea el texto de un CSV subido a filas crudas, usando la primera fila
// como encabezado (case-insensitive, sin exigir un orden de columnas
// específico — solo que existan `nombre`, `email`, `role` y
// `supervisor_email`; esta última es opcional).
export function parsearCSVUsuarios(texto: string): FilaCargaUsuario[] {
  const filas = parsearCSV(texto)
  if (filas.length === 0) return []

  const encabezado = filas[0].map((h) => h.trim().toLowerCase())
  const indice = (nombre: string) => encabezado.indexOf(nombre)
  const iNombre = indice('nombre')
  const iEmail = indice('email')
  const iRole = indice('role')
  const iSupervisor = indice('supervisor_email')

  return filas.slice(1).map((f) => ({
    nombre: (f[iNombre] ?? '').trim(),
    email: (f[iEmail] ?? '').trim().toLowerCase(),
    role: (f[iRole] ?? '').trim().toLowerCase(),
    supervisorEmail: (f[iSupervisor] ?? '').trim().toLowerCase(),
  }))
}

// Validación puramente sincrónica (sin red): campos obligatorios, formato de
// email, rol conocido, y emails duplicados dentro del mismo archivo. La
// resolución de supervisor_email -> id (que sí necesita consultar
// `profiles`) se hace aparte, en `resolverSupervisores`, para que esta
// función sea testeable sin mockear supabase.
export function validarFilasCarga(filas: FilaCargaUsuario[]): FilaValidada[] {
  const conteoEmail = new Map<string, number>()
  for (const f of filas) {
    if (!f.email) continue
    conteoEmail.set(f.email, (conteoEmail.get(f.email) ?? 0) + 1)
  }

  return filas.map((f, indice) => {
    const errores: string[] = []

    if (!f.nombre) errores.push('Falta el nombre')
    if (!f.email) {
      errores.push('Falta el email')
    } else if (!EMAIL_RE.test(f.email)) {
      errores.push('Email con formato inválido')
    } else if ((conteoEmail.get(f.email) ?? 0) > 1) {
      errores.push('Email duplicado en el archivo')
    }

    const role = (f.role || 'ejecutivo') as Rol
    if (f.role && !ROLES_VALIDOS.has(role)) {
      errores.push(`Rol desconocido: "${f.role}" (usa ejecutivo, supervisor o admin)`)
    }

    return {
      fila: indice + 1,
      nombre: f.nombre,
      email: f.email,
      role: ROLES_VALIDOS.has(role) ? role : 'ejecutivo',
      supervisorEmail: f.supervisorEmail,
      supervisorId: null,
      errores,
      valida: errores.length === 0,
    }
  })
}

// Resuelve `supervisor_email` -> `supervisor_id` contra la lista de perfiles
// ya existentes (se le pasa la lista ya cargada por la pantalla de admin en
// vez de re-consultar, para no duplicar la misma query). Si un email de
// supervisor no aparece en `perfilesExistentes`, la fila queda con error —
// no se resuelve contra otras filas del mismo archivo (crear una jerarquía
// completa en un solo lote no es un caso soportado por esta primera
// versión).
export function resolverSupervisores(
  filas: FilaValidada[],
  perfilesExistentes: Pick<Tables<'profiles'>, 'id' | 'email'>[]
): FilaValidada[] {
  const porEmail = new Map(perfilesExistentes.map((p) => [p.email.toLowerCase(), p.id]))

  return filas.map((f) => {
    if (!f.supervisorEmail) return f
    const supervisorId = porEmail.get(f.supervisorEmail)
    if (!supervisorId) {
      return {
        ...f,
        errores: [...f.errores, `Supervisor no encontrado: "${f.supervisorEmail}"`],
        valida: false,
      }
    }
    return { ...f, supervisorId }
  })
}

export interface ResultadoFilaCreada {
  fila: number
  email: string
  ok: boolean
  motivo?: string
}

export interface ResumenCargaMasiva {
  exitosos: number
  fallidos: ResultadoFilaCreada[]
}

// Procesa las filas válidas, una invocación del Edge Function por fila (no
// hay una vía de creación masiva en `auth.admin` que acepte batch, así que
// esto es intrínsecamente secuencial). `onProgreso` avisa a la UI para poder
// mostrar "Creando X de Y…" en vez de un spinner ciego durante lo que puede
// ser una carga larga.
export async function crearUsuariosMasivo(
  filas: FilaValidada[],
  onProgreso?: (hechos: number, total: number) => void
): Promise<ResumenCargaMasiva> {
  const aProcesar = filas.filter((f) => f.valida)
  const resultado: ResumenCargaMasiva = { exitosos: 0, fallidos: [] }

  for (let i = 0; i < aProcesar.length; i++) {
    const f = aProcesar[i]
    const { data, error } = await supabase.functions.invoke<{
      id: string
      email: string
      password: string
    }>('admin-crear-usuario', {
      body: {
        nombre: f.nombre,
        email: f.email,
        role: f.role,
        supervisor_id: f.supervisorId,
      },
    })

    if (error || !data) {
      resultado.fallidos.push({
        fila: f.fila,
        email: f.email,
        ok: false,
        motivo: await extraerMensajeError(error),
      })
    } else {
      resultado.exitosos++
    }

    onProgreso?.(i + 1, aProcesar.length)
  }

  return resultado
}

// Mismo problema que en AdminCrearUsuario: supabase-js no siempre expone el
// mensaje de error del cuerpo de la respuesta en `error.message`.
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
