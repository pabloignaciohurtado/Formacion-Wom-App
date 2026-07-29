import { describe, expect, it, vi } from 'vitest'
import { aplicarFuncionalidadAUsuarios, tieneAcceso } from './funcionalidades'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Cascada de resolución de acceso (ver comentario de cabecera en
// `funcionalidades.ts`): 1) override individual, 2) grupo de acceso,
// 3) default habilitado.
describe('tieneAcceso', () => {
  it('caso 3 (default): sin override individual ni grupo, el acceso está habilitado', () => {
    expect(tieneAcceso(new Map(), null, 'ejercicios')).toBe(true)
    expect(tieneAcceso(new Map(), new Map(), 'ejercicios')).toBe(true)
  })

  it('caso 2 (grupo): sin override individual, manda el valor del grupo', () => {
    const grupo = new Map([['premios', true], ['ejercicios', false]])
    expect(tieneAcceso(new Map(), grupo, 'premios')).toBe(true)
    expect(tieneAcceso(new Map(), grupo, 'ejercicios')).toBe(false)
    // el grupo no opina de 'liga' -> cae al default habilitado
    expect(tieneAcceso(new Map(), grupo, 'liga')).toBe(true)
  })

  it('caso 1 (override individual): manda por sobre el grupo, en ambos sentidos', () => {
    const grupo = new Map([['premios', false]])
    const overrideHabilita = new Map([['premios', true]])
    const overrideRestringe = new Map([['ejercicios', false]])

    // el grupo restringe 'premios', pero el override individual se lo devuelve
    expect(tieneAcceso(overrideHabilita, grupo, 'premios')).toBe(true)
    // el grupo no dice nada de 'ejercicios' (default habilitado), pero el
    // override individual lo restringe de todas formas
    expect(tieneAcceso(overrideRestringe, grupo, 'ejercicios')).toBe(false)
  })

  it('restringir una funcionalidad no afecta a las demás (default sigue habilitado)', () => {
    const overrides = new Map([['liga', false]])
    expect(tieneAcceso(overrides, null, 'liga')).toBe(false)
    expect(tieneAcceso(overrides, null, 'ejercicios')).toBe(true)
    expect(tieneAcceso(overrides, null, 'consultas')).toBe(true)
  })
})

// Acción masiva: toca `perfil_funcionalidades` (el override individual) para
// varios usuarios de una sola vez, en batch (un solo upsert/delete, no N
// llamadas).
describe('aplicarFuncionalidadAUsuarios', () => {
  it('sin usuarios seleccionados, no llama a supabase', async () => {
    const { supabase } = await import('./supabase')
    const resultado = await aplicarFuncionalidadAUsuarios([], 'premios', 'habilitar')
    expect(resultado).toEqual({ actualizados: 0, error: null })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('"habilitar" hace un solo upsert con habilitado=true para todos los IDs', async () => {
    const { supabase } = await import('./supabase')
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    const resultado = await aplicarFuncionalidadAUsuarios(['u1', 'u2'], 'premios', 'habilitar')

    expect(supabase.from).toHaveBeenCalledWith('perfil_funcionalidades')
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(
      [
        { profile_id: 'u1', funcionalidad_id: 'premios', habilitado: true },
        { profile_id: 'u2', funcionalidad_id: 'premios', habilitado: true },
      ],
      { onConflict: 'profile_id,funcionalidad_id' }
    )
    expect(resultado).toEqual({ actualizados: 2, error: null })
  })

  it('"deshabilitar" hace un solo upsert con habilitado=false', async () => {
    const { supabase } = await import('./supabase')
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    const resultado = await aplicarFuncionalidadAUsuarios(['u1'], 'consultas', 'deshabilitar')

    expect(upsert).toHaveBeenCalledWith(
      [{ profile_id: 'u1', funcionalidad_id: 'consultas', habilitado: false }],
      { onConflict: 'profile_id,funcionalidad_id' }
    )
    expect(resultado).toEqual({ actualizados: 1, error: null })
  })

  it('"quitar_excepcion" hace un solo delete con .in sobre los IDs', async () => {
    const { supabase } = await import('./supabase')
    const inFn = vi.fn().mockResolvedValue({ error: null })
    const eqFn = vi.fn().mockReturnValue({ in: inFn })
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn })
    vi.mocked(supabase.from).mockReturnValue({ delete: deleteFn } as never)

    const resultado = await aplicarFuncionalidadAUsuarios(
      ['u1', 'u2', 'u3'],
      'ejercicios',
      'quitar_excepcion'
    )

    expect(supabase.from).toHaveBeenCalledWith('perfil_funcionalidades')
    expect(deleteFn).toHaveBeenCalledTimes(1)
    expect(eqFn).toHaveBeenCalledWith('funcionalidad_id', 'ejercicios')
    expect(inFn).toHaveBeenCalledWith('profile_id', ['u1', 'u2', 'u3'])
    expect(resultado).toEqual({ actualizados: 3, error: null })
  })

  it('propaga el error de supabase sin marcar usuarios como actualizados', async () => {
    const { supabase } = await import('./supabase')
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    const resultado = await aplicarFuncionalidadAUsuarios(['u1'], 'liga', 'habilitar')
    expect(resultado).toEqual({ actualizados: 0, error: 'boom' })
  })
})
