import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Download, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DOMINIOS } from '../data/contenido'
import { ligaDe } from '../lib/gamificacion'
import { generarCSV, descargarCSV } from '../lib/csv'
import {
  contarAtencion,
  diasDesde,
  enSegmento,
  precisionPct,
  type FilaEquipo,
  type Segmento,
} from '../lib/seguimiento'
import { EstadoCarga, Tarjeta } from './ui'

type Dificultad = {
  domain_id: string
  intentos: number
  correctas: number
  precision_pct: number
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

function nombreDominio(id: string): string {
  return DOMINIOS.find((d) => d.id === id)?.titulo ?? id
}

// `conFicha` controla la columna de la ficha individual: el admin la tiene;
// un supervisor no, porque esa ruta y sus consultas son de admin.
export function AdminEquipo({ conFicha = true }: { conFicha?: boolean }) {
  const [equipo, setEquipo] = useState<FilaEquipo[] | null>(null)
  const [dificiles, setDificiles] = useState<Dificultad[]>([])
  const [filtro, setFiltro] = useState<Segmento | null>(null)

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      const [eq, dif] = await Promise.all([
        supabase.rpc('resumen_equipo'),
        supabase.rpc('precision_por_dominio'),
      ])
      if (cancelado) return
      setEquipo(eq.data ?? [])
      setDificiles((dif.data ?? []).filter((d) => d.precision_pct < 70))
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

  const exportarEquipo = () => {
    const filas = visibles.map((r) => {
      const p = precisionPct(r.intentos, r.correctas)
      const d = diasDesde(r.ultima_actividad)
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
    const csv = generarCSV(
      [
        'Ejecutivo',
        'Liga',
        'XP',
        'Intentos',
        'Correctas',
        'Precisión %',
        'Días desde última práctica',
        'Obligatorias pendientes',
      ],
      filas
    )
    descargarCSV('seguimiento-equipo.csv', csv)
  }

  const exportarDificiles = () => {
    const csv = generarCSV(
      ['Dominio', 'Precisión %', 'Correctas', 'Intentos'],
      dificiles.map((d) => [
        nombreDominio(d.domain_id),
        d.precision_pct,
        d.correctas,
        d.intentos,
      ])
    )
    descargarCSV('contenido-dificil.csv', csv)
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Seguimiento del equipo</h2>
        {equipo && equipo.length > 0 && (
          <button
            type="button"
            onClick={exportarEquipo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-tinta-suave transition-colors hover:text-wom-600"
          >
            <Download className="size-4" />
            Exportar CSV{filtro ? ' (filtro)' : ''}
          </button>
        )}
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
