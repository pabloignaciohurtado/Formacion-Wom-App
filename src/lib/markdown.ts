// Analizador de un subconjunto seguro de Markdown para las lecciones que se
// escriben en el creador de materiales.
//
// Dos decisiones de fondo:
//
// 1. No se agrega una librería. `package.json` no trae ninguna de Markdown y,
//    según CLAUDE.md, el `package-lock.json` regenerado no se puede pushear
//    por MCP. El subconjunto que necesita una lección (títulos, listas,
//    negritas, enlaces, imágenes, citas y código) cabe en este archivo.
// 2. La salida es una estructura de datos, no HTML. El componente que la
//    dibuja crea elementos de React; **nunca** se usa `dangerouslySetInnerHTML`.
//    Aunque un administrador pegue `<script>` en el cuerpo, aquí viaja como
//    texto y React lo escapa al pintarlo.
//
// Lógica pura, sin React: se puede probar entera con vitest.

export type Inline =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'negrita'; texto: string }
  | { tipo: 'cursiva'; texto: string }
  | { tipo: 'codigo'; texto: string }
  | { tipo: 'enlace'; texto: string; url: string }
  | { tipo: 'imagen'; alt: string; url: string }

export type Bloque =
  | { tipo: 'titulo'; nivel: 2 | 3; contenido: Inline[] }
  | { tipo: 'parrafo'; contenido: Inline[] }
  | { tipo: 'lista'; ordenada: boolean; items: Inline[][] }
  | { tipo: 'cita'; contenido: Inline[] }
  | { tipo: 'codigo'; texto: string }
  | { tipo: 'separador' }

// Solo http(s) y rutas internas. Todo lo demás (`javascript:`, `data:`,
// `vbscript:`, protocolos raros) se descarta: es la única puerta por la que
// un cuerpo de lección podría intentar ejecutar algo.
export function urlSegura(url: string): string | null {
  const limpia = url.trim()
  if (!limpia) return null
  // Un control invisible en medio de "java\nscript:" burlaría un simple
  // startsWith, así que se eliminan antes de decidir.
  const canonica = Array.from(limpia)
    .filter((c) => {
      const codigo = c.codePointAt(0) ?? 0
      // Espacios y controles invisibles (incluye \u0000-\u001f, DEL y el
      // rango C1) no cambian el destino real de la url, pero sí burlarían un
      // startsWith ingenuo si los dejáramos pasar.
      return codigo > 0x20 && codigo !== 0x7f && !(codigo >= 0x80 && codigo <= 0x9f)
    })
    .join('')
    .toLowerCase()
  if (canonica.startsWith('http://') || canonica.startsWith('https://')) return limpia
  if (canonica.startsWith('/') || canonica.startsWith('#')) return limpia
  if (canonica.startsWith('mailto:') || canonica.startsWith('tel:')) return limpia
  return null
}

// El orden de las alternativas importa: el código va primero para que
// `` `**x**` `` se lea como código y no como negrita; la imagen antes que el
// enlace porque comparten sintaxis salvo el `!` inicial.
const PATRON_INLINE =
  /`([^`]+)`|!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g

export function parsearInline(texto: string): Inline[] {
  const nodos: Inline[] = []
  let ultimo = 0
  PATRON_INLINE.lastIndex = 0
  let coincidencia: RegExpExecArray | null

  const agregarTexto = (valor: string) => {
    if (valor) nodos.push({ tipo: 'texto', texto: valor })
  }

  while ((coincidencia = PATRON_INLINE.exec(texto)) !== null) {
    agregarTexto(texto.slice(ultimo, coincidencia.index))
    const [completo, codigo, imgAlt, imgUrl, enlaceTexto, enlaceUrl, negrita, cursiva] =
      coincidencia

    if (codigo !== undefined) {
      nodos.push({ tipo: 'codigo', texto: codigo })
    } else if (imgUrl !== undefined) {
      const url = urlSegura(imgUrl)
      // Una imagen con url rechazada no desaparece en silencio: queda su
      // texto alternativo, para que el autor note que algo no quedó bien.
      if (url) nodos.push({ tipo: 'imagen', alt: imgAlt ?? '', url })
      else agregarTexto(imgAlt ?? '')
    } else if (enlaceUrl !== undefined) {
      const url = urlSegura(enlaceUrl)
      if (url) nodos.push({ tipo: 'enlace', texto: enlaceTexto, url })
      else agregarTexto(enlaceTexto)
    } else if (negrita !== undefined) {
      nodos.push({ tipo: 'negrita', texto: negrita })
    } else if (cursiva !== undefined) {
      nodos.push({ tipo: 'cursiva', texto: cursiva })
    } else {
      agregarTexto(completo)
    }
    ultimo = coincidencia.index + completo.length
  }
  agregarTexto(texto.slice(ultimo))
  return nodos
}

const VINETA = /^[-*]\s+(.*)$/
const NUMERADA = /^\d+[.)]\s+(.*)$/
const TITULO = /^(#{1,6})\s+(.*)$/
const CITA = /^>\s?(.*)$/
const SEPARADOR = /^(-{3,}|\*{3,}|_{3,})$/
const CERCA = /^```/

export function parsearMarkdown(fuente: string): Bloque[] {
  // \r\n de un copiar/pegar desde Word rompería todos los patrones anclados.
  const lineas = fuente.replace(/\r\n?/g, '\n').split('\n')
  const bloques: Bloque[] = []
  let i = 0

  while (i < lineas.length) {
    const linea = lineas[i]
    const recortada = linea.trim()

    if (!recortada) {
      i += 1
      continue
    }

    if (CERCA.test(recortada)) {
      const cuerpo: string[] = []
      i += 1
      while (i < lineas.length && !CERCA.test(lineas[i].trim())) {
        cuerpo.push(lineas[i])
        i += 1
      }
      i += 1 // salta la cerca de cierre (o el fin del texto)
      bloques.push({ tipo: 'codigo', texto: cuerpo.join('\n') })
      continue
    }

    if (SEPARADOR.test(recortada)) {
      bloques.push({ tipo: 'separador' })
      i += 1
      continue
    }

    const titulo = TITULO.exec(recortada)
    if (titulo) {
      // El h1 queda reservado para el título de la lección, que dibuja la
      // página: cualquier `#` del cuerpo baja a h2 y nunca se pasa de h3,
      // para no romper la jerarquía de encabezados que lee un lector de
      // pantalla.
      const nivel = titulo[1].length <= 2 ? 2 : 3
      bloques.push({ tipo: 'titulo', nivel, contenido: parsearInline(titulo[2]) })
      i += 1
      continue
    }

    if (CITA.test(recortada)) {
      const partes: string[] = []
      while (i < lineas.length) {
        const cita = CITA.exec(lineas[i].trim())
        if (!cita) break
        partes.push(cita[1])
        i += 1
      }
      bloques.push({ tipo: 'cita', contenido: parsearInline(partes.join(' ').trim()) })
      continue
    }

    const esOrdenada = NUMERADA.test(recortada)
    if (VINETA.test(recortada) || esOrdenada) {
      const patron = esOrdenada ? NUMERADA : VINETA
      const items: Inline[][] = []
      while (i < lineas.length) {
        const item = patron.exec(lineas[i].trim())
        if (!item) break
        items.push(parsearInline(item[1]))
        i += 1
      }
      bloques.push({ tipo: 'lista', ordenada: esOrdenada, items })
      continue
    }

    // Párrafo: líneas seguidas hasta una vacía o hasta que empiece otro
    // bloque. Se unen con espacio, como hace Markdown.
    const partes: string[] = []
    while (i < lineas.length) {
      const actual = lineas[i].trim()
      if (
        !actual ||
        CERCA.test(actual) ||
        SEPARADOR.test(actual) ||
        TITULO.test(actual) ||
        CITA.test(actual) ||
        VINETA.test(actual) ||
        NUMERADA.test(actual)
      ) {
        break
      }
      partes.push(actual)
      i += 1
    }
    bloques.push({ tipo: 'parrafo', contenido: parsearInline(partes.join(' ')) })
  }

  return bloques
}

// Resumen en texto plano para listados y buscador: descarta la sintaxis y
// deja solo lo legible.
export function textoPlano(fuente: string): string {
  return parsearMarkdown(fuente)
    .flatMap((bloque) => {
      switch (bloque.tipo) {
        case 'titulo':
        case 'parrafo':
        case 'cita':
          return [bloque.contenido.map(textoDeInline).join('')]
        case 'lista':
          return bloque.items.map((item) => item.map(textoDeInline).join(''))
        case 'codigo':
          return [bloque.texto]
        default:
          return []
      }
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function textoDeInline(nodo: Inline): string {
  return nodo.tipo === 'imagen' ? nodo.alt : nodo.texto
}
