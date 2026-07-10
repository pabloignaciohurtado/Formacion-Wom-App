// Vocabulario de la operación, en un solo sitio.
//
// Durante meses `relator` significó "quien aprende", que es justo lo contrario
// de lo que la palabra quiere decir en la operación: el relator es el
// supervisor que asigna formación. Los tres roles reales son:
//
//   ejecutivo   — practica. Es quien atiende al cliente.
//   supervisor  — practica Y asigna módulos obligatorios a su equipo.
//   admin       — gestiona la plataforma.
//
// El rol es aditivo: un supervisor también aprende.
export type Rol = 'admin' | 'supervisor' | 'ejecutivo'

const ETIQUETAS: Record<Rol, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  ejecutivo: 'Ejecutivo',
}

// El rol llega de la base como `string`. Ante un valor desconocido devolvemos
// el rol de menor privilegio, nunca uno que sugiera permisos que no existen.
export function etiquetaRol(role: string | null | undefined): string {
  return ETIQUETAS[(role ?? '') as Rol] ?? ETIQUETAS.ejecutivo
}

export function esAdmin(role: string | null | undefined): boolean {
  return role === 'admin'
}

// Un administrador puede todo lo que puede un supervisor. Coincide con la
// función SQL is_supervisor(), que autoriza en la base.
export function puedeAsignar(role: string | null | undefined): boolean {
  return role === 'supervisor' || role === 'admin'
}

// Quién puede tener un jefe asignado: ejecutivos y supervisores. Un
// supervisor también reporta (a otro supervisor o a un admin); solo el admin
// gestiona la plataforma y no responde a nadie dentro de ella.
export function puedeTenerSupervisor(role: string | null | undefined): boolean {
  return role === 'ejecutivo' || role === 'supervisor'
}
