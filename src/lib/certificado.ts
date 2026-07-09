// Genera y descarga un certificado PNG dibujado en canvas (sin backend).

export function descargarCertificado(nombre: string, dominio: string) {
  const ancho = 1400
  const alto = 990
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Fondo degradado WOM
  const fondo = ctx.createLinearGradient(0, 0, ancho, alto)
  fondo.addColorStop(0, '#270046')
  fondo.addColorStop(0.6, '#4D008C')
  fondo.addColorStop(1, '#6a1ca8')
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, ancho, alto)

  // Marco
  ctx.strokeStyle = '#E92070'
  ctx.lineWidth = 10
  ctx.strokeRect(40, 40, ancho - 80, alto - 80)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.strokeRect(60, 60, ancho - 120, alto - 120)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'

  // Marca
  ctx.font = '800 56px Poppins, sans-serif'
  ctx.fillText('WOM', ancho / 2 - 62, 170)
  ctx.font = '500 40px Poppins, sans-serif'
  ctx.fillStyle = '#DBCCE8'
  ctx.fillText('Formación', ancho / 2 + 92, 170)

  ctx.fillStyle = '#E92070'
  ctx.font = '800 30px Poppins, sans-serif'
  ctx.fillText('CERTIFICADO DE DOMINIO', ancho / 2, 280)

  ctx.fillStyle = '#DBCCE8'
  ctx.font = '400 32px Poppins, sans-serif'
  ctx.fillText('Se certifica que', ancho / 2, 380)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 76px Poppins, sans-serif'
  ctx.fillText(nombre, ancho / 2, 480)

  ctx.fillStyle = '#DBCCE8'
  ctx.font = '400 32px Poppins, sans-serif'
  ctx.fillText('alcanzó la maestría completa (100%) en el dominio', ancho / 2, 570)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 54px Poppins, sans-serif'
  ctx.fillText(dominio, ancho / 2, 660)

  // Línea decorativa
  const linea = ctx.createLinearGradient(ancho / 2 - 220, 0, ancho / 2 + 220, 0)
  linea.addColorStop(0, 'rgba(233,32,112,0)')
  linea.addColorStop(0.5, '#E92070')
  linea.addColorStop(1, 'rgba(233,32,112,0)')
  ctx.fillStyle = linea
  ctx.fillRect(ancho / 2 - 220, 700, 440, 4)

  const fecha = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  ctx.fillStyle = '#A67FC5'
  ctx.font = '400 28px Poppins, sans-serif'
  ctx.fillText(fecha, ancho / 2, 770)
  ctx.fillText('Plataforma interna de formación · repaso espaciado verificado', ancho / 2, 860)

  const enlace = document.createElement('a')
  enlace.download = `certificado-${dominio.toLowerCase().replace(/\s+/g, '-')}.png`
  enlace.href = canvas.toDataURL('image/png')
  enlace.click()
}
