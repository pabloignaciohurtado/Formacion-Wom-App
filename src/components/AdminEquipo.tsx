import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Download, FileText, Table2, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DOMINIOS } from '../data/contenido'
import { ligaDe } from '../lib/gamificacion'
import { generarCSV, descargarCSV } from '../lib/csv'
import {
  RANGOS,
  contarAtencion,
  desdeDeRango,
  diasDesde,
  enSegmento,
  precisionPct,
  type FilaEquipo,
  type RangoFechas,
  type Segmento,
} from '../lib/seguimiento'
import {
  CABECERAS_DIFICIL,
  CABECERAS_EQUIPO,
  descargarReporteExcel,
  descargarReportePDF,
  filasDificiles,
  filasEquipo,
  type EntradaReporte,
  type FilaDificil,
  type FilaTendencia,
} from '../lib/reportes'
import { MenuExportar } from './MenuExportar'
import { EstadoCarga, Tarjeta } from './ui'

// Puente temporal: los RPC de Nivel 2 (resumen_equipo/precision_por_dominio
// con rango de fechas, y tendencia_equipo) aún no están en los tipos
// generados; se regeneran aparte. El cast evita arrastrar todo
// database.types.ts en este cambio.
const rpcSuelto = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: unknown }>

// Tendencia semanal del equipo: barra = ejercicios de la semana (volumen),
// etiqueta = precisión (calidad). Juntas responden "¿mejora el equipo?" sin
// que un pico de precisión con dos intentos engañe. SVG puro, sin librerías.
function GraficoTendencia({ datos }: { datos: FilaTendencia[] }) {
  const max = Math.max(...datos.map((d) => d.intentos), 1)
  const ancho = 100 / datos.length
  return (
    <svg
      viewBox="0 0 100 46"
      className="w-full"
      role="img"
      aria-label="Tendencia semanal del equipo: ejercicios y precisión por semana"
    >
      {datos.map((d, i) => {
        const alto = d.intentos > 0 ? Math.max((d.intentos / max) * 34, 2) : 0.8
        return (
          <g key={d.semana}>
            <rect
              x={i * ancho + ancho * 0.2}
              y={40 - alto}
              width={ancho * 0.6}
              height={alto}
              rx={1.2}
              className={d.intentos > 0 ? 'fill-wom-600' : 'fill-gray-300'}
            />
            {d.intentos > 0 && (
              <text
                x={i * ancho + ancho / 2}
                y={40 - alto - 1.5}
                textAnchor="middle"
                className="fill-tinta"
                fontSize={2.5}
                fontWeight={700}
              >
                {d.precision_pct}%
              </text>
            )}
            <text
              x={i * ancho + ancho / 2}
              y={45}
              textAnchor="middle"
              className="fill-tinta-suave"
              fontSize={2.5}
            >
              {d.semana.slice(8, 10)}/{d.semana.slice(5, 7)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const SEGMENTOS: { id: Segmento; etiqueta: (n: number) => string; clase: string }[] = [
  {
    id: 'inactivo',
    etiqueta: (n) => `${n} inactivo${n === 1 ? '' : 's'} (≥7 días)`,
    clase: 'bg-red-50 text-red-700 ring-red-200',
  },
  {
    id: 'baja-precision',
    etiqueta: (n) => `${n} bajo 70% de precisión`,
    clase: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  {
    id: 'obligatorios',
    etiqueta: (n) => `${n} con obligatorios pendientes`,
    clase: 'bg-wom-50 text-wom-600 ring-wom-600/20',
  },
]

type FormatoGenerando = null | 'excel' | 'pdf'

// `conFicha` controla la columna de la ficha individual: el admin la tiene;
// un supervisor no, porque esa ruta y sus consultas son de admin.
export function AdminEquipo({ conFicha = true }: { conFicha?: boolean }) {
  const [equipo, setEquipo] = useState<FilaEquipo[] | null>(null)
  const [dificiles, setDificiles] = useState<FilaDificil[]>([])
  const [filtro, setFiltro] = useState<Segmento | null>(null)
  const [rango, setRango] = useState<RangoFechas>('todo')
  const [tendencia, setTendencia] = useState<FilaTendencia[]>([])
  const [generando, setGenerando] = useState<FormatoGenerando>(null)

  // Seguimiento y contenido difícil se re-consultan al cambiar el rango.
  useEffect(() => {
    let cancelado = false
    setEquipo(null)
    setFiltro(null)
    const desde = desdeDeRango(rango)
    const cargar = async () => {
      const [eq, dif] = await Promise.all([
        rpcSuelto('resumen_equipo', { desde }),
        rpcSuelto('precision_por_dominio', { desde }),
      ])
      if (cancelado) return
      setEquipo((eq.data as FilaEquipo[] | null) ?? [])
      setDificiles(
        ((dif.data as FilaDificil[] | null) ?? []).filter(
          (d) => d.precision_pct < 70
        )
      )
    }
    void cargar()
    return () => {
      cancelado = true
    }
  }, [rango])

  // La tendencia son 8 semanas fijas: se carga una vez, no depende del rango.
  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      const { data } = await rpcSuelto('tendencia_equipo', { semanas: 8 })
      if (!cancelado) setTendencia((data as FilaTendencia[] | null) ?? [])
    }
    void cargar()
    return () => {
      cancelado = true
    }
  }, [])

  const atencion = contarAtencion(equipo ?? [])
  const visibles = (equipo ?? []).filter(
    (f) => !filtro || enSegmento(f, filtro)
  )

  // Etiqueta del filtro activo (con su conteo) para dejar constancia en el
  // reporte de qué segmento se exportó.
  const etiquetaFiltro = filtro
    ? SEGMENTOS.find((s) => s.id === filtro)?.etiqueta(atencion[filtro])
    : null

  // Entrada común a Excel y PDF: se arma en el momento de exportar para
  // sellar la fecha de generación.
  const entradaReporte = (): EntradaReporte => ({
    rango,
    generadoEn: Date.now(),
    equipo: visibles,
    equipoCompleto: equipo ?? [],
    dificiles,
    tendencia,
    filtroEtiqueta: etiquetaFiltro,
  })

  const exportarCSV = () => {
    const csv = generarCSV([...CABECERAS_EQUIPO], filasEquipo(visibles))
    descargarCSV('seguimiento-equipo.csv', csv)
  }

  const exportarExcel = async () => {
    setGenerando('excel')
    try {
      await descargarReporteExcel(entradaReporte())
    } finally {
      setGenerando(null)
    }
  }

  const exportarPDF = async () => {
    setGenerando('pdf')
    try {
      await descargarReportePDF(entradaReporte())
    } finally {
      setGenerando(null)
    }
  }

  const exportarDificiles = () => {
    const csv = generarCSV([...CABECERAS_DIFICIL], filasDificiles(dificiles))
    descargarCSV('contenido-dificil.csv', csv)
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Seguimiento del equipo</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Rango de fechas: acota todo el seguimiento y el contenido difícil
              al período elegido; "Todo" es el histórico completo. */}
          <div
            role="group"
            aria-label="Rango de fechas"
            className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold"
          >
            {RANGOS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={rango === r.id}
                onClick={() => setRango(r.id)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  rango === r.id
                    ? 'bg-wom-600 text-white'
                    : 'text-tinta-suave hover:text-wom-600'
                }`}
              >
                {r.etiqueta}
              </button>
            ))}
          </div>
          {equipo && equipo.length > 0 && (
            <MenuExportar
              ocupado={generando !== null}
              opciones={[
                {
                  icono: FileText,
                  etiqueta: 'Reporte PDF',
                  detalle: 'Branded, listo para compartir o imprimir',
                  onClick: exportarPDF,
                  cargando: generando === 'pdf',
                },
                {
                  icono: Table2,
                  etiqueta: 'Excel (.xlsx)',
                  detalle: 'Libro con seguimiento, tendencia y difíciles',
                  onClick: exportarExcel,
                  cargando: generando === 'excel',
                },
                {
                  icono: Download,
                  etiqueta: `CSV de la tabla${filtro ? ' (filtro)' : ''}`,
                  detalle: 'Tabla visible en CSV',
                  onClick: exportarCSV,
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* Qué atender esta semana: convierte el dato en acción. Cada chip filtra
          la tabla a su segmento; sin nadie en un segmento, el chip se apaga. */}
      {equipo && equipo.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-tinta-suave">
            Qué atender esta semana
          </p>
          {atencion.inactivo === 0 &&
          atencion['baja-precision'] === 0 &&
          atencion.obligatorios === 0 ? (
            <p className="mt-1.5 text-sm font-semibold text-exito-texto">
              🎉 Tu equipo está al día: nadie inactivo, sin brechas de precisión
              ni obligatorios pendientes.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {SEGMENTOS.map((s) => {
                const n = atencion[s.id]
                const activo = filtro === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={n === 0}
                    aria-pressed={activo}
                    onClick={() => setFiltro(activo ? null : s.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${s.clase} ${
                      activo ? 'ring-2 ring-offset-1' : ''
                    }`}
                  >
                    {s.etiqueta(n)}
                  </button>
                )
              })}
              {filtro && (
                <button
                  type="button"
                  onClick={() => setFiltro(null)}
                  className="text-xs font-semibold text-wom-600 hover:underline"
                >
                  Ver todos
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!equipo ? (
        <EstadoCarga texto="Cargando seguimiento…" />
      ) : (
        <Tarjeta className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-niebla text-left text-xs uppercase tracking-wide text-tinta-suave">
                <th className="px-5 py-3">Ejecutivo</th>
                <th className="px-5 py-3">Liga</th>
                <th className="px-5 py-3">XP</th>
                <th className="px-5 py-3">Precisión</th>
                <th className="px-5 py-3">Última práctica</th>
                <th className="px-5 py-3">Obligatorias</th>
                {conFicha && <th className="px-5 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => {
                const dias = diasDesde(r.ultima_actividad)
                const inactivo = dias === null || dias >= 7
                const precision = precisionPct(r.intentos, r.correctas)
                return (
                  <tr key={r.user_id} className="border-b border-niebla last:border-0">
                    <td className="px-5 py-3 font-semibold">{r.nombre}</td>
                    <td className="px-5 py-3">
                      <span title={ligaDe(r.liga).nombre}>{ligaDe(r.liga).icono}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 font-bold text-magenta-500">
                        <Zap className="size-3.5 fill-current" />
                        {r.xp}
                      </span>
                    </td>
                    <td className="px-5 py-3">{precision === null ? '—' : `${precision}%`}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          inactivo ? 'text-red-600' : 'text-exito-texto'
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${inactivo ? 'bg-red-500' : 'bg-exito'}`}
                        />
                        {dias === null
                          ? 'nunca'
                          : dias === 0
                            ? 'hoy'
                            : `hace ${dias} día${dias === 1 ? '' : 's'}`}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {r.obligatorias_pendientes > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          {r.obligatorias_pendientes} pendientes
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-exito-texto">al día</span>
                      )}
                    </td>
                    {conFicha && (
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/admin/relator/${r.user_id}`}
                          className="inline-flex items-center gap-0.5 text-sm font-semibold text-wom-600 hover:underline"
                        >
                          Ficha <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Tarjeta>
      )}

      {tendencia.some((t) => t.intentos > 0) && (
        <>
          <h2 className="mt-8 text-lg font-bold">Tendencia del equipo</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Últimas 8 semanas. La barra es cuántos ejercicios hizo el equipo esa
            semana; el % es su precisión.
          </p>
          <Tarjeta className="mt-3">
            <GraficoTendencia datos={tendencia} />
          </Tarjeta>
        </>
      )}

      {dificiles.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">⚠️ Contenido difícil</h2>
            <button
              type="button"
              onClick={exportarDificiles}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-tinta-suave transition-colors hover:text-wom-600"
            >
              <Download className="size-4" />
              Exportar CSV
            </button>
          </div>
          <p className="mt-1 text-sm text-tinta-suave">
            Dominios con precisión bajo 70%: candidatos a reforzar en sesiones o
            revisar sus preguntas.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {dificiles.slice(0, 3).map((d) => {
              const dom = DOMINIOS.find((x) => x.id === d.domain_id)
              return (
                <Tarjeta key={d.domain_id}>
                  <p className="font-bold">
                    {dom?.icono} {dom?.titulo ?? d.domain_id}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-red-600">
                    {d.precision_pct}%
                  </p>
                  <p className="text-xs text-tinta-suave">
                    {d.correctas}/{d.intentos} correctas del equipo
                  </p>
                </Tarjeta>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
