import { describe, expect, it } from 'vitest'
import {
  CAJA_MAXIMA,
  clasificarRespuesta,
  estaPendiente,
  maestriaDominio,
  proximoRepaso,
  siguienteCaja,
} from './srs'

describe('siguienteCaja', () => {
  it('sube una caja al acertar', () => {
    expect(siguienteCaja(1, true)).toBe(2)
    expect(siguienteCaja(4, true)).toBe(5)
  })
  it('no pasa de la caja máxima', () => {
    expect(siguienteCaja(CAJA_MAXIMA, true)).toBe(CAJA_MAXIMA)
  })
  it('vuelve a la caja 1 al fallar, desde donde sea', () => {
    expect(siguienteCaja(5, false)).toBe(1)
    expect(siguienteCaja(1, false)).toBe(1)
  })

  it('acierto seguro sube de caja; acierto con dudas se queda', () => {
    expect(siguienteCaja(2, true, true)).toBe(3)
    expect(siguienteCaja(2, true, false)).toBe(2)
    expect(siguienteCaja(CAJA_MAXIMA, true, false)).toBe(CAJA_MAXIMA)
  })
  it('el error vuelve a la caja 1 sin importar la seguridad', () => {
    expect(siguienteCaja(4, false, true)).toBe(1)
    expect(siguienteCaja(4, false, false)).toBe(1)
  })
})

describe('clasificarRespuesta', () => {
  it('cruza acierto × seguridad en los cuatro cuadrantes', () => {
    expect(clasificarRespuesta(true, true)).toBe('dominado')
    expect(clasificarRespuesta(true, false)).toBe('fragil')
    expect(clasificarRespuesta(false, false)).toBe('brecha')
    // El caso caro: seguro pero equivocado.
    expect(clasificarRespuesta(false, true)).toBe('misinformed')
  })
})

describe('proximoRepaso', () => {
  const lunes = new Date('2026-07-06T10:00:00')

  it('respeta los intervalos de Leitner', () => {
    const dias = (caja: number) =>
      Math.round(
        (new Date(proximoRepaso(caja, lunes)).getTime() - lunes.getTime()) / 86400000
      )
    expect(dias(1)).toBe(1)
    expect(dias(2)).toBe(2)
    expect(dias(3)).toBe(4)
    expect(dias(4)).toBe(8)
    expect(dias(5)).toBe(16)
  })

  it('agenda al inicio del día, no a la hora en que se practicó', () => {
    const tarde = new Date('2026-07-06T18:00:00')
    const f = new Date(proximoRepaso(1, tarde))
    expect(f.getHours()).toBe(0)
    expect(f.getMinutes()).toBe(0)
  })

  // El caso que motivó el arreglo: un relator del turno de tarde practicaba a
  // las 18:00 y al día siguiente, por la mañana, el Panel le decía que no tenía
  // repasos pendientes. El empujón para volver desaparecía.
  it('un repaso agendado para mañana está disponible mañana por la mañana', () => {
    const lunesTarde = new Date('2026-07-06T18:00:00')
    const martesManana = new Date('2026-07-07T08:00:00')
    const prox = proximoRepaso(1, lunesTarde)
    expect(estaPendiente({ proximo_repaso: prox } as never, martesManana)).toBe(true)
  })

  it('no adelanta el repaso al mismo día', () => {
    const lunesTarde = new Date('2026-07-06T18:00:00')
    const lunesNoche = new Date('2026-07-06T23:59:00')
    const prox = proximoRepaso(1, lunesTarde)
    expect(estaPendiente({ proximo_repaso: prox } as never, lunesNoche)).toBe(false)
  })
})

describe('estaPendiente', () => {
  it('está pendiente cuando la fecha ya pasó o es ahora mismo', () => {
    const ahora = new Date('2026-07-10T12:00:00')
    expect(estaPendiente({ proximo_repaso: '2026-07-09T12:00:00' } as never, ahora)).toBe(true)
    expect(estaPendiente({ proximo_repaso: '2026-07-10T12:00:00' } as never, ahora)).toBe(true)
    expect(estaPendiente({ proximo_repaso: '2026-07-11T12:00:00' } as never, ahora)).toBe(false)
  })
})

describe('maestriaDominio', () => {
  it('un dominio sin ejercicios no tiene maestría', () => {
    expect(maestriaDominio([], 0)).toBe(0)
  })
  it('todo en caja 1 es 0%: la caja 1 es el punto de partida', () => {
    expect(maestriaDominio([{ caja: 1 }, { caja: 1 }], 2)).toBe(0)
  })
  it('todo en la caja máxima es 100%', () => {
    expect(maestriaDominio([{ caja: 5 }, { caja: 5 }], 2)).toBe(100)
  })
  it('los ejercicios sin tarjeta cuentan como cero', () => {
    // Una tarjeta perfecta de dos ejercicios: la otra ni se ha visto.
    expect(maestriaDominio([{ caja: 5 }], 2)).toBe(50)
  })
  it('promedia el avance parcial', () => {
    // caja 3 → (3-1)/(5-1) = 0.5
    expect(maestriaDominio([{ caja: 3 }], 1)).toBe(50)
  })
  it('acota cajas fuera de rango en vez de superar el 100%', () => {
    expect(maestriaDominio([{ caja: 99 }], 1)).toBe(100)
  })
})
