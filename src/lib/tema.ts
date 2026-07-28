// Tema claro/oscuro — un único lugar donde vive la decisión.
//
// Tres opciones, no dos: "sistema" es un estado propio, no la ausencia de
// elección. Con un interruptor binario, quien lo tocaba una vez quedaba
// anclado para siempre a ese tema y ya no podía volver a seguir la
// preferencia del sistema operativo (que cambia sola de día a noche).
//
// La clase `.dark` en <html> es lo único que mira el CSS: `index.css`
// redefine los tokens de color bajo `.dark`, así que ningún componente
// necesita lógica propia de tema.

export type Tema = 'claro' | 'oscuro' | 'sistema'

const CLAVE = 'tema'
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)'

// Color de la barra del navegador en móvil (PWA). Debe coincidir con
// --color-niebla de cada tema en index.css, que es el fondo del <body>.
const THEME_COLOR: Record<'claro' | 'oscuro', string> = {
  claro: '#eff1f3',
  oscuro: '#120a1e',
}

function esTema(valor: string | null): valor is Tema {
  return valor === 'claro' || valor === 'oscuro' || valor === 'sistema'
}

/** Lee la preferencia guardada. Sin nada guardado, se sigue al sistema. */
export function leerTema(): Tema {
  try {
    const guardado = window.localStorage.getItem(CLAVE)
    return esTema(guardado) ? guardado : 'sistema'
  } catch {
    // Safari en modo privado puede lanzar al tocar localStorage.
    return 'sistema'
  }
}

/** Traduce la preferencia al tema que realmente se pinta. */
export function resolverTema(tema: Tema): 'claro' | 'oscuro' {
  if (tema !== 'sistema') return tema
  return window.matchMedia(CONSULTA_OSCURO).matches ? 'oscuro' : 'claro'
}

/**
 * Aplica el tema al documento. Se llama en el arranque (antes de React, para
 * que no haya destello de tema claro) y en cada cambio del selector.
 */
export function aplicarTema(tema: Tema): void {
  const efectivo = resolverTema(tema)
  const raiz = document.documentElement

  raiz.classList.toggle('dark', efectivo === 'oscuro')
  // color-scheme hace que el navegador pinte oscuros los controles nativos
  // (scrollbars, <select>, autocompletado); el CSS solo no llega ahí.
  raiz.style.colorScheme = efectivo === 'oscuro' ? 'dark' : 'light'

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[efectivo])
}

/** Guarda la preferencia y la aplica. */
export function guardarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CLAVE, tema)
  } catch {
    // Sin persistencia igual se aplica: vale para esta sesión.
  }
  aplicarTema(tema)
}

/**
 * Reacciona a los cambios del sistema mientras la preferencia sea "sistema".
 * Devuelve la función para desuscribirse.
 */
export function escucharSistema(alCambiar: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_OSCURO)
  consulta.addEventListener('change', alCambiar)
  return () => consulta.removeEventListener('change', alCambiar)
}
