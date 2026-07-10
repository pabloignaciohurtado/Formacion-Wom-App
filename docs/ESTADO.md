# Estado y traspaso

Escrito el 10 de julio de 2026, al final de una sesión larga. Sirve para retomar
sin volver a descubrir lo que ya costó descubrir.

---

## 1. El modelo, tal como es

Tres roles. **El rol es aditivo: un supervisor también aprende.**

| Rol | Qué hace |
|---|---|
| `ejecutivo` | Practica. Es quien atiende al cliente. |
| `supervisor` | Practica **y** asigna módulos obligatorios a su equipo. |
| `admin` | Gestiona la plataforma. |

Hasta el 10-jul, `role` valía `'relator'` o `'admin'`, y **`relator` significaba
"quien aprende"** — lo contrario de lo que la palabra significa en la operación.
Se renombró. Cuidado: el nombre interno del componente `FichaRelator` y la ruta
`/admin/relator/:id` se conservan a propósito (romper enlaces guardados no
aporta nada).

**Dos tipos de contenido:**

- **Módulos de repaso** — los 12 dominios de `src/data/contenido.ts`. Abiertos
  para todos, no obligatorios. Se practican con repaso espaciado (Leitner).
- **Módulos obligatorios** — la tabla `actividades`. Los asigna un supervisor o
  un admin, con `alcance` (`'todos' | 'equipo' | 'persona'`) y destinatarios en
  `actividades_destinatarios`.

`profiles.supervisor_id` dice de quién es equipo cada persona. Sin eso, "asignar
a mi equipo" era incalculable.

---

## 2. La liga

**XP y puntaje son cosas distintas, y hasta el 10-jul estaban confundidas.**

- **XP** → progreso acumulado de siempre. Define el **nivel** (Aprendiz,
  Explorador, …). Se calcula en el cliente, en `gamificacion.ts`.
- **Puntaje semanal** → desempeño de una semana. Define la **liga**. Se calcula
  en la base, en `puntaje_semanal(ini, fin)`.

### La fórmula

| Componente | Peso | Tope |
|---|---|---|
| Módulo obligatorio completado **dentro de plazo** | 80 c/u | — |
| Día activo (≥ 3 intentos, en horario de Chile) | 12 c/u | 5 días → 60 |
| Acierto en módulo de repaso | 1 c/u | 25 |

Cada decisión tiene una razón, y todas se pueden probar:

- **El tope de 25 aciertos desactiva el atracón.** Sin él, quien responde 100
  ejercicios de una sentada gana a quien vuelve cinco días.
- **Un día activo exige 3 intentos.** Con un solo intento, abrir la app cinco
  veces valía 60 puntos: más que una sesión real. La regularidad debe medir
  práctica, no visitas.
- **Los días se cuentan en `America/Santiago`, no en UTC.** Una sesión de tarde
  que cruza la medianoche del meridiano no debe contar como dos días.

### El corte semanal

Lo ejecuta **pg_cron** (tarea `corte-semanal-ligas`, a diario, 05:05 UTC), no la
carga del Panel. La función `asegurar_corte_semanal()` es idempotente: inserta
la semana con `ON CONFLICT DO NOTHING` y sale si ya estaba. Correrla a diario
elimina cualquier duda sobre husos horarios y cambios de hora.

- **Ascender**: top 2 de la liga, **y solo si hay ≥ 4 compitiendo** (puntaje > 0).
  Antes, una liga de dos personas ascendía a las dos cada semana.
- **Descender**: puntaje 0, que ahora significa *no entró*. Antes bastaba con
  responder una pregunta para salvarse.
- **Desempates**: obligatorios → días → aciertos. El mismo orden de la fórmula.

`asegurar_corte_semanal()` ya **no** es invocable por `authenticated`. Un
ejecutivo no debe poder disparar el recálculo de ligas de todo el equipo.

---

## 3. Lo que falta, y es lo más grande

**No existe interfaz para que un supervisor asigne módulos obligatorios.**

La base lo permite desde el 10-jul: RLS deja a un supervisor crear actividades y
asignar destinatarios **solo de su equipo**. Pero `AdminActividades` sigue siendo
una pantalla de admin, no ofrece elegir `alcance` ni buscar destinatarios, y no
aparece para supervisores.

Consecuencia directa: `actividades_destinatarios` está vacía, y **el término de
mayor peso de la liga —los obligatorios— vale cero para todos**.

Lo que hace falta:

1. `AdminActividades` accesible a supervisores (`puedeAsignar()` en `roles.ts`).
2. Selector de alcance: todos / mi equipo / personas concretas.
3. Buscador de destinatarios, limitado a `supervisor_id = auth.uid()` para
   supervisores; sin límite para admins. **La RLS ya lo impone; la interfaz solo
   debe no ofrecer lo que la base va a rechazar.**
4. Una pantalla de equipo: asignar `supervisor_id` a cada ejecutivo. Hoy la
   columna existe y está toda a `null`.

> **Actualización (10-jul, tarde):** cerrado. La pantalla **Mi equipo**
> (`/equipo`, ruta de `puedeAsignar()`) da a supervisores seguimiento y
> asignación con alcance equipo/personas; el admin asigna rol y supervisor
> desde la tabla de usuarios de Administración. Por el camino aparecieron y
> se corrigieron dos bugs que los tipos desactualizados ocultaban: las
> políticas de `actividades`/`actividades_destinatarios` del 10-jul eran
> **mutuamente recursivas** (42P17: toda lectura de actividades fallaba), y
> el Panel mostraba `undefined` en ranking/héroes porque esperaba `xp` de
> funciones que ya devuelven `puntaje`. Migraciones:
> `supervisores_ven_su_equipo` y `destinatarios_sin_recursion`; rollback en
> `docs/rollback-supervisores-ven-su-equipo.sql`.

---

## 4. Deuda conocida, con su porqué

- **`activity_events`** — 205 filas del 15-jun al 7-jul-2026. El primer commit
  del repo es del 8-jul. Viene de un prototipo anterior que compartía el mismo
  proyecto de Supabase. Ningún código la toca. Se conserva por su valor
  histórico.
- **`obtenerEjercicio()`** en `contenido.ts` — cero llamadas. Seis líneas.
- **Existe un nivel llamado «Relator»** en `NIVELES`, entre Explorador y
  Experto. Un ejecutivo puede alcanzarlo sin serlo jamás. Renombrar niveles es
  una decisión de producto.
- **253 KB de `@supabase/storage-js`, `realtime-js` y `phoenix`** viajan en el
  bundle y la app no usa ninguno. `SupabaseClient` los instancia en su
  constructor, así que ningún tree-shaking los alcanza. Sacarlos exigiría aliasar
  paquetes de terceros a stubs falsos: funcionaría hoy y se rompería en silencio
  con la próxima actualización.
- **Leaked password protection** está desactivada en Supabase Auth. Es de plan
  Pro; el linter lo reporta sin decirlo.
- **Los seis avisos de `SECURITY DEFINER`** del linter son correctos y esperados.
  Ningún RPC es invocable sin sesión (probado: 401 en los siete), y las dos
  funciones de administración filtran con `where is_admin()`.

---

## 5. El elefante

| | |
|---|---|
| Intentos en las últimas dos semanas | **5** |
| Último registro de usuario | 16 de junio |
| Cortes semanales ejecutados | **1** |
| Ejecutivos fuera de bronce | **0** |

172 intentos totales, ninguno desde el 17 de junio. Ocho personas probaron la app
dos días en junio y no volvieron.

Un candidato serio a explicar parte de eso se arregló el 10-jul: `proximoRepaso()`
conservaba la hora, así que quien practicaba a las 18:00 abría la app al día
siguiente por la mañana y el Panel le decía **«0 repasos pendientes»**. El CTA
pasaba de *«Repasar ahora (7 pendientes)»* a *«Ir a practicar»*. En una app cuyo
motor es la racha, eso apaga el motor.

No es toda la explicación. Entender por qué no volvieron vale más que cualquier
kilobyte.

---

## 6. Reglas de la casa

- Nada va directo a `main`. Rama → PR → **CI verde** → merge.
- El CI corre `oxlint`, `vitest` y `tsc -b && vite build`.
- `npm run build` **falla a propósito** si faltan `VITE_SUPABASE_URL` o
  `VITE_SUPABASE_ANON_KEY`. La guarda vive en `vite.config.ts` y no en el
  workflow, porque un workflow solo protege a su propio destino.
- Un solo destino de producción: GitHub Pages, en cada push a `main`.
  Ver `docs/DESPLIEGUE.md`.
- Toda migración de RLS lleva su rollback escrito. Ver `docs/rls-rollback.sql`.
- **Al hacer squash de un PR, las ramas apiladas encima quedan en conflicto.**
  Mergea con `--merge`, o rebasa antes.
