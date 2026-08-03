import { describe, expect, it } from 'vitest'
import {
  textoLegibleDesdeHtml,
  tituloDesdeHtml,
  truncarTexto,
  validarUrl,
} from './validacion'

describe('validarUrl', () => {
  it('acepta una URL pública https válida', () => {
    const resultado = validarUrl('https://www.wom.cl/ayuda/portabilidad')
    expect(resultado.valida).toBe(true)
    expect(resultado.url?.hostname).toBe('www.wom.cl')
  })

  it('acepta una URL pública http válida', () => {
    const resultado = validarUrl('http://ejemplo.com/articulo')
    expect(resultado.valida).toBe(true)
  })

  it('rechaza una cadena vacía', () => {
    expect(validarUrl('').valida).toBe(false)
    expect(validarUrl('   ').valida).toBe(false)
  })

  it('rechaza una URL mal formada', () => {
    expect(validarUrl('no es una url').valida).toBe(false)
  })

  it('rechaza esquemas distintos de http/https', () => {
    expect(validarUrl('ftp://ejemplo.com/archivo').valida).toBe(false)
    expect(validarUrl('file:///etc/passwd').valida).toBe(false)
    expect(validarUrl('javascript:alert(1)').valida).toBe(false)
  })

  it('rechaza localhost y variantes de loopback', () => {
    expect(validarUrl('http://localhost/interno').valida).toBe(false)
    expect(validarUrl('http://127.0.0.1/interno').valida).toBe(false)
    expect(validarUrl('http://0.0.0.0/interno').valida).toBe(false)
    expect(validarUrl('http://[::1]/interno').valida).toBe(false)
  })

  it('rechaza rangos IP privados (RFC1918)', () => {
    expect(validarUrl('http://10.0.0.5/panel').valida).toBe(false)
    expect(validarUrl('http://172.16.0.1/panel').valida).toBe(false)
    expect(validarUrl('http://172.31.255.254/panel').valida).toBe(false)
    expect(validarUrl('http://192.168.1.1/panel').valida).toBe(false)
  })

  it('no confunde un rango público con el rango 172.16-31 privado', () => {
    expect(validarUrl('http://172.15.0.1/publico').valida).toBe(true)
    expect(validarUrl('http://172.32.0.1/publico').valida).toBe(true)
  })

  it('rechaza direcciones link-local, incluido el endpoint de metadata cloud', () => {
    expect(validarUrl('http://169.254.169.254/latest/meta-data').valida).toBe(false)
  })

  it('rechaza puertos no estándar', () => {
    expect(validarUrl('https://ejemplo.com:8080/panel').valida).toBe(false)
    expect(validarUrl('https://ejemplo.com:22/').valida).toBe(false)
  })

  it('acepta explícitamente los puertos 80 y 443', () => {
    expect(validarUrl('http://ejemplo.com:80/pagina').valida).toBe(true)
    expect(validarUrl('https://ejemplo.com:443/pagina').valida).toBe(true)
  })
})

describe('tituloDesdeHtml', () => {
  it('extrae el contenido de <title>', () => {
    const html = '<html><head><title>Guía de portabilidad</title></head><body></body></html>'
    expect(tituloDesdeHtml(html)).toBe('Guía de portabilidad')
  })

  it('devuelve cadena vacía si no hay <title>', () => {
    expect(tituloDesdeHtml('<html><body>Sin título</body></html>')).toBe('')
  })
})

describe('textoLegibleDesdeHtml', () => {
  it('descarta script, style, nav, header y footer', () => {
    const html = `
      <html>
        <head><style>.a{color:red}</style></head>
        <body>
          <header>Menú principal</header>
          <nav>Inicio · Ayuda · Contacto</nav>
          <script>console.log('rastreo')</script>
          <main><p>Este es el contenido real del artículo.</p></main>
          <footer>© 2026 Ejemplo</footer>
        </body>
      </html>
    `
    const texto = textoLegibleDesdeHtml(html)
    expect(texto).toContain('Este es el contenido real del artículo.')
    expect(texto).not.toContain('Menú principal')
    expect(texto).not.toContain('Inicio · Ayuda · Contacto')
    expect(texto).not.toContain('rastreo')
    expect(texto).not.toContain('© 2026 Ejemplo')
  })

  it('decodifica entidades HTML comunes, incluidas tildes y eñes', () => {
    const html = '<p>Atenci&oacute;n al cliente en la regi&oacute;n del Ma&uacute;le, se&ntilde;or&iacute;a.</p>'
    expect(textoLegibleDesdeHtml(html)).toBe(
      'Atención al cliente en la región del Maúle, señoría.'
    )
  })

  it('separa bloques con saltos de línea en vez de pegar párrafos', () => {
    const html = '<p>Primer párrafo.</p><p>Segundo párrafo.</p>'
    const texto = textoLegibleDesdeHtml(html)
    expect(texto).toContain('Primer párrafo.')
    expect(texto).toContain('Segundo párrafo.')
    expect(texto.indexOf('Primer párrafo.')).toBeLessThan(
      texto.indexOf('Segundo párrafo.')
    )
  })
})

describe('truncarTexto', () => {
  it('no modifica un texto más corto que el máximo', () => {
    expect(truncarTexto('hola mundo', 100)).toBe('hola mundo')
  })

  it('recorta un texto más largo que el máximo', () => {
    const largo = 'a'.repeat(200)
    expect(truncarTexto(largo, 50)).toHaveLength(50)
  })
})
