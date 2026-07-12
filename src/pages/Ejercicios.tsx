import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, ChevronRight } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { CATEGORIAS, DOMINIOS, type Dominio } from '../data/contenido'
import { estaPendiente, maestriaDominio } from '../lib/srs'
import { descargarCertificado } from '../lib/certificado'
import { Esqueleto, Tarjeta } from '../components/ui'
import type { Tables } from '../lib/database.types'

type Meta = Tables<'goals'>

interface EstadoDominio {
  maestria: number
  pendientes: number
  nuevos: number
  meta: Meta | null
}

function TarjetaDominio({
  dominio,
  estado,
  indice,
  nombrePerfil,
}: {
  dominio: Dominio
  estado: EstadoDominio
  indice: number
  nombrePerfil: string
}) {
  const porHacer = estado.pendientes + estado.nuevos
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: indice * 0.05, duration: 0.3, ease: 'easeOut' }}
      className="h-full"
    >
      <Tarjeta className="flex h-full flex-col gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-wom-600">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-wom-50 text-lg">
              {dominio.icono}
            </span>
            {dominio.titulo}
          </h3>
          <p className="mt-0.5 text-sm text-tinta-suave">{dominio.descripcion}</p>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs font-semibold text-tinta-suave">
            <span>Maestría {estado.maestria}%</span>
            {estado.meta && <span>Meta {estado.meta.maestria_objetivo}%</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-niebla">
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${estado.maestria}%` }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-wom-600 to-magenta-500"
            />
          </div>
        </div>

        <p className="text-xs text-tinta-suave">
          {estado.pendientes} por repasar · {estado.nuevos} nuevos
        </p>

        <Link
          to={`/ejercicios/${dominio.id}`}
          className="mt-auto inline-flex items-center justify-between rounded-xl bg-wom-600 px-4 py-2.5 font-semibold text-white transition-all hover:bg-wom-700 active:scale-[0.98]"
        >
          {porHacer > 0 ? `Practicar (${porHacer})` : 'Repasar igual'}
          <ChevronRight className="size-5" />
        </Link>

        {estado.maestria === 100 && (
          <button
            type="button"
            onClick={() => descargarCertificado(nombrePerfil, dominio.titulo)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-exito px-4 py-2 font-semibold text-exito-texto transition-colors hover:bg-exito/10"
          >
            <Award className="size-5" />
            Descargar certificado
          </button>
        )}
      </Tarjeta>
    </m.div>
  )
}

export default function Ejercicios() {
  const { user, perfil } = useAuth()
  const [estados, setEstados] = useState<Record<string, EstadoDominio> | null>(
    null
  )
  const [activa, setActiva] = useState<string>(CATEGORIAS[0].id)

  useEffect(() => {
    if (!user) return
    let cancelado = false

    const cargar = async () => {
      const [cards, metas] = await Promise.all([
        supabase.from('srs_cards').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
      ])
      if (cancelado) return
      const porDominio: Record<string, EstadoDominio> = {}
      for (const dominio of DOMINIOS) {
        const cardsDominio = (cards.data ?? []).filter(
          (c) => c.domain_id === dominio.id
        )
        const conTarjeta = new Set(cardsDominio.map((c) => c.exercise_id))
        porDominio[dominio.id] = {
          maestria: maestriaDominio(cardsDominio, dominio.ejercicios.length),
          pendientes: cardsDominio.filter((c) => estaPendiente(c)).length,
          nuevos: dominio.ejercicios.filter((e) => !conTarjeta.has(e.id))
            .length,
          meta:
            (metas.data ?? []).find((m) => m.domain_id === dominio.id) ?? null,
        }
      }
      setEstados(porDominio)
      // Selecciona por defecto la categoría con más trabajo pendiente
      let mejor = CATEGORIAS[0].id
      let max = -1
      for (const cat of CATEGORIAS) {
        const pendientes = cat.dominios.reduce(
          (s, d) => s + (porDominio[d]?.pendientes ?? 0) + (porDominio[d]?.nuevos ?? 0),
          0
        )
        if (pendientes > max) {
          max = pendientes
          mejor = cat.id
        }
      }
      setActiva(mejor)
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [user])

  const categoriaActiva =
    CATEGORIAS.find((c) => c.id === activa) ?? CATEGORIAS[0]
  const dominiosActivos = categoriaActiva.dominios
    .map((id) => DOMINIOS.find((d) => d.id === id))
    .filter((d): d is Dominio => Boolean(d))

  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">Ejercicios</h1>
      <p className="mt-1 text-tinta-suave">
        Practica por dominio: acertar espacia el repaso, fallar lo trae de
        vuelta.
      </p>

      {!estados ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIAS.map((c) => (
              <Esqueleto key={c.id} className="h-28" />
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Esqueleto key={i} className="h-56" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Bloques de categoría: se elige uno y sus dominios aparecen abajo */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIAS.map((categoria) => {
              const dominios = categoria.dominios
                .map((id) => DOMINIOS.find((d) => d.id === id))
                .filter((d): d is Dominio => Boolean(d))
              const porHacer = dominios.reduce(
                (s, d) => s + estados[d.id].pendientes + estados[d.id].nuevos,
                0
              )
              const maestriaProm = Math.round(
                dominios.reduce((s, d) => s + estados[d.id].maestria, 0) /
                  Math.max(dominios.length, 1)
              )
              const seleccionada = activa === categoria.id
              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => setActiva(categoria.id)}
                  aria-pressed={seleccionada}
                  className={`flex flex-col gap-2 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition-all dark:ring-white/10 ${
                    seleccionada
                      ? 'shadow-[0_10px_30px_-14px_rgba(39,0,70,0.28)] ring-2 ring-wom-600'
                      : 'ring-black/5 hover:ring-wom-300'
                  }`}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-wom-600 to-magenta-500 text-xl">
                    {categoria.icono}
                  </span>
                  <span className="font-bold leading-tight">
                    {categoria.titulo}
                  </span>
                  <span className="mt-auto text-xs text-tinta-suave">
                    {dominios.length} dominios · maestría {maestriaProm}%
                  </span>
                  {porHacer > 0 && (
                    <span className="text-xs font-semibold text-magenta-500">
                      {porHacer} por hacer
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Dominios de la categoría seleccionada */}
          <AnimatePresence mode="wait">
            <m.div
              key={activa}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {dominiosActivos.map((dominio, i) => (
                <TarjetaDominio
                  key={dominio.id}
                  dominio={dominio}
                  estado={estados[dominio.id]}
                  indice={i}
                  nombrePerfil={perfil?.nombre ?? ''}
                />
              ))}
            </m.div>
          </AnimatePresence>
        </>
      )}
    </section>
  )
}
