import { describe, expect, it, vi } from 'vitest'
import {
  crearUsuariosMasivo,
  parsearCSVUsuarios,
  resolverSupervisores,
  validarFilasCarga,
  type FilaValidada,
} from './cargaMasivaUsuarios'

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

describe('parsearCSVUsuarios', () => {
  it('parsea filas usando el encabezado, sin exigir un orden fijo de columnas', () => {
    const csv =
      'email,nombre,role,supervisor_email\r\n' +
      'sole@wom.cl,Sole Rojas,ejecutivo,erik@wom.cl'
    expect(parsearCSVUsuarios(csv)).toEqual([
      {
        nombre: 'Sole Rojas',
        email: 'sole@wom.cl',
        role: 'ejecutivo',
        supervisorEmail: 'erik@wom.cl',
      },
    ])
  })

  it('normaliza email y role a minúsculas, y hace trim', () => {
    const csv = 'nombre,email,role,supervisor_email\r\n Sole , SOLE@WOM.CL , Ejecutivo , '
    expect(parsearCSVUsuarios(csv)).toEqual([
      { nombre: 'Sole', email: 'sole@wom.cl', role: 'ejecutivo', supervisorEmail: '' },
    ])
  })

  it('archivo vacío o solo con encabezado da lista vacía', () => {
    expect(parsearCSVUsuarios('')).toEqual([])
    expect(parsearCSVUsuarios('nombre,email,role,supervisor_email')).toEqual([])
  })
})

describe('validarFilasCarga', () => {
  it('fila completa y válida no tiene errores', () => {
    const [fila] = validarFilasCarga([
      { nombre: 'Sole', email: 'sole@wom.cl', role: 'ejecutivo', supervisorEmail: '' },
    ])
    expect(fila.valida).toBe(true)
    expect(fila.errores).toEqual([])
    expect(fila.fila).toBe(1)
  })

  it('sin role, cae a ejecutivo por defecto', () => {
    const [fila] = validarFilasCarga([
      { nombre: 'Sole', email: 'sole@wom.cl', role: '', supervisorEmail: '' },
    ])
    expect(fila.role).toBe('ejecutivo')
    expect(fila.valida).toBe(true)
  })

  it('detecta campos obligatorios faltantes', () => {
    const [fila] = validarFilasCarga([
      { nombre: '', email: '', role: '', supervisorEmail: '' },
    ])
    expect(fila.valida).toBe(false)
    expect(fila.errores).toEqual(expect.arrayContaining(['Falta el nombre', 'Falta el email']))
  })

  it('detecta un email con formato inválido', () => {
    const [fila] = validarFilasCarga([
      { nombre: 'Sole', email: 'no-es-un-email', role: '', supervisorEmail: '' },
    ])
    expect(fila.valida).toBe(false)
    expect(fila.errores).toContain('Email con formato inválido')
  })

  it('detecta un rol desconocido', () => {
    const [fila] = validarFilasCarga([
      { nombre: 'Sole', email: 'sole@wom.cl', role: 'gerente', supervisorEmail: '' },
    ])
    expect(fila.valida).toBe(false)
    expect(fila.errores[0]).toMatch(/Rol desconocido/)
  })

  it('marca como duplicados todos los emails repetidos dentro del archivo', () => {
    const filas = validarFilasCarga([
      { nombre: 'Sole', email: 'sole@wom.cl', role: '', supervisorEmail: '' },
      { nombre: 'Sole 2', email: 'sole@wom.cl', role: '', supervisorEmail: '' },
    ])
    expect(filas[0].valida).toBe(false)
    expect(filas[1].valida).toBe(false)
    expect(filas[0].errores).toContain('Email duplicado en el archivo')
    expect(filas[1].errores).toContain('Email duplicado en el archivo')
  })

  it('numera las filas empezando en 1, en el mismo orden de entrada', () => {
    const filas = validarFilasCarga([
      { nombre: 'A', email: 'a@wom.cl', role: '', supervisorEmail: '' },
      { nombre: 'B', email: 'b@wom.cl', role: '', supervisorEmail: '' },
    ])
    expect(filas.map((f) => f.fila)).toEqual([1, 2])
  })
})

describe('resolverSupervisores', () => {
  const base: FilaValidada = {
    fila: 1,
    nombre: 'Sole',
    email: 'sole@wom.cl',
    role: 'ejecutivo',
    supervisorEmail: '',
    supervisorId: null,
    errores: [],
    valida: true,
  }

  it('sin supervisor_email, no hace nada', () => {
    const [fila] = resolverSupervisores([base], [])
    expect(fila.supervisorId).toBeNull()
    expect(fila.valida).toBe(true)
  })

  it('resuelve el email a un id existente (comparación insensible a mayúsculas)', () => {
    const [fila] = resolverSupervisores(
      [{ ...base, supervisorEmail: 'erik@wom.cl' }],
      [{ id: 'sup-1', email: 'Erik@Wom.cl' }]
    )
    expect(fila.supervisorId).toBe('sup-1')
    expect(fila.valida).toBe(true)
  })

  it('si el supervisor no existe, marca error y la fila deja de ser válida', () => {
    const [fila] = resolverSupervisores([{ ...base, supervisorEmail: 'nadie@wom.cl' }], [])
    expect(fila.valida).toBe(false)
    expect(fila.errores[0]).toMatch(/Supervisor no encontrado/)
  })
})

describe('crearUsuariosMasivo', () => {
  const filaBase: FilaValidada = {
    fila: 1,
    nombre: 'Sole',
    email: 'sole@wom.cl',
    role: 'ejecutivo',
    supervisorEmail: '',
    supervisorId: null,
    errores: [],
    valida: true,
  }

  it('ignora las filas inválidas y solo procesa las válidas', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { id: 'u1', email: 'sole@wom.cl', password: 'x' },
      error: null,
    } as never)

    const resultado = await crearUsuariosMasivo([
      filaBase,
      { ...filaBase, fila: 2, valida: false, errores: ['Falta el email'] },
    ])

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1)
    expect(resultado).toEqual({ exitosos: 1, fallidos: [] })
  })

  it('acumula éxitos y fallos, y reporta el motivo del fallo', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({
        data: { id: 'u1', email: 'a@wom.cl', password: 'x' },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: null,
        error: new Error('Ya existe una cuenta con ese correo'),
      } as never)

    const resultado = await crearUsuariosMasivo([
      { ...filaBase, email: 'a@wom.cl' },
      { ...filaBase, fila: 2, email: 'b@wom.cl' },
    ])

    expect(resultado.exitosos).toBe(1)
    expect(resultado.fallidos).toEqual([
      { fila: 2, email: 'b@wom.cl', ok: false, motivo: 'Ya existe una cuenta con ese correo' },
    ])
  })

  it('llama a onProgreso después de cada fila procesada', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { id: 'u1', email: 'a@wom.cl', password: 'x' },
      error: null,
    } as never)

    const progreso = vi.fn()
    await crearUsuariosMasivo(
      [
        { ...filaBase, email: 'a@wom.cl' },
        { ...filaBase, fila: 2, email: 'b@wom.cl' },
      ],
      progreso
    )

    expect(progreso).toHaveBeenNthCalledWith(1, 1, 2)
    expect(progreso).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it('pasa supervisor_id resuelto y role al invocar el edge function', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { id: 'u1', email: 'sole@wom.cl', password: 'x' },
      error: null,
    } as never)

    await crearUsuariosMasivo([{ ...filaBase, supervisorId: 'sup-1', role: 'supervisor' }])

    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-crear-usuario', {
      body: {
        nombre: 'Sole',
        email: 'sole@wom.cl',
        role: 'supervisor',
        supervisor_id: 'sup-1',
      },
    })
  })
})
