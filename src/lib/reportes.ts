// Reportes de equipo en PDF y Excel para que las jefaturas compartan el
// seguimiento fuera de la app (correo, reunión, cruces propios). Las tres
// salidas — CSV, Excel y PDF — parten de las MISMAS filas puras que se
// definen aquí, así una sola fuente de verdad alimenta todo. Las librerías
// pesadas (jspdf, write-excel-file) se cargan de forma diferida dentro de
// cada función de descarga, para no engordar el bundle inicial de quienes
// nunca exportan.
import type { CellObject, Sheet } from 'write-excel-file/browser'
import { DOMINIOS } from '../data/contenido'
import { ligaDe } from './gamificacion'
import {
  RANGOS,
  contarAtencion,
  diasDesde,
  precisionPct,
  type FilaEquipo,
  type RangoFechas,
} from './seguimiento'

// Coincide con lo que devuelve el RPC precision_por_dominio().
export type FilaDificil = {
  domain_id: string
  intentos: number
  correctas: number
  precision_pct: number
}

// Coincide con lo que devuelve el RPC tendencia_equipo().
export type FilaTendencia = {
  semana: string
  intentos: number
  correctas: number
  precision_pct: number
  activos: number
}

// El contenido de archivo del build de navegador (para el genérico de Sheet).
type ContenidoArchivo = File | Blob | ArrayBuffer

// ── Marca WOM (mismos hex que src/index.css) ─────────────────────────
const MORADO = '#4D008C'
const MORADO_RGB = [77, 0, 140] as const
const WOM_50_RGB = [245, 239, 252] as const
const TINTA_RGB = [33, 37, 41] as const
const TINTA_SUAVE = '#494C66'

export function nombreDominio(id: string): string {
  return DOMINIOS.find((d) => d.id === id)?.titulo ?? id
}

export function etiquetaRango(rango: RangoFechas): string {
  return RANGOS.find((r) => r.id === rango)?.etiqueta ?? 'Todo'
}

export function textoPeriodo(rango: RangoFechas): string {
  return rango === 'todo'
    ? 'Histórico completo'
    : `Últimos ${etiquetaRango(rango)}`
}

// ── Filas puras (compartidas entre CSV, Excel y PDF) ─────────────────

export type Celda = string | number

export const CABECERAS_EQUIPO = [
  'Ejecutivo',
  'Liga',
  'XP',
  'Intentos',
  'Correctas',
  'Precisión %',
  'Días desde última práctica',
  'Obligatorias pendientes',
] as const

export function filasEquipo(
  equipo: FilaEquipo[],
  ahora: number = Date.now()
): Celda[][] {
  return equipo.map((r) => {
    const p = precisionPct(r.intentos, r.correctas)
    const d = diasDesde(r.ultima_actividad, ahora)
    return [
      r.nombre,
      ligaDe(r.liga).nombre,
      r.xp,
      r.intentos,
      r.correctas,
      p === null ? '' : p,
      d === null ? 'nunca' : d,
      r.obligatorias_pendientes,
    ]
  })
}

export const CABECERAS_DIFICIL = [
  'Dominio',
  'Precisión %',
  'Correctas',
  'Intentos',
] as const

export function filasDificiles(dificiles: FilaDificil[]): Celda[][] {
  return dificiles.map((d) => [
    nombreDominio(d.domain_id),
    d.precision_pct,
    d.correctas,
    d.intentos,
  ])
}

export const CABECERAS_TENDENCIA = [
  'Semana',
  'Ejercicios',
  'Correctas',
  'Precisión %',
  'Activos',
] as const

export function filasTendencia(tendencia: FilaTendencia[]): Celda[][] {
  return tendencia.map((t) => [
    t.semana,
    t.intentos,
    t.correctas,
    t.precision_pct,
    t.activos,
  ])
}

// Resumen "qué atender" para la cabecera del reporte. Se calcula sobre el
// equipo completo (no el filtrado): el titular describe al equipo entero.
export type ResumenReporte = {
  total: number
  inactivos: number
  bajaPrecision: number
  obligatorios: number
}

export function resumenReporte(
  equipo: FilaEquipo[],
  ahora: number = Date.now()
): ResumenReporte {
  const a = contarAtencion(equipo, ahora)
  return {
    total: equipo.length,
    inactivos: a.inactivo,
    bajaPrecision: a['baja-precision'],
    obligatorios: a.obligatorios,
  }
}

// Entrada única para generar el reporte en cualquier formato.
export type EntradaReporte = {
  rango: RangoFechas
  generadoEn: number
  // Equipo ya filtrado por el segmento activo: es lo que se exporta.
  equipo: FilaEquipo[]
  // Equipo completo, para el resumen "qué atender".
  equipoCompleto: FilaEquipo[]
  dificiles: FilaDificil[]
  tendencia: FilaTendencia[]
  filtroEtiqueta?: string | null
}

function fechaLegible(ms: number): string {
  return new Date(ms).toLocaleString('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

// ── Excel (.xlsx) ────────────────────────────────────────────────────

function celdaEncabezado(v: string): CellObject {
  return {
    value: v,
    fontWeight: 'bold',
    backgroundColor: MORADO,
    textColor: '#FFFFFF',
    align: 'left',
  }
}

function celdaDato(v: Celda): CellObject {
  if (typeof v === 'number') return { type: Number, value: v }
  // Cadena vacía → celda en blanco; 'nunca' y demás quedan como texto.
  return v === '' ? {} : { type: String, value: v }
}

function hojaReporte(
  nombre: string,
  titulo: string,
  subtitulos: string[],
  cabeceras: readonly string[],
  filas: Celda[][],
  anchos: number[]
): Sheet<ContenidoArchivo> {
  const span = cabeceras.length
  const data: CellObject[][] = [
    [{ value: titulo, fontWeight: 'bold', fontSize: 14, textColor: MORADO, columnSpan: span }],
    ...subtitulos.map((s): CellObject[] => [
      { value: s, textColor: TINTA_SUAVE, columnSpan: span },
    ]),
    [{}],
    cabeceras.map(celdaEncabezado),
    ...filas.map((f) => f.map(celdaDato)),
  ]
  return { sheet: nombre, data, columns: anchos.map((width) => ({ width })) }
}

export async function descargarReporteExcel(e: EntradaReporte): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const r = resumenReporte(e.equipoCompleto, e.generadoEn)
  const meta = [
    `Período: ${textoPeriodo(e.rango)}`,
    `Generado: ${fechaLegible(e.generadoEn)}`,
    `Equipo: ${r.total} · inactivos ${r.inactivos} · bajo 70% ${r.bajaPrecision} · obligatorios pendientes ${r.obligatorios}`,
    ...(e.filtroEtiqueta ? [`Filtro aplicado: ${e.filtroEtiqueta}`] : []),
  ]

  const hojas: Sheet<ContenidoArchivo>[] = [
    hojaReporte(
      'Seguimiento',
      'Seguimiento del equipo',
      meta,
      CABECERAS_EQUIPO,
      filasEquipo(e.equipo, e.generadoEn),
      [26, 16, 8, 10, 10, 12, 16, 14]
    ),
  ]
  if (e.tendencia.some((t) => t.intentos > 0)) {
    hojas.push(
      hojaReporte(
        'Tendencia',
        'Tendencia semanal del equipo',
        ['Últimas semanas: volumen de ejercicios y precisión.'],
        CABECERAS_TENDENCIA,
        filasTendencia(e.tendencia),
        [14, 12, 12, 12, 10]
      )
    )
  }
  if (e.dificiles.length > 0) {
    hojas.push(
      hojaReporte(
        'Contenido difícil',
        'Contenido difícil (precisión bajo 70%)',
        ['Dominios candidatos a reforzar o revisar sus preguntas.'],
        CABECERAS_DIFICIL,
        filasDificiles(e.dificiles),
        [30, 12, 12, 12]
      )
    )
  }

  await writeXlsxFile(hojas, {
    fontFamily: 'Calibri',
    fontSize: 11,
  }).toFile('reporte-equipo.xlsx')
}

// ── PDF (reporte branded de una o más páginas) ───────────────────────

type ConAutoTabla = { lastAutoTable?: { finalY: number } }

export async function descargarReportePDF(e: EntradaReporte): Promise<void> {
  const [{ jsPDF }, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable').then((m) => m.default),
  ])
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40

  // Banda de marca
  doc.setFillColor(MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2])
  doc.rect(0, 0, W, 78, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Formación WOM', M, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.text('Reporte de equipo', M, 56)
  doc.setFontSize(9)
  doc.text(textoPeriodo(e.rango), W - M, 32, { align: 'right' })
  doc.text(`Generado: ${fechaLegible(e.generadoEn)}`, W - M, 46, {
    align: 'right',
  })
  if (e.filtroEtiqueta) {
    doc.text(`Filtro: ${e.filtroEtiqueta}`, W - M, 60, { align: 'right' })
  }

  // Resumen "qué atender" en cuatro tarjetas
  const r = resumenReporte(e.equipoCompleto, e.generadoEn)
  // Sin '≥': las fuentes estándar de jsPDF (WinAnsi) no traen ese glifo.
  const tarjetas: [string, string][] = [
    ['Ejecutivos', String(r.total)],
    ['Inactivos 7+ días', String(r.inactivos)],
    ['Bajo 70% precisión', String(r.bajaPrecision)],
    ['Obligatorios pend.', String(r.obligatorios)],
  ]
  const gap = 10
  const cw = (W - M * 2 - gap * 3) / 4
  const cy = 100
  tarjetas.forEach((t, i) => {
    const cx = M + i * (cw + gap)
    doc.setFillColor(WOM_50_RGB[0], WOM_50_RGB[1], WOM_50_RGB[2])
    doc.roundedRect(cx, cy, cw, 48, 6, 6, 'F')
    doc.setTextColor(MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(21)
    doc.text(t[1], cx + 12, cy + 26)
    doc.setTextColor(73, 76, 102)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(t[0], cx + 12, cy + 40)
  })

  let y = cy + 48 + 22

  const tituloSeccion = (texto: string, yPos: number) => {
    doc.setTextColor(TINTA_RGB[0], TINTA_RGB[1], TINTA_RGB[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(texto, M, yPos)
  }

  const finalY = () =>
    (doc as unknown as ConAutoTabla).lastAutoTable?.finalY ?? y

  // Tabla principal: seguimiento
  tituloSeccion('Seguimiento del equipo', y)
  autoTable(doc, {
    startY: y + 8,
    head: [[...CABECERAS_EQUIPO]],
    body: filasEquipo(e.equipo, e.generadoEn).map((f) => f.map(String)),
    styles: { fontSize: 8, cellPadding: 4, lineColor: [230, 230, 235], lineWidth: 0.5 },
    headStyles: {
      fillColor: [MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2]],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [WOM_50_RGB[0], WOM_50_RGB[1], WOM_50_RGB[2]],
    },
    margin: { left: M, right: M },
  })
  y = finalY() + 26

  // Tendencia (si hay actividad)
  if (e.tendencia.some((t) => t.intentos > 0)) {
    tituloSeccion('Tendencia semanal', y)
    autoTable(doc, {
      startY: y + 8,
      head: [[...CABECERAS_TENDENCIA]],
      body: filasTendencia(e.tendencia).map((f) => f.map(String)),
      styles: { fontSize: 8, cellPadding: 4, lineColor: [230, 230, 235], lineWidth: 0.5 },
      headStyles: {
        fillColor: [MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2]],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [WOM_50_RGB[0], WOM_50_RGB[1], WOM_50_RGB[2]],
      },
      margin: { left: M, right: M },
    })
    y = finalY() + 26
  }

  // Contenido difícil (si hay)
  if (e.dificiles.length > 0) {
    tituloSeccion('Contenido difícil (precisión bajo 70%)', y)
    autoTable(doc, {
      startY: y + 8,
      head: [[...CABECERAS_DIFICIL]],
      body: filasDificiles(e.dificiles).map((f) => f.map(String)),
      styles: { fontSize: 8, cellPadding: 4, lineColor: [230, 230, 235], lineWidth: 0.5 },
      headStyles: {
        fillColor: [MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2]],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [WOM_50_RGB[0], WOM_50_RGB[1], WOM_50_RGB[2]],
      },
      margin: { left: M, right: M },
    })
  }

  // Pie de página con numeración, en todas las páginas
  const paginas = doc.getNumberOfPages()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(73, 76, 102)
    doc.text('Generado desde Formación WOM · uso interno', M, H - 20)
    doc.text(`Página ${i} de ${paginas}`, W - M, H - 20, { align: 'right' })
  }

  doc.save('reporte-equipo.pdf')
}

// ── Ficha individual del relator ─────────────────────────────────────

// objetivo_id → título y dominio, para nombrar el drill en el reporte.
const OBJETIVOS = new Map<string, { titulo: string; dominio: string }>()
for (const d of DOMINIOS) {
  for (const o of d.objetivos) {
    OBJETIVOS.set(o.id, { titulo: o.titulo, dominio: d.titulo })
  }
}

export function nombreObjetivo(id: string): { titulo: string; dominio: string } {
  return OBJETIVOS.get(id) ?? { titulo: id, dominio: '' }
}

export type FilaSemanaXP = { etiqueta: string; xp: number }
export type FilaMaestria = { dominio: string; valor: number }
export type FilaObjetivoFlojo = {
  objetivo_id: string
  intentos: number
  correctas: number
  precision: number
}
export type FilaMeta = { dominio: string; objetivo: number; actual: number }

export const CABECERAS_SEMANA = ['Semana', 'XP'] as const
export function filasSemanas(semanas: FilaSemanaXP[]): Celda[][] {
  return semanas.map((s) => [s.etiqueta, s.xp])
}

export const CABECERAS_MAESTRIA = ['Dominio', 'Maestría %'] as const
export function filasMaestria(maestrias: FilaMaestria[]): Celda[][] {
  return maestrias.map((m) => [m.dominio, m.valor])
}

export const CABECERAS_OBJETIVOS = [
  'Objetivo',
  'Dominio',
  'Precisión %',
  'Correctas',
  'Intentos',
] as const
export function filasObjetivos(objetivos: FilaObjetivoFlojo[]): Celda[][] {
  return objetivos.map((o) => {
    const info = nombreObjetivo(o.objetivo_id)
    return [info.titulo, info.dominio, o.precision, o.correctas, o.intentos]
  })
}

export const CABECERAS_METAS = ['Dominio', 'Meta %', 'Actual %', 'Estado'] as const
export function filasMetas(metas: FilaMeta[]): Celda[][] {
  return metas.map((m) => [
    m.dominio,
    m.objetivo,
    m.actual,
    m.actual >= m.objetivo ? 'cumplida' : 'en progreso',
  ])
}

export type EntradaFicha = {
  nombre: string
  email: string
  ligaNombre: string
  generadoEn: number
  xp: number
  intentos: number
  correctas: number
  precision: number
  semanas: FilaSemanaXP[]
  maestrias: FilaMaestria[]
  objetivos: FilaObjetivoFlojo[]
  metas: FilaMeta[]
}

// Nombre de archivo seguro a partir del nombre del relator.
function slug(texto: string): string {
  const s = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return s || 'relator'
}

export async function descargarFichaExcel(f: EntradaFicha): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const meta = [
    `Relator: ${f.nombre}${f.email ? ` (${f.email})` : ''}`,
    `Liga: ${f.ligaNombre}`,
    'Período: últimas 8 semanas',
    `Generado: ${fechaLegible(f.generadoEn)}`,
    `Resumen: ${f.xp} XP · ${f.intentos} ejercicios · ${f.precision}% precisión`,
  ]
  const hojas: Sheet<ContenidoArchivo>[] = [
    hojaReporte(
      'Maestría',
      `Ficha de ${f.nombre}`,
      meta,
      CABECERAS_MAESTRIA,
      filasMaestria(f.maestrias),
      [30, 12]
    ),
    hojaReporte(
      'Evolución XP',
      'Evolución semanal (XP)',
      ['Últimas 8 semanas.'],
      CABECERAS_SEMANA,
      filasSemanas(f.semanas),
      [16, 12]
    ),
  ]
  if (f.objetivos.length > 0) {
    hojas.push(
      hojaReporte(
        'Objetivos a reforzar',
        'Objetivos a reforzar (precisión bajo 70%, 3+ intentos)',
        ['Lo concreto para trabajar en un 1:1.'],
        CABECERAS_OBJETIVOS,
        filasObjetivos(f.objetivos),
        [26, 20, 12, 12, 12]
      )
    )
  }
  if (f.metas.length > 0) {
    hojas.push(
      hojaReporte(
        'Metas',
        'Metas de maestría',
        ['Meta asignada vs. avance real por dominio.'],
        CABECERAS_METAS,
        filasMetas(f.metas),
        [30, 10, 10, 14]
      )
    )
  }
  await writeXlsxFile(hojas, {
    fontFamily: 'Calibri',
    fontSize: 11,
  }).toFile(`ficha-${slug(f.nombre)}.xlsx`)
}

export async function descargarFichaPDF(f: EntradaFicha): Promise<void> {
  const [{ jsPDF }, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable').then((m) => m.default),
  ])
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40

  // Banda de marca
  doc.setFillColor(MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2])
  doc.rect(0, 0, W, 78, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Formación WOM', M, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.text(`Ficha de relator · ${f.nombre}`, M, 56)
  doc.setFontSize(9)
  doc.text(f.ligaNombre, W - M, 28, { align: 'right' })
  doc.text('Últimas 8 semanas', W - M, 42, { align: 'right' })
  doc.text(`Generado: ${fechaLegible(f.generadoEn)}`, W - M, 56, {
    align: 'right',
  })

  // Resumen en tres tarjetas
  const tarjetas: [string, string][] = [
    ['XP (8 semanas)', String(f.xp)],
    ['Ejercicios', String(f.intentos)],
    ['Precisión', `${f.precision}%`],
  ]
  const gap = 10
  const cw = (W - M * 2 - gap * 2) / 3
  const cy = 100
  tarjetas.forEach((t, i) => {
    const cx = M + i * (cw + gap)
    doc.setFillColor(WOM_50_RGB[0], WOM_50_RGB[1], WOM_50_RGB[2])
    doc.roundedRect(cx, cy, cw, 48, 6, 6, 'F')
    doc.setTextColor(MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(21)
    doc.text(t[1], cx + 12, cy + 26)
    doc.setTextColor(73, 76, 102)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(t[0], cx + 12, cy + 40)
  })

  let y = cy + 48 + 22

  const finalY = () =>
    (doc as unknown as ConAutoTabla).lastAutoTable?.finalY ?? y

  const agregarTabla = (
    titulo: string,
    cabeceras: readonly string[],
    filas: Celda[][],
    yPos: number
  ) => {
    doc.setTextColor(TINTA_RGB[0], TINTA_RGB[1], TINTA_RGB[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(titulo, M, yPos)
    autoTable(doc, {
      startY: yPos + 8,
      head: [[...cabeceras]],
      body: filas.map((row) => row.map(String)),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        lineColor: [230, 230, 235],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [MORADO_RGB[0], MORADO_RGB[1], MORADO_RGB[2]],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [WOM_50_RGB[0], WOM_50_RGB[1], WOM_50_RGB[2]],
      },
      margin: { left: M, right: M },
    })
    return finalY() + 26
  }

  y = agregarTabla(
    'Maestría por dominio',
    CABECERAS_MAESTRIA,
    filasMaestria(f.maestrias),
    y
  )
  y = agregarTabla(
    'Evolución semanal (XP)',
    CABECERAS_SEMANA,
    filasSemanas(f.semanas),
    y
  )
  if (f.objetivos.length > 0) {
    y = agregarTabla(
      'Objetivos a reforzar (precisión bajo 70%, 3+ intentos)',
      CABECERAS_OBJETIVOS,
      filasObjetivos(f.objetivos),
      y
    )
  }
  if (f.metas.length > 0) {
    y = agregarTabla('Metas de maestría', CABECERAS_METAS, filasMetas(f.metas), y)
  }

  const paginas = doc.getNumberOfPages()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(73, 76, 102)
    doc.text('Generado desde Formación WOM · uso interno', M, H - 20)
    doc.text(`Página ${i} de ${paginas}`, W - M, H - 20, { align: 'right' })
  }

  doc.save(`ficha-${slug(f.nombre)}.pdf`)
}
