// Cola de intentos hechos sin conexión: se guardan en localStorage y se
// sincronizan al volver la red. Alcance honesto: cubre la práctica; el
// ranking y las actividades requieren conexión.
import { supabase } from './supabase'
import type { TablesInsert } from './database.types'

export interface PendienteOffline {
  intento: TablesInsert<'attempts'>
  tarjeta: TablesInsert<'srs_cards'>
}

const CLAVE = 'cola-offline-v1'

// La UI escucha este evento para reflejar la cola sin hacer polling.
export const EVENTO_COLA = 'cola-offline-cambio'

function leer(): PendienteOffline[] {
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE) ?? '[]')
  } catch {
    return []
  }
}

function escribir(cola: PendienteOffline[]) {
  window.localStorage.setItem(CLAVE, JSON.stringify(cola))
  window.dispatchEvent(new Event(EVENTO_COLA))
}

export function encolarOffline(pendiente: PendienteOffline) {
  const cola = leer()
  cola.push(pendiente)
  escribir(cola)
}

export function pendientesOffline(): number {
  return leer().length
}

// Reenvía la cola en orden; se detiene ante el primer error para reintentar
// después. Devuelve cuántos se sincronizaron.
export async function sincronizarOffline(): Promise<number> {
  const cola = leer()
  if (cola.length === 0) return 0
  let enviados = 0
  for (const p of cola) {
    const [a, c] = await Promise.all([
      supabase
        .from('attempts')
        .upsert(p.intento, { onConflict: 'id', ignoreDuplicates: true }),
      supabase.from('srs_cards').upsert(p.tarjeta),
    ])
    if (a.error || c.error) break
    enviados++
  }
  escribir(cola.slice(enviados))
  return enviados
}
