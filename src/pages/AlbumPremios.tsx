import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { m, useReducedMotion } from 'motion/react'
import { useAuth } from '../auth/useAuth'
import { Esqueleto, Tarjeta } from '../components/ui'
import { InsigniaModal } from '../components/InsigniaModal'
import { EASE_OUT, STAGGER } from '../lib/motion'
import {
  agruparPorCategoria,
  obtenerAlbumInsignias,
  type AlbumInsignias,
  type InsigniaConEstado,
} from '../lib/catalogoInsignias'
import type { Insignia } from '../lib/insignias'

// Estilo por tier: un anillo de color y una etiqueta corta, para que el
// álbum se lea como una colección de medallas, no una lista plana.
const TIER_ESTILOS: Record<string, { anillo: string; texto: string; etiqueta: string }> = {
  bronce: { anillo: 'ring-[#b08d57]', texto: 'text-[#8a6a3f]', etiqueta: 'Bronce' },
  plata: { anillo: 'ring-gray-400', texto: 'text-gray-500', etiqueta: 'Plata' },
  oro: { anillo: 'ring-amber-400', texto: 'text-amber-600', etiqueta: 'Oro' },
}

function estiloTier(tier: string) {
  return TIER_ESTILOS[tier] ?? TIER_ESTILOS.bronce
}

function TarjetaInsignia({
  insignia,
  indice,
  reduce,
  onAbrir,
}: {
  insignia: InsigniaConEstado
  indice: number
  reduce: boolean
  onAbrir: () => void
}) {
  const tier = estiloTier(insignia.tier)
  return (
    <m.button
      type="button"
      onClick={insignia.obtenida ? onAbrir : undefined}
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduce ? 0 : indice * STAGGER,
        duration: 0.35,
        ease: EASE_OUT,
      }}
      className={`text-left ${insignia.obtenida ? 'cursor-pointer' : 'cursor-default'}`}
      aria-label={
        insignia.obtenida
          ? `${insignia.nombre}, obtenida`
          : `${insignia.nombre}, bloqueada: ${insignia.criterio}`
      }
    >
      <Tarjeta
        className={`flex h-full flex-col items-center gap-1.5 p-4 text-center ring-2 transition-opacity ${tier.anillo} ${
          insignia.obtenida ? '' : 'opacity-50 grayscale'
        }`}
      >
        <span className="grid size-14 place-items-center text-4xl">
          {insignia.obtenida ? insignia.icono : <Lock className="size-7 text-tinta-suave" />}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${tier.texto}`}>
          {tier.etiqueta}
        </span>
        <span className="text-sm font-bold leading-tight">{insignia.nombre}</span>
        <span className="text-xs leading-tight text-tinta-suave">
          {insignia.obtenida ? insignia.descripcion : insignia.criterio}
        </span>
      </Tarjeta>
    </m.button>
  )
}

export default function AlbumPremios() {
  const { user, perfil } = useAuth()
  const reduce = useReducedMotion()
  const [datos, setDatos] = useState<AlbumInsignias | null>(null)
  const [seleccion, setSeleccion] = useState<Insignia | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelado = false
    void obtenerAlbumInsignias(user.id).then((r) => {
      if (!cancelado) setDatos(r)
    })
    return () => {
      cancelado = true
    }
  }, [user])

  const nombrePila = (perfil?.nombre ?? '').split(/[\s.]+/)[0] || 'ejecutivo'

  if (!datos) {
    return (
      <section>
        <Esqueleto className="h-9 w-64" />
        <Esqueleto className="mt-4 h-20" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Esqueleto key={i} className="h-36" />
          ))}
        </div>
      </section>
    )
  }

  const grupos = agruparPorCategoria(datos.insignias)
  const pct = datos.total > 0 ? Math.round((datos.obtenidas / datos.total) * 100) : 0

  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">
        Álbum de premios de <span className="capitalize text-magenta-500">{nombrePila}</span>
      </h1>
      <p className="mt-1 text-tinta-suave">
        Insignias por desempeño (ventas, retención, post-venta, habilidades blandas,
        satisfacción, constancia y cultura) y de formación.
      </p>

      <Tarjeta className="mt-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            <strong className="text-lg text-enlace">{datos.obtenidas}</strong> de {datos.total}{' '}
            insignias obtenidas
          </span>
          <span className="text-tinta-suave">{pct}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-niebla">
          <m.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduce ? 0 : 0.8, ease: EASE_OUT, delay: reduce ? 0 : 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-wom-600 to-magenta-500"
          />
        </div>
      </Tarjeta>

      {grupos.map((grupo) => (
        <div key={grupo.categoria}>
          <h2 className="mt-8 text-lg font-bold">{grupo.etiqueta}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {grupo.insignias.map((insignia, i) => (
              <TarjetaInsignia
                key={insignia.id}
                insignia={insignia}
                indice={i}
                reduce={!!reduce}
                onAbrir={() =>
                  setSeleccion({
                    id: insignia.id,
                    nombre: insignia.nombre,
                    descripcion: insignia.descripcion,
                    icono: insignia.icono,
                  })
                }
              />
            ))}
          </div>
        </div>
      ))}

      <InsigniaModal
        insignia={seleccion}
        titulo="Insignia obtenida"
        onCerrar={() => setSeleccion(null)}
      />
    </section>
  )
}
