import { describe, expect, it, vi } from 'vitest'
import {
  INSIGNIAS,
  evaluarInsignias,
  otorgarInsigniaManual,
  sincronizarInsignias,
  type ContextoInsignias,
} from './insignias'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const vacio: ContextoInsignias = {
  intentos: 0,
  racha: 0,
  tieneDominio100: false,
  fueHeroe: false,
  obligatoriasAlDia: false,
}
const con = (p: Partial<ContextoInsignias>) => evaluarInsignias({ ...vacio, ...p })

describe('evaluarInsignias', () => {
  it('sin actividad no otorga ninguna', () => {
    expect(con({})).toEqual([])
  })

  it('el primer ejercicio otorga la primera insignia', () => {
    expect(con({ intentos: 1 })).toContain('primera-sesion')
  })

  it('las rachas son acumulativas: 14 días implica 3 y 7', () => {
    const r = con({ racha: 14 })
    expect(r).toEqual(expect.arrayContaining(['racha-3', 'racha-7', 'racha-14']))
  })

  it('respeta los umbrales exactos', () => {
    expect(con({ racha: 2 })).not.toContain('racha-3')
    expect(con({ racha: 3 })).toContain('racha-3')
    expect(con({ intentos: 49 })).not.toContain('ejercicios-50')
    expect(con({ intentos: 50 })).toContain('ejercicios-50')
    expect(con({ intentos: 99 })).not.toContain('ejercicios-100')
    expect(con({ intentos: 100 })).toContain('ejercicios-100')
  })

  it('los hitos de volumen son acumulativos', () => {
    expect(con({ intentos: 100 })).toEqual(
      expect.arrayContaining(['primera-sesion', 'ejercicios-50', 'ejercicios-100'])
    )
  })

  it('cada bandera otorga su insignia', () => {
    expect(con({ tieneDominio100: true })).toContain('dominio-100')
    expect(con({ fueHeroe: true })).toContain('heroe-semana')
    expect(con({ obligatoriasAlDia: true })).toContain('obligatorias-al-dia')
  })
})

describe('catálogo', () => {
  it('no tiene identificadores repetidos', () => {
    const ids = INSIGNIAS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Una insignia que se otorga pero no está en el catálogo no se puede mostrar:
  // el modal quedaría sin nombre ni icono.
  it('toda insignia otorgable existe en el catálogo', () => {
    const todas = evaluarInsignias({
      intentos: 100,
      racha: 14,
      tieneDominio100: true,
      fueHeroe: true,
      obligatoriasAlDia: true,
    })
    const catalogo = new Set(INSIGNIAS.map((i) => i.id))
    for (const id of todas) expect(catalogo.has(id)).toBe(true)
  })

  it('el catálogo cubre todas las insignias otorgables', () => {
    const otorgables = new Set(
      evaluarInsignias({
        intentos: 100,
        racha: 14,
        tieneDominio100: true,
        fueHeroe: true,
        obligatoriasAlDia: true,
      })
    )
    for (const i of INSIGNIAS) expect(otorgables.has(i.id)).toBe(true)
  })
})

// Auditoría: toda insignia auto-otorgada por el sistema debe quedar con
// otorgado_por = null explícito (nunca auth.uid() del usuario, que sería
// conceptualmente incorrecto: el sistema evalúa reglas, el usuario no se
// "otorga a sí mismo" la insignia).
describe('sincronizarInsignias', () => {
  it('inserta las insignias nuevas con otorgado_por en null', async () => {
    const { supabase } = await import('./supabase')
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    const nuevas = await sincronizarInsignias(
      'user-1',
      { intentos: 1, racha: 0, tieneDominio100: false, fueHeroe: false, obligatoriasAlDia: false },
      new Set()
    )

    expect(supabase.from).toHaveBeenCalledWith('insignias_usuario')
    expect(upsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', insignia_id: 'primera-sesion', otorgado_por: null }],
      { onConflict: 'user_id,insignia_id', ignoreDuplicates: true }
    )
    expect(nuevas.map((i) => i.id)).toEqual(['primera-sesion'])
  })

  it('no llama a supabase si no hay insignias nuevas que otorgar', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.from).mockClear()

    const nuevas = await sincronizarInsignias(
      'user-1',
      { intentos: 1, racha: 0, tieneDominio100: false, fueHeroe: false, obligatoriasAlDia: false },
      new Set(['primera-sesion'])
    )

    expect(supabase.from).not.toHaveBeenCalled()
    expect(nuevas).toEqual([])
  })
})

// Auditoría: todo otorgamiento manual (admin desde AdminOtorgarInsignias.tsx)
// debe quedar con otorgado_por = el uuid del admin que lo hizo. Nunca null.
describe('otorgarInsigniaManual', () => {
  it('guarda el uuid del admin en otorgado_por y la nota si viene', async () => {
    const { supabase } = await import('./supabase')
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    const resultado = await otorgarInsigniaManual(
      'ejecutivo-1',
      'venta-oro',
      'admin-1',
      '  Mejor cierre del mes  '
    )

    expect(supabase.from).toHaveBeenCalledWith('insignias_usuario')
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'ejecutivo-1',
        insignia_id: 'venta-oro',
        otorgado_por: 'admin-1',
        nota: 'Mejor cierre del mes',
      },
      { onConflict: 'user_id,insignia_id', ignoreDuplicates: true }
    )
    expect(resultado.error).toBeNull()
  })

  it('sin nota, la guarda como null (no como string vacío)', async () => {
    const { supabase } = await import('./supabase')
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    await otorgarInsigniaManual('ejecutivo-1', 'venta-oro', 'admin-1')

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ nota: null }),
      expect.anything()
    )
  })

  it('propaga el error de Supabase sin mostrar éxito', async () => {
    const { supabase } = await import('./supabase')
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'RLS: no autorizado' } })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    const resultado = await otorgarInsigniaManual('ejecutivo-1', 'venta-oro', 'admin-1')

    expect(resultado.error).toBe('RLS: no autorizado')
  })
})
