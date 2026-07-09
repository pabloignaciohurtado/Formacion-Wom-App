import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DOMINIOS } from '../data/contenido'
import { ligaDe } from '../lib/gamificacion'
import { EstadoCarga, Tarjeta } from './ui'

type Fila = {
  user_id: string
  nombre: string
  liga: string
  xp: number
  intentos: number
  correctas: number
  ultima_actividad: string | null
  obligatorias_pendientes: number
}

type Dificultad = {
  domain_id: string
  intentos: number
  correctas: number
  precision_pct: number
}

function diasDesde(fecha: string | null): number | null {
  if (!fecha) return null
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
}

export function AdminEquipo() {
  const [equipo, setEquipo] = useState<Fila[] | null>(null)
  const [dificiles, setDificiles] = useState<Dificultad[]>([])

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      const [eq, dif] = await Promise.all([
        supabase.rpc('resumen_equipo'),
        supabase.rpc('precision_por_dominio'),
      ])
      if (cancelado) return
      setEquipo(eq.data ?? [])
      setDificiles((dif.data ?? []).filter((d) => d.precision_pct < 70).slice(0, 3))
    }
    void cargar()
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Seguimiento del equipo</h2>
      {!equipo ? (
        <EstadoCarga texto="Cargando seguimiento…" />
      ) : (
        <Tarjeta className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-niebla text-left text-xs uppercase tracking-wide text-tinta-suave">
                <th className="px-5 py-3">Relator</th>
                <th className="px-5 py-3">Liga</th>
                <th className="px-5 py-3">XP</th>
                <th className="px-5 py-3">Precisión</th>
                <th className="px-5 py-3">Última práctica</th>
                <th className="px-5 py-3">Obligatorias</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((r) => {
                const dias = diasDesde(r.ultima_actividad)
                const inactivo = dias === null || dias >= 7
                const precision =
                  r.intentos > 0 ? Math.round((100 * r.correctas) / r.intentos) : null
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
                          inactivo ? 'text-red-600' : 'text-exito'
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
                        <span className="text-xs font-semibold text-exito">al día</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/admin/relator/${r.user_id}`}
                        className="inline-flex items-center gap-0.5 text-sm font-semibold text-wom-600 hover:underline"
                      >
                        Ficha <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Tarjeta>
      )}

      {dificiles.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold">⚠️ Contenido difícil</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Dominios con precisión bajo 70%: candidatos a reforzar en sesiones o
            revisar sus preguntas.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {dificiles.map((d) => {
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
