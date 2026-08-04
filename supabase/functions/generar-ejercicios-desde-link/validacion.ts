// Lógica pura de validación de URL (guardia básica contra SSRF) y de
// extracción/recorte de texto. Sin imports de Deno ni de npm: así se puede
// testear con Vitest/Node exactamente igual que el resto del repo, sin
// levantar la Edge Function.
//
// Limitación conocida (documentada también en la descripción del PR): esto
// NO resuelve el hostname por DNS. Un dominio público que resuelva a una IP
// privada (DNS rebinding) no queda cubierto — hacerlo bien requeriría una
// resolución DNS explícita desde la función, fuera del alcance de esta
// entrega. Lo que sí cubre: bloquea por nombre/IP literal los blancos
// internos más obvios (localhost, loopback, RFC1918, link-local/metadata) y
// limita el esquema y el puerto.

export interface ResultadoValidacionUrl {
  valida: boolean
  error?: string
  url?: URL
}

const HOSTS_BLOQUEADOS = new Set(['localhost', '0.0.0.0', '::1', '[::1]'])

// user@localhost, IPs con notación octal/hex, etc. no se cubren: es una
// guardia básica sobre los casos literales más comunes, no un parser IP
// exhaustivo.
const PATRONES_IP_PRIVADA = [
  /^10\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\.(\d{1,3})\.(\d{1,3})$/, // 172.16.0.0/12
  /^192\.168\.(\d{1,3})\.(\d{1,3})$/, // 192.168.0.0/16
  /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, // 127.0.0.0/8 (loopback)
  /^169\.254\.(\d{1,3})\.(\d{1,3})$/, // link-local, incluye metadata cloud (169.254.169.254)
]

// Puertos no estándar quedan bloqueados: reduce la superficie de acceso a
// servicios internos (paneles de administración, bases de datos, etc.) que
// suelen exponerse en puertos distintos de 80/443.
const PUERTOS_PERMITIDOS = new Set(['', '80', '443'])

export function validarUrl(entrada: string): ResultadoValidacionUrl {
  const cruda = (entrada ?? '').trim()
  if (!cruda) {
    return { valida: false, error: 'Ingresa un link para poder extraer su contenido.' }
  }

  let url: URL
  try {
    url = new URL(cruda)
  } catch {
    return { valida: false, error: 'El link no es una URL válida.' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valida: false, error: 'Solo se admiten links http:// o https://.' }
  }

  const host = url.hostname.toLowerCase()
  if (HOSTS_BLOQUEADOS.has(host)) {
    return { valida: false, error: 'Ese destino no está permitido.' }
  }

  if (PATRONES_IP_PRIVADA.some((patron) => patron.test(host))) {
    return { valida: false, error: 'Ese destino no está permitido.' }
  }

  if (!PUERTOS_PERMITIDOS.has(url.port)) {
    return { valida: false, error: 'Solo se admiten links en el puerto 80 o 443.' }
  }

  return { valida: true, url }
}

// Extracción de texto legible desde HTML: sin dependencias externas
// (mismo criterio que `markdown.ts` propio del catálogo). Quita
// script/style/nav/header/footer/aside/svg/noscript completos, luego el
// resto de etiquetas, decodifica las entidades más comunes y colapsa
// espacios en blanco. No es tan preciso como Readability, pero para
// instructivos, minutas y páginas de ayuda evita razonablemente bien el
// ruido de navegación/publicidad sin traer un parser DOM completo.
const ETIQUETAS_A_DESCARTAR = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  'noscript',
  'svg',
  'form',
  'iframe',
]

const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&aacute;': 'á',
  '&eacute;': 'é',
  '&iacute;': 'í',
  '&oacute;': 'ó',
  '&uacute;': 'ú',
  '&ntilde;': 'ñ',
  '&Aacute;': 'Á',
  '&Eacute;': 'É',
  '&Iacute;': 'Í',
  '&Oacute;': 'Ó',
  '&Uacute;': 'Ú',
  '&Ntilde;': 'Ñ',
}

function decodificarEntidades(texto: string): string {
  let resultado = texto.replace(
    /&#(\d+);/g,
    (_, codigo) => String.fromCodePoint(Number(codigo)),
  )
  resultado = resultado.replace(
    /&#x([0-9a-fA-F]+);/g,
    (_, codigo) => String.fromCodePoint(parseInt(codigo, 16)),
  )
  for (const [entidad, valor] of Object.entries(ENTIDADES)) {
    resultado = resultado.split(entidad).join(valor)
  }
  return resultado
}

export function tituloDesdeHtml(html: string): string {
  const coincidencia = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  if (!coincidencia) return ''
  return decodificarEntidades(coincidencia[1])
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

export function textoLegibleDesdeHtml(html: string): string {
  let cuerpo = html

  // Fuera comentarios, y cada etiqueta de la lista negra junto con su
  // contenido completo (para no dejar "SUSCRÍBETE" o JS suelto en el texto).
  cuerpo = cuerpo.replace(/<!--[\s\S]*?-->/g, ' ')
  for (const etiqueta of ETIQUETAS_A_DESCARTAR) {
    const patron = new RegExp(`<${etiqueta}[^>]*>[\\s\\S]*?<\\/${etiqueta}>`, 'gi')
    cuerpo = cuerpo.replace(patron, ' ')
  }

  // Saltos de línea razonables antes de quitar el resto de las etiquetas,
  // para no pegar párrafos y títulos entre sí.
  cuerpo = cuerpo.replace(/<\/(p|div|li|h[1-6]|br|section|article)>/gi, '\n')
  cuerpo = cuerpo.replace(/<[^>]+>/g, ' ')

  cuerpo = decodificarEntidades(cuerpo)
  cuerpo = cuerpo.replace(/[ \t\f\v]+/g, ' ')
  cuerpo = cuerpo.replace(/\n\s*\n+/g, '\n\n')
  return cuerpo.trim()
}

export function truncarTexto(texto: string, maximo: number): string {
  return texto.slice(0, maximo)
}
