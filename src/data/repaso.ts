// Selectores para armar una sesión de repaso que cruza dominios.
//
// Viven aparte del catálogo (contenido.ts) para separar los datos de las
// consultas sobre ellos, y para no cargar 300+ líneas de contenido en cada
// prueba de esta lógica.
import { DOMINIOS, type Dominio, type Ejercicio } from './contenido'

// Un ejercicio junto al dominio al que pertenece. La sesión de repaso mezcla
// dominios, así que cada pregunta debe cargar su propio dominio para guardar
// bien el intento y la tarjeta SRS.
export type ItemPractica = { dominio: Dominio; ejercicio: Ejercicio }

// Busca un ejercicio por id en todo el catálogo (los ids son globales y
// estables). Resuelve una tarjeta SRS vencida a su ejercicio sin saber de
// antemano en qué dominio vive.
export function buscarEjercicio(ejercicioId: string): ItemPractica | undefined {
  for (const dominio of DOMINIOS) {
    const ejercicio = dominio.ejercicios.find((e) => e.id === ejercicioId)
    if (ejercicio) return { dominio, ejercicio }
  }
  return undefined
}

// Arma la cola de una sesión de repaso a partir de los ids de las tarjetas
// vencidas (ya filtradas y ordenadas por la base): resuelve cada id a su
// ejercicio y dominio, descarta ids que ya no existen en el catálogo (un
// ejercicio pudo eliminarse) y limita el largo de la sesión.
export function construirColaRepaso(
  exerciseIds: string[],
  limite: number
): ItemPractica[] {
  const items: ItemPractica[] = []
  for (const id of exerciseIds) {
    if (items.length >= limite) break
    const encontrado = buscarEjercicio(id)
    if (encontrado) items.push(encontrado)
  }
  return items
}
