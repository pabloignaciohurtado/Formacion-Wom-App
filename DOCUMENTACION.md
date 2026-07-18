# Formación WOM — Documentación del proyecto

Plataforma web interna de formación para relatores de WOM: ejercicios con
repaso espaciado, gamificación (XP, niveles, racha, ligas, insignias,
ranking), actividades obligatorias con seguimiento de cumplimiento, y panel
de administración con analítica por persona y por contenido.

- **En producción:** https://pabloignaciohurtado.github.io/Formacion-Wom-App/
- **Repositorio:** `pabloignaciohurtado/Formacion-Wom-App` (GitHub)
- **Estado:** en producción con datos reales (detalle en §16)

---

## 1. Visión general

El proyecto nació como una app de formación simple (auth + ejercicios) y
creció en capas sucesivas hasta alcanzar paridad funcional con plataformas
comerciales de microlearning corporativo (Axonify, SC Training/EdApp,
Qstream, TalentCards), replicando además las mecánicas de retención de
Duolingo (racha, ligas), a costo **$0** y con los datos en un proyecto
Supabase propio.

Dos roles:

- **Relator**: practica ejercicios, ve su progreso y gamificación, completa
  actividades obligatorias, hace consultas.
- **Administrador**: todo lo anterior, más activar/desactivar relatores,
  publicar actividades, responder consultas, asignar metas y ver analítica
  del equipo completo.

---

## 2. Arquitectura

```
┌───────────────────────┐        ┌────────────────────────────┐
│   Navegador (SPA)    │◄──────►│   Supabase (BaaS)         │
│   React 19 + Vite     │  REST  │   - Postgres + RLS         │
│   PWA / offline queue │  Auth  │   - Auth (email/password)  │
└──────────┬───────────┘        │   - Funciones SQL (RPC)    │
           │                     └────────────────────────────┘
           │ build estático
           ▼
┌──────────────────┐
│   GitHub Pages         │  ← publicado por GitHub Actions
│   (rama gh-pages)       │     en cada push a main
└──────────────────┘
```

**No hay backend propio.** El frontend habla directo con Supabase (Postgres
+ Auth + funciones RPC) usando la clave pública (`anon`); toda la seguridad
de acceso a datos vive en políticas **Row Level Security (RLS)** y en
funciones `SECURITY DEFINER` auditadas — nunca en el cliente.

**No hay servidor de aplicación.** Es una SPA 100% estática: el build de
Vite se publica en GitHub Pages y sirve directamente desde el CDN de
GitHub. Esto simplifica el despliegue a "push → build → publicar" sin
infraestructura que mantener.

### 2.1 Flujo de despliegue (CI/CD)

```
push a una rama de trabajo
   → PR (borrador) contra main
   → GitHub Actions "CI": npm install, oxlint, tsc + vite build
   → si está verde: merge a main
   → GitHub Actions "Deploy a GitHub Pages":
        build con --base=/Formacion-Wom-App/
        copia index.html → 404.html (fallback de SPA)
        publica el contenido de dist/ a la rama gh-pages (git push forzado)
   → GitHub Pages sirve gh-pages en la URL pública
```

Archivos clave: `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`.

**Por qué `npm install` y no `npm ci`**: el proxy de la sesión automatizada
no permite pushear por API el `package-lock.json` regenerado (~268 KB), así
que al cambiar dependencias el lock puede quedar detrás de `package.json`.
`npm install` reconcilia ambos y compila; `npm ci` fallaría por lock
desincronizado. Para volver a `npm ci` estricto basta regenerar y commitear
el lock desde un entorno con push directo (`npm install && git commit
package-lock.json`).

**Por qué `gh-pages` y no el flujo nativo de Pages ("GitHub Actions" como
source)**: el token del workflow no tiene permiso para *habilitar* el sitio
de Pages vía API (`Resource not accessible by integration`). Publicar el
build directo a la rama `gh-pages` con `contents: write` evita ese permiso
y es igual de automático.

**Por qué el `base` de Vite es `/Formacion-Wom-App/`**: GitHub Pages de un
repo (no de usuario) sirve bajo un subpath. El router (`BrowserRouter`) usa
`basename={import.meta.env.BASE_URL}` para que el mismo código funcione en
local (`/`) y en producción (`/Formacion-Wom-App/`) sin ramas de código
distintas.

---

## 3. Stack tecnológico

| Capa | Elección | Motivo |
|---|---|---|
| Framework UI | React 19 + TypeScript | Tipado fuerte end-to-end con los tipos generados de Supabase |
| Build | Vite 8 | Arranque y HMR rápidos, build simple a estático |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`) | Tokens de marca centralizados en `@theme`, sin CSS-in-JS |
| Ruteo | React Router 7 | `basename` dinámico, rutas anidadas para layout/auth |
| Iconos | lucide-react | Set consistente, tree-shakeable |
| Animación | Motion (ex Framer Motion) | Springs y `AnimatePresence` para las transiciones de práctica/celebraciones |
| Confetti | canvas-confetti | Celebraciones (fin de sesión, insignias, ligas) |
| Fuente | Poppins (`@fontsource`, self-hosted) | Equivalente libre de la Cera Pro corporativa de WOM (no redistribuible) |
| Backend | Supabase (Postgres + Auth + RPC) | Sin servidor propio; RLS como única capa de autorización |
| PWA | vite-plugin-pwa (Workbox) | Instalable, precache del shell, práctica offline |
| Lint | oxlint | Rápido, cero configuración compleja |
| CI/CD | GitHub Actions | Gratuito, integrado al repo |
| Hosting | GitHub Pages | Gratuito, sin infraestructura que mantener |

No hay gestor de estado global (Redux/Zustand): cada página resuelve sus
datos con `useEffect` + Supabase directamente. Es deliberado — el tamaño de
la app no justifica esa complejidad, y cada pantalla es dueña de su propio
ciclo de carga.

---

## 4. Modelo de datos (Supabase / Postgres)

Proyecto Supabase: `formacion-wom` (`jgtrfrfolcfpvzbsiuka`). **RLS activo en
todas las tablas.** 20 migraciones aplicadas, en orden:

1. `endurecer_funciones_security_definer`
2. `proteger_campos_administrativos_perfil`
3. `gamificacion_ranking_racha`
4. `actividades_obligatorias`
5. `insignias_usuario`
6. `ligas_semanales`
7. `analytics_admin`
8. `rls_scope_authenticated_e_initplan` — endurecimiento de rendimiento de RLS (`(select auth.uid())` en vez de `auth.uid()` directo)
9. `corte_semanal_por_pg_cron` — corte de ligas automático vía `pg_cron`, no solo al primer acceso de la semana
10. `roles_ejecutivo_supervisor_y_asignacion_con_alcance` — los tres roles reales (ejecutivo/supervisor/admin) y el alcance de actividades (`todos`/`equipo`/`persona`)
11. `liga_por_puntaje_semanal` — el ascenso/descenso de liga pasa a basarse en un puntaje semanal, no solo XP
12. `desempates_del_puntaje_semanal` — criterios de desempate del puntaje
13. `dia_activo_exige_tres_intentos` — un día solo cuenta como "activo" con ≥3 intentos (evita gamear la racha)
14. `supervisores_ven_su_equipo` — RLS para que un supervisor lea el equipo que le reporta
15. `destinatarios_sin_recursion` — corrige una política RLS recursiva en destinatarios de actividades
16. `ligas_por_division_y_autocompetencia` — ranking por división y auto-competencia
17. `intentos_con_confianza` — columna `attempts.confianza` (SRS basado en confianza)
18. `analitica_jefaturas_nivel2` — rango de fechas + tendencia del equipo
19. `biblioteca_de_materiales` — tabla `materiales` + bucket privado + `actividad_materiales`
20. `ciclos_de_capacitacion` — tabla `ciclos_capacitacion` + `ciclos_capacitacion_destinatarios` + RPC `progreso_ciclos_capacitacion()`

> Cada migración con cambio de datos/RLS tiene su `.sql` de rollback en
> `docs/` y se verificó E2E contra la base (transacción con rollback o
> usuario de prueba que se elimina al terminar), revisando siempre
> `get_advisors(type: security)` después.

### 4.1 Tablas

| Tabla | Rol | Notas |
|---|---|---|
| `profiles` | Perfil por usuario | `role` (relator/admin), `activo`, `liga`; **fila creada únicamente por trigger**, nunca por el cliente |
| `attempts` | Cada respuesta a un ejercicio | `correcto`, `puntaje`, `domain_id`, `objetivo_id`, `fecha`, **`confianza`** (bool, nullable — "¿estabas seguro/a?"; los intentos previos a la migración quedan en `null`) — es la fuente de verdad del XP y las métricas |
| `srs_cards` | Estado de repaso espaciado | PK compuesta `(user_id, exercise_id)`; `caja` (1–5), `proximo_repaso` |
| `goals` | Metas de maestría por dominio | Asignadas por un admin, PK `id` = `"{user_id}-{domain_id}"` |
| `consultas` | Preguntas de relatores | `estado` (pendiente/respondida), `respuesta_admin` |
| `actividades` | Actividades obligatorias | `activa` (archivado suave), `fecha_limite`, `enlace` |
| `actividades_completadas` | Cumplimiento | PK compuesta `(actividad_id, user_id)` |
| `insignias_usuario` | Insignias obtenidas | PK compuesta `(user_id, insignia_id)`; el catálogo vive en el frontend |
| `cortes_semanales` | Idempotencia del corte de ligas | PK `semana` (date); registra qué semanas ya se procesaron |
| `activity_events` | Bitácora genérica | Heredada del esquema original, uso libre |
| `materiales` | Biblioteca de materiales de capacitación | Archivo subido (`storage_path`, bucket `materiales`) **o** enlace externo (`url`) — nunca ambos (`check` de origen único); `tipo` (pdf/documento/presentación/imagen/video/enlace); `activo` (archivado suave) |
| `actividad_materiales` | Qué materiales están adjuntos a qué actividad | Tabla puente N:N, PK compuesta `(actividad_id, material_id)` |
| `ciclos_capacitacion` | Ciclos de re-entrenamiento (recertificación, cambio de producto, refuerzo) | `dominio_id` (texto, catálogo), `tipo`, `meta_ejercicios`, `fecha_limite`, `alcance` (mismo enum que actividades); sin columna de estado (se deriva); `activo` (archivado suave) |
| `ciclos_capacitacion_destinatarios` | A quién se le abrió cada ciclo | Tabla puente N:N, PK compuesta `(ciclo_id, user_id)`; vacía cuando `alcance='todos'` |

### 4.2 Funciones SQL (RPC)

Todas con `search_path` fijo (`public`) para evitar *search_path hijacking*.

| Función | Seguridad | Qué hace |
|---|---|---|
| `is_admin()` | `SECURITY DEFINER`, solo `authenticated` | Helper usado dentro de políticas RLS |
| `handle_new_user()` | `SECURITY DEFINER`, sin `EXECUTE` para nadie vía API | Trigger `on_auth_user_created`: crea la fila en `profiles` (relator, inactivo) |
| `proteger_campos_perfil()` | trigger `SECURITY INVOKER` | Bloquea que un usuario no-admin modifique `role`, `activo`, `alta_*`, `baja_fecha` o **`liga`** de su propia fila — cierra la escalada de privilegios |
| `mi_racha()` | `SECURITY INVOKER` (RLS propia) | Días consecutivos de práctica del usuario autenticado |
| `ranking_semanal()` | `SECURITY DEFINER`, solo `authenticated` | XP de la semana en curso por usuario activo, con posición; expone solo `nombre` + `liga` + `xp`, **nunca email** |
| `heroes_semana()` | `SECURITY DEFINER`, solo `authenticated` | Top 3 de XP de la semana pasada completa |
| `asegurar_corte_semanal()` | `SECURITY DEFINER`, solo `authenticated` | Procesa ascensos/descensos de liga una vez por semana (idempotente vía `cortes_semanales`) |
| `ranking_division()` | `SECURITY DEFINER`, solo `authenticated` | Ranking de la semana **acotado al tier/división del que llama** (no global) — arregla el anti-patrón de competir contra todos |
| `mi_progreso_semanal()` | `SECURITY INVOKER` | Auto-competencia: XP de la semana en curso vs. la semana anterior al mismo punto |
| `resumen_equipo(desde, hasta)` | `SECURITY DEFINER`, guard `is_admin()`/supervisor | Ficha resumida de cada relator (supervisor: solo su equipo): XP, precisión, última actividad, obligatorias pendientes. Params `desde`/`hasta` opcionales (null = todo) para acotar el período |
| `precision_por_dominio(desde, hasta)` | `SECURITY DEFINER`, guard `is_admin()`/supervisor | Precisión agregada del equipo por dominio (≥5 intentos) — detecta contenido difícil. Acepta el mismo rango de fechas opcional |
| `tendencia_equipo(semanas)` | `SECURITY DEFINER`, guard `is_admin()`/supervisor | Serie temporal (volumen + precisión) de las últimas N semanas del equipo — responde "¿mejora o empeora?" |
| `progreso_ciclos_capacitacion()` | `SECURITY DEFINER`, solo `authenticated` | Avance por persona en cada ciclo de re-entrenamiento visible para quien llama (uno mismo, y si es supervisor/admin, también su equipo) — mismo motivo que `resumen_equipo`: `attempts` es solo-propio y un supervisor no puede leerlo directo |

### 4.3 Políticas RLS (resumen)

- **`profiles`**: cada quien lee/actualiza su fila (`id = auth.uid()`) o el admin todo (`is_admin()`); insert solo con `id = auth.uid()` (disparado por el trigger de alta). El trigger `proteger_campos_perfil` impide, además, que un usuario cambie sus propios campos administrativos aunque intente `UPDATE` directo a la API.
- **`attempts` / `srs_cards`**: cada quien lee/escribe solo lo propio (`user_id = auth.uid()`); admin lee todo.
- **`consultas`**: cada quien crea/lee lo propio; solo admin actualiza (responde).
- **`actividades`**: lectura para todo `authenticated`; gestión (`ALL`) solo admin.
- **`actividades_completadas`**: cada quien inserta/borra lo propio; admin lee todo.
- **`insignias_usuario`**: cada quien inserta/lee lo propio; admin lee todo. Verificado con un test E2E real: un usuario no puede otorgarse insignias a nombre de otro (bloqueado por RLS).
- **`goals`**: lectura propia o admin; escritura (`ALL`) solo admin.
- **`cortes_semanales`**: lectura para todo `authenticated` (necesaria para que el cliente decida si llamar al RPC de corte); sin escritura directa, solo vía la función `SECURITY DEFINER`.
- **`ciclos_capacitacion`**: lectura si `alcance='todos'`, si lo creó quien pregunta, si es admin, o si es destinatario; insert solo `is_supervisor()` (incluye admin); update/delete solo admin o quien lo creó. **`ciclos_capacitacion_destinatarios`**: mismo patrón que `actividades_destinatarios` — un supervisor solo puede agregar gente de su propio equipo (`es_de_mi_equipo`) a un ciclo que él mismo creó.

> Nota de higiene (2026-07-18): esta sección (§4.3) describe políticas
> previas a la migración `roles_ejecutivo_supervisor_y_asignacion_con_alcance`
> (2026-07-10) para `actividades`/`actividades_completadas` — hoy el alcance
> real es más granular que "lectura para todo `authenticated`" (ver la
> política real de `actividades_select` citada en el commit de esta feature).
> No se corrigió aquí para no mezclar un audit de RLS no pedido con esta
> entrega; si Pablo pide "revisa que la documentación de RLS esté al día",
> reconciliar contra `pg_policies` primero.

### 4.4 Tipos TypeScript

`src/lib/database.types.ts` refleja el esquema (tablas + funciones RPC) a
mano, siguiendo el formato que genera `supabase gen types typescript`. El
cliente se instancia tipado: `createClient<Database>(url, key)` en
`src/lib/supabase.ts`, así toda consulta (`.from(...)`, `.rpc(...)`) queda
autocompletada y validada en tiempo de compilación.

---

## 5. Autenticación y autorización

- **Supabase Auth** con email/contraseña (`src/auth/AuthProvider.tsx`).
- **Alta de cuenta**: `/registro` llama a `supabase.auth.signUp`; el trigger
  `handle_new_user` crea el perfil como `role='relator'`, `activo=false`.
  Nadie puede saltarse este flujo insertando en `profiles` directamente
  (RLS + trigger lo previenen).
- **Activación**: exclusiva de un admin desde `/admin` (botón
  Activar/Desactivar). Mientras `activo=false`, `ProtectedRoute` muestra
  `CuentaInactiva` en vez del contenido de la app.
- **Recuperación de contraseña**: `/recuperar` → `resetPasswordForEmail`
  con `redirectTo` construido desde `BASE_URL` (funciona igual en local y
  en producción) → `/restablecer` valida la sesión de recuperación y llama
  a `updateUser({ password })`.
- **Rutas protegidas**: `ProtectedRoute` (sesión + cuenta activa) y
  `AdminRoute` (además `role==='admin'`), ambas como *layout routes* de
  React Router (`src/App.tsx`).
- **Contexto global**: `useAuth()` expone `session`, `user`, `perfil`,
  `loading`, `signIn`, `signUp`, `signOut`.

---

## 6. Módulo de ejercicios y repaso espaciado (SRS)

### 6.1 Contenido

`src/data/contenido.ts` — catálogo estático versionado en git, no en base
de datos. **13 dominios**, agrupados en **3 categorías** (`CATEGORIAS`):

- 🛒 **Productos y Servicios**: Portabilidad, Planes, Prepago, Equipos,
  Boleta y Pagos, Servicios Adicionales, **Club WOM (Beneficios)**
- 🔧 **Técnico y Conectividad**: Internet Fibra, Internet Móvil, Roaming,
  Servicio Técnico
- 🎯 **Habilidades**: Atención al Cliente, Técnicas de Formación

Cada dominio tiene 2–4 objetivos y ~10 ejercicios de alternativas con
explicación pedagógica (≈130 preguntas en total). Los `id` de dominio y
ejercicio son **estables** (`po-01`, `atencion-cliente`, `cw-01`, etc.):
son la clave foránea lógica que usan `attempts` y `srs_cards`, así que
renombrar o borrar un ejercicio existente rompe el historial de quienes ya
lo respondieron. Agregar contenido nuevo es seguro y no requiere migración.

**Club WOM (Beneficios)** se diseñó separando lo *durable* (elegibilidad,
proceso de canje, reglas de uso — apto para repaso espaciado y confianza)
de lo *volátil* (qué comercio/descuento hoy — se consulta en la app, no se
memoriza, porque caduca). El análisis metodológico está en
`design/metodologia-beneficios.md`.

`src/data/contenido.test.ts` es un **test de integridad del catálogo**
(vitest): valida que las categorías referencien dominios reales, ids
únicos, cada `objetivoId` exista en su dominio, `correcta` dentro de rango
y explicación no vacía. Barato de mantener, atrapa errores de autoría
antes de producción. Corre en CI junto al resto (`npx vitest run`).

### 6.2 Algoritmo Leitner (`src/lib/srs.ts`)

- 5 cajas; intervalo hasta el próximo repaso: **1, 2, 4, 8, 16 días**
  (`DIAS_POR_CAJA`).
- **Aprendizaje basado en confianza** (`siguienteCaja(caja, correcto, seguro?)`):
  acierto **seguro** sube de caja; acierto **con dudas** se queda (conocimiento
  frágil); error vuelve a caja 1. El 3er argumento es opcional → compatibilidad
  con intentos previos sin `confianza`.
- `clasificarRespuesta(correcto, seguro)` devuelve el cuadrante del 2×2
  **dominado / frágil / brecha / *misinformed***. El caso *misinformed*
  (**seguro pero equivocado**) es el más caro en atención al cliente —el
  relator daría mal la información sin dudar— y el feedback lo resalta.
- **Maestría de un dominio** = promedio del avance de caja de sus
  ejercicios (`(caja-1)/(CAJA_MAXIMA-1)`, ejercicios sin tarjeta cuentan 0).
  Al llegar a 100% se puede descargar un certificado del dominio.

### 6.3 Flujo de práctica (`src/pages/Practica.tsx`)

1. Al entrar a un dominio se arma una cola de hasta 10 ejercicios:
   primero los **pendientes de repaso** (`proximo_repaso <= ahora`), luego
   los **nunca vistos**. Si no hay pendientes ni nuevos, se repasa el
   dominio completo igual.
2. **Anti-copia**: el orden de las alternativas se baraja (Fisher–Yates)
   por pregunta y por sesión — dos personas viendo el mismo ejercicio ven
   las opciones en orden distinto, y la misma persona las ve reordenadas
   cada vez que repasa. La posición de la respuesta correcta también
   varía en los datos fuente (no siempre la misma posición).
3. **Paso de confianza**: entre elegir la alternativa y revelar el
   resultado, el relator marca "¿qué tan seguro/a estás?" (un toque). Esa
   señal alimenta el SRS (§6.2) y detecta al *seguro-pero-equivocado*.
4. Al responder: feedback inmediato (la respuesta correcta en verde + check,
   explicación del porqué), se calcula la nueva caja y se registran en
   paralelo un `insert` en `attempts` (con `confianza`) y un `upsert` en
   `srs_cards`. El feedback nombra el cuadrante del 2×2, resaltando el
   *misinformed*. Se limpió la celebración redundante del acierto (fuera el
   flash a pantalla completa y el confetti por pregunta; el enunciado es el
   foco visual), y es **accesible**: `role="status"` + `aria-live` anuncian
   acierto/error, el foco de teclado salta a "Siguiente" y los rojos pasan
   el contraste AA.
5. **XP en vivo**: +25 por acierto, +5 por intento fallido (constantes en
   `src/lib/gamificacion.ts`), con chip flotante animado.
6. Al terminar la cola: pantalla de resumen con confetti (colores WOM),
   contador animado de aciertos y XP ganado.

### 6.4 Modo offline (`src/lib/colaOffline.ts`)

Si `navigator.onLine` es `false` (o el `insert`/`upsert` falla), el intento
se **encola en `localStorage`** en vez de perderse. Al volver la conexión
(evento `online`) o al montar el shell (`Layout.tsx`), la cola se reenvía
en orden; se detiene ante el primer error para reintentar después.
Alcance: la práctica funciona sin señal porque el catálogo va precacheado
en el service worker; ranking, actividades y consultas requieren red.

---

## 7. Gamificación

Diseñada tras un benchmark explícito contra Axonify, SC Training, Qstream,
TalentCards y las mecánicas públicas de Duolingo (ver §11).

### 7.1 XP y niveles (`src/lib/gamificacion.ts`)

- XP = `correctas × 25 + (intentos - correctas) × 5`.
- 5 niveles acumulativos: **Aprendiz (0) → Explorador (150) → Relator
  (400) → Experto (900) → Héroe WOM (1800)**. Se muestran con barra de
  progreso al siguiente nivel en el Panel.

### 7.2 Racha diaria

`mi_racha()` cuenta días consecutivos con al menos un intento, vigente si
se practicó hoy o ayer. Se muestra con ícono 🔥 en el Panel.

### 7.3 Ranking semanal y Héroes de la Semana

- `ranking_semanal()`: posición de todos los usuarios activos por XP de la
  semana en curso (corte lunes vía `date_trunc('week', now())`).
- `heroes_semana()`: podio (top 3, medallas 🥇🥈🥉) de la semana **anterior**
  completa — se calcula sobre datos ya cerrados, nunca cambia durante la
  semana.
- Privacidad: ambas funciones exponen únicamente `nombre` (y `liga`/`xp`),
  nunca `email`.
- **Pantalla propia** (`src/pages/Liga.tsx`, ruta `/liga`, ítem de menú con
  ícono de trofeo, junto a Panel/Ejercicios/Actividades/Consultas): aquí
  viven el ranking completo por división, los héroes de la semana y la
  auto-competencia semanal (§7.4). Se separó del Panel (`src/pages/Panel.tsx`)
  en 2026-07-18 porque el Panel había ido acumulando demasiadas secciones
  (nivel, métricas, héroes, insignias, ranking completo) y el
  ranking/posiciones necesitaban su propio espacio en vez de competir por
  atención con el resto. El Panel se quedó con lo del día a día — saludo,
  nivel/XP, racha, repasos pendientes, XP, botón de practicar, vitrina de
  insignias — más una tarjeta compacta de "tu liga" (posición + enlace
  "Ver liga completa") a modo de teaser hacia `/liga`. `heroes_semana()`
  se sigue consultando también desde el Panel (sin renderizarse ahí) porque
  alimenta la insignia "Héroe de la Semana".

### 7.4 Ligas semanales (estilo Duolingo)

4 ligas: 🥉 Bronce → 🥈 Plata → 🥇 Oro → 👑 Héroe (`profiles.liga`).
Al primer acceso de cada semana, `asegurar_corte_semanal()`:

- **Top 2 con actividad** de cada liga → asciende una liga.
- **Cero actividad** en la semana → desciende una liga (Bronce es piso).
- Idempotente: la tabla `cortes_semanales` registra qué semana ya se
  procesó, así que llamarla varias veces en la misma semana no repite el
  efecto (verificado en pruebas).
- El cambio de liga se anuncia con un modal de celebración (mismo
  componente que las insignias) comparando la liga actual con la última
  vista guardada en `localStorage` del dispositivo; se dispara desde el
  Panel (es la pantalla de entrada) pero es independiente de dónde se
  muestre el ranking.
- `liga` está protegida por el mismo trigger que protege `role`/`activo`:
  un usuario no puede subirse de liga escribiendo directo a la API.
- **Auto-competencia** (`mi_progreso_semanal()`, `deltaSemanal` en
  `lib/gamificacion.ts`): tu semana en curso contra tu propia semana
  anterior al mismo punto — vive en `/liga`, junto al ranking.

### 7.5 Insignias (`src/lib/insignias.ts`)

Catálogo de 9 insignias evaluadas en el cliente al cargar el Panel y
sincronizadas (`upsert ... ignoreDuplicates`) contra `insignias_usuario`:
Primer paso, rachas de 3/7/14 días, 50/100 ejercicios, Dominio al 100%,
Héroe de la Semana, Todas las obligatorias al día. Nueva insignia → modal
con confetti; varias a la vez → se muestran en cola. Vitrina en el Panel:
obtenidas a color, bloqueadas en gris con candado y la pista para
conseguirlas.

### 7.6 Certificados (`src/lib/certificado.ts`)

Al llegar a maestría 100% en un dominio, aparece un botón que genera (en
`<canvas>`, sin backend) un PNG 1400×990 con degradado corporativo WOM,
nombre del relator, dominio y fecha — descargable directamente.

---

## 8. Actividades obligatorias

Módulo para tareas asignadas por el equipo de formación (cursos externos,
firmas, hitos) con seguimiento de cumplimiento.

- **Admin** (`src/components/AdminActividades.tsx`): formulario para
  publicar (título, descripción, enlace opcional, fecha límite opcional,
  **materiales adjuntos de la biblioteca**); lista con **barra de
  cumplimiento X/Y** y los nombres de quienes ya la completaron; "archivar"
  en vez de borrar (`activa=false`).
- **Relator** (`src/pages/Actividades.tsx`): pendientes con semáforo de
  fecha límite (ámbar ≤3 días, rojo vencida), enlace al material y **chips
  de los materiales adjuntos** (icono por tipo, abre archivo/enlace), botón
  "Marcar completada" (mini confetti), sección de completadas tachadas.
- Contribuye a la insignia "Siempre al día" y es una de las señales del
  dashboard de equipo en Admin.

### 8.1 Biblioteca de materiales (`src/components/AdminMateriales.tsx`)

Sección para alojar distintos tipos de material de capacitación,
reutilizable entre actividades — se sube o se referencia una vez y se
adjunta a cuantas actividades haga falta, en vez de repetir el mismo
enlace cada vez.

- **Origen**: **archivo subido** (PDF, Word, PowerPoint/Excel o imagen,
  máx. 20 MB — bucket privado `materiales` en Supabase Storage) o
  **enlace externo** (video de YouTube/Vimeo/Drive, u otro enlace). Nunca
  ambos: la tabla `materiales` tiene un `check` que exige exactamente uno
  de `storage_path`/`url`. El tipo se infiere del mime al subir
  (`inferirTipoPorMime`, `lib/materiales.ts`).
- **Por qué 20 MB y no video subido**: el plan gratuito de Supabase da
  1 GB de Storage total — un solo video lo agotaría. El video vive como
  enlace externo (YouTube/Drive/Vimeo), no como archivo.
- **Privacidad del archivo**: el bucket es privado; "Ver" pide una
  `createSignedUrl` (60 s) en el momento del clic — la seguridad la da la
  política RLS de `storage.objects`, no una URL pública adivinable.
- **Quién sube**: admin y supervisor (`is_supervisor()`); un supervisor
  solo puede archivar lo suyo, el admin cualquier material.
- **Adjuntar a una actividad**: al crear una actividad en
  `AdminActividades`, un checklist ofrece los materiales activos de la
  biblioteca; la selección se guarda en `actividad_materiales` (tabla
  puente N:N) junto con la actividad. Fallar al adjuntar no revierte la
  actividad ya creada (a diferencia de los destinatarios, que si son
  obligatorios) — es un enriquecimiento, no un requisito.
- Probado con `src/lib/materiales.test.ts` (inferencia de tipo por mime,
  validación de tamaño/formato, formato de tamaño legible).

### 8.2 Ciclos de re-entrenamiento (`src/components/AdminCiclosCapacitacion.tsx`)

Análisis de coherencia formación/re-entrenamiento
(`design/coherencia-formacion-reentrenamiento.md`): la app resolvía bien la
formación inicial (SRS, gamificación, actividades) pero no tenía forma de
modelar recapacitación continua — sin ciclo temporal, sin distinguir un
cambio puntual de producto de una recertificación periódica. Este módulo
cierra esa brecha.

- **Qué es**: un ciclo abre una ventana de práctica dirigida — un `dominio`
  del catálogo, una `meta_ejercicios`, una `fecha_limite` — sobre quien
  corresponda. Tres `tipo`: **recertificación periódica**, **cambio de
  producto o procedimiento** (reactivo) y **refuerzo** (dirigido a un
  dominio con baja precisión — se abre desde lo que ya señala "Contenido
  difícil" en `AdminEquipo`, §9). No hay una cadencia por defecto (ni
  trimestral ni anual impuesta): cada ciclo decide su propia fecha límite.
- **Para quién**: mismo patrón de alcance que actividades obligatorias
  (`todos`/`equipo`/`persona`, `lib/asignacion.ts`) — admin abre a cualquiera
  o a toda la operación, un supervisor solo a su equipo.
- **Sin columna de estado**: `en_curso`/`completado`/`incompleto` se derivan
  en cliente (`lib/reentrenamiento.ts`, `estadoCiclo`) de la fecha límite y
  el avance — mismo criterio que `actividades`, que tampoco guarda
  "vencida", para no arrastrar un estado que se desincroniza del dato real.
- **Avance = ejercicios practicados en el dominio desde que se abrió el
  ciclo** (`attempts.fecha >= ciclos_capacitacion.creada_en`, hasta un día
  después de `fecha_limite`). Lo calcula el RPC `progreso_ciclos_capacitacion()`
  porque `attempts` tiene RLS solo-propio: un supervisor no puede leer los
  intentos de su equipo directamente, igual que en `resumen_equipo`/
  `precision_por_dominio` (§4.2). A diferencia de esos dos, este RPC también
  incluye al propio caller (no solo a su equipo), porque el ejecutivo
  también consulta su propio avance en Actividades y en el Panel.
- **Dónde se ve**: admin y supervisor lo gestionan en el mismo lugar que
  actividades obligatorias (Administración / Mi equipo); el ejecutivo ve sus
  ciclos activos con barra de progreso en Actividades, con acceso directo a
  "Practicar {dominio}"; la ficha individual (§9.1) muestra el detalle por
  ciclo para el 1:1.
- **Metas de mantenimiento** (`lib/reentrenamiento.ts`, `tipoMeta`): una meta
  de `goals` (§9.1) ya no distingue solo cumplida/no cumplida — si el actual
  ya alcanza el objetivo se etiqueta "mantener" en vez de "en progreso",
  reflejando que el punto ya no es crecer sino no caer del umbral. Es
  descriptivo, calculado en cada carga, no un campo guardado.
- Probado con `src/lib/reentrenamiento.test.ts` (estado derivado del ciclo,
  días hasta el límite, porcentaje de avance, tipo de meta).

---

## 9. Panel de administración

`src/pages/Admin.tsx` compone tres bloques:

1. **Relatores**: tabla con activar/desactivar (registra `alta_por`,
   `alta_fecha`/`baja_fecha`), badge de rol y punto de estado.
2. **`AdminEquipo`** (analítica, §4.2 `resumen_equipo`/`precision_por_dominio`/`tendencia_equipo`):
   - **Qué atender esta semana** (Nivel 1): tres segmentos accionables
     —inactivos ≥7 días, precisión <70%, obligatorias pendientes—, cada uno
     un chip que **filtra** la tabla a su gente; estado positivo cuando no
     hay nadie.
   - Tabla de seguimiento por persona: liga, XP, precisión, **última
     práctica con semáforo** (rojo si ≥7 días sin actividad o nunca
     practicó), estado de obligatorias, enlace a su ficha individual.
   - **Contenido difícil**: dominios con precisión de equipo <70%,
     candidatos a reforzar en sesión presencial o a revisar sus preguntas.
   - **Exportar** el reporte de equipo desde un menú único (`lib/reportes.ts`):
     **PDF** branded de una página (resumen "qué atender" + seguimiento +
     tendencia + contenido difícil, con numeración), **Excel .xlsx** de tres
     hojas (Seguimiento / Tendencia / Contenido difícil) para cruces propios,
     y **CSV** de la tabla (respeta el filtro activo). Las tres salidas parten
     de los mismos *builders* puros; jspdf y write-excel-file se cargan con
     **dynamic import** (fuera del bundle inicial). El contenido difícil
     mantiene además su propio export CSV rápido.
   - **Nivel 2**: **rango de fechas** (7/30/90 días · todo) que acota el
     seguimiento y el contenido difícil al período, y **gráfico de tendencia
     del equipo** (8 semanas: barra = volumen, % = precisión) que responde
     "¿mejora o empeora?".
3. **`AdminActividades`** (§8) y **Consultas** (responder preguntas de
   relatores, marca `estado='respondida'`).

### 9.1 Ficha individual (`src/pages/FichaRelator.tsx`, ruta `/admin/relator/:id`)

- Cabecera con avatar, liga y datos de contacto.
- 3 métricas (XP, ejercicios, precisión) de las últimas 8 semanas.
- **Gráfico de evolución semanal de XP**: barras SVG dibujadas a mano
  (sin librería de gráficos) agrupando `attempts` por semana ISO.
- **Objetivos a reforzar** (drill del Nivel 2): objetivos donde el relator
  falla *puntualmente* (precisión <70% con ≥3 intentos) —no "en Portabilidad"
  sino "en el objetivo Proceso y requisitos"—, lo concreto para un 1:1.
- Maestría por cada uno de los 13 dominios (barras de progreso).
- **Asignación de metas** desde la UI: elegir dominio + % objetivo →
  `upsert` en `goals`; se muestra meta vs. avance real con semáforo de
  cumplimiento.
- **Exportar la ficha** (menú "Exportar" en el encabezado): **PDF** branded
  de una página (resumen + maestría por dominio + evolución semanal +
  objetivos a reforzar + metas, con el título del objetivo resuelto) y
  **Excel .xlsx** de cuatro hojas, para el 1:1 o el legajo. Usa los mismos
  *builders* puros de `lib/reportes.ts` (`descargarFichaPDF` /
  `descargarFichaExcel`) y el menú reutilizable `components/MenuExportar.tsx`.

---

## 10. Sistema de diseño

### 10.1 Identidad de marca

Paleta extraída directamente del CSS de producción de wom.cl
(`womstrap-v2.1.min.css`), definida como tokens Tailwind v4 en
`src/index.css` (`@theme`):

| Token | Hex | Uso |
|---|---|---|
| `wom-600` | `#4D008C` | Morado primario (sidebar, botones secundarios) |
| `wom-900` | `#270046` | Morado profundo (gradientes, fondo del panel de marca) |
| `magenta-500` | `#E92070` | Acento / CTA principal |
| `exito` | `#33CC9E` | Estados positivos |
| Poppins | — | Tipografía (equivalente libre de Cera Pro) |

### 10.2 Componentes base (`src/components/ui.tsx`)

`Boton` (3 variantes), `Campo`, `Tarjeta`, `MensajeError`, `EstadoCarga`
(spinner), `Esqueleto` (skeleton de carga). Reutilizados en todas las
pantallas para consistencia visual.

### 10.3 Shell de la app (`src/components/Layout.tsx`)

- **Escritorio**: sidebar fija con gradiente morado y navegación con
  iconos (lucide-react); header con avatar de iniciales, rol y toggle de
  tema.
- **Móvil**: bottom navigation bar (sensación de app nativa) + header
  compacto.
- **Buscador global** (`src/components/BuscadorGlobal.tsx`): paleta de
  comandos (estilo ⌘K) montada en el header, accesible desde cualquier
  pantalla. Disparador en el header (pill en escritorio, ícono en móvil);
  se abre con `/` o ⌘/Ctrl+K, se navega con flechas + Enter, cierra con
  Escape. Encuentra **dominios y ejercicios puntuales** (secciones separadas,
  sin acentos ni mayúsculas; lógica en `src/lib/busqueda.ts`) y al elegir
  cualquiera lleva a practicar el dominio (`/ejercicios/:id`).
- Transición de página con `motion.div` (fade + slide sutil) en cada
  cambio de ruta.

### 10.4 Modo oscuro

Estrategia por **redefinición de tokens** bajo la clase `.dark` en
`src/index.css`: blanco→morado profundo, niebla→casi negro, tintas
claras. Ningún componente tiene lógica `dark:` propia — cambia solo porque
las variables cambian. Toggle ☀️/🌙 en el header
(`src/components/Layout.tsx`), persistido en `localStorage` (`tema`),
inicializado según `prefers-color-scheme` si el usuario no eligió antes
(`src/main.tsx`).

### 10.5 Animación

Todas las micro-interacciones usan **Motion**: springs para
celebraciones/insignias/ligas, `AnimatePresence` para modales, la paleta de
búsqueda y el cambio de categoría en Ejercicios, transiciones de progreso
con easing. `canvas-confetti` para
las celebraciones (fin de sesión, insignia nueva, cambio de liga,
actividad completada).

---

## 11. Benchmark competitivo (contexto de decisiones)

Se comparó contra Axonify, SC Training/EdApp, Qstream, TalentCards y las
mecánicas públicas de Duolingo. Hallazgo inicial: la app ya igualaba el
núcleo pedagógico (SRS real) pero carecía de insignias/certificados, ligas,
analítica de administrador y experiencia instalable/offline — las 4
brechas que se cerraron en los PRs #16–#19 (§12). Con eso, Formación WOM
alcanza paridad funcional con esas plataformas comerciales a costo $0.

**Benchmark UX/UI multidimensional** (`design/revision-ux-benchmark.md`):
una revisión posterior puntuó la app 1–10 en **8 dimensiones** contra el
estándar de la categoría (actividad núcleo, SRS/retención, gamificación,
ligas, onboarding, analítica de jefaturas, vínculo a KPI, accesibilidad).
Tras 5 ciclos de mejora el promedio pasó de **6.3 → 7.3**: se sumó ligas por
división + auto-competencia, quick-start, limpieza de la celebración +
accesibilidad del núcleo, **aprendizaje basado en confianza** (el "foso"
pedagógico) y **analítica de jefaturas Nivel 2**. Siete de las ocho
dimensiones quedan en 7.5+. El scorecard visual de las dimensiones vive en
`design/scorecard-dimensiones.html`. La única dimensión baja es el **vínculo
a KPI del negocio** (dim. 7, 3.0), pendiente de una decisión de negocio (ver
abajo).

Quedan fuera de alcance, documentadas como pendientes:

- **Vínculo formación ↔ KPI del negocio** (dim. 7, la palanca estratégica
  más alta): conectar los ejercicios con AHT/FCR/CSAT/conversión para que la
  formación sea "no opcional". **Bloqueado por una decisión de negocio** —
  qué KPI y de qué fuente sale el dato—, no por lo técnico. Hay recordatorio
  programado (20-jul-2026).
- **Push notifications reales** (requiere infraestructura de push +
  service worker avanzado). Mitigación actual: racha e insignias como
  incentivo visual dentro de la app.
- **Generación de preguntas con IA in-app**. Hoy el flujo es manual:
  se provee material de referencia y se agregan preguntas al catálogo
  vía código (rápido, pero no self-service para el admin).

---

## 12. Progressive Web App (PWA)

`vite-plugin-pwa` (Workbox), configurado en `vite.config.ts`:

- **Manifest**: nombre, iconos WOM 192/512 (generados con el degradado
  corporativo), `display: standalone`, `theme_color` morado.
- **Service worker**: precache de todo el shell (JS, CSS, fuentes,
  iconos — ~38 archivos), `registerType: autoUpdate`.
- Instalable desde el navegador móvil ("Agregar a pantalla de inicio"),
  abre a pantalla completa con icono y splash propios.
- Compatible con el modo offline de práctica (§6.4).

---

## 13. Estructura del repositorio

```
src/
  App.tsx                  # definición de rutas (públicas, protegidas, admin)
  main.tsx                 # bootstrap: fuentes, tema inicial, render
  index.css                # tokens de marca (@theme), estilos base, dark mode

  auth/
    AuthContext.ts          # tipo del contexto + createContext
    AuthProvider.tsx        # sesión Supabase + carga de perfil
    useAuth.ts               # hook de acceso al contexto
    ProtectedRoute.tsx       # requiere sesión + cuenta activa
    AdminRoute.tsx           # requiere además role==='admin'

  lib/
    supabase.ts              # cliente tipado (lee VITE_SUPABASE_*)
    database.types.ts        # tipos generados a mano del esquema Supabase
    srs.ts                   # Leitner + confianza (cajas, intervalos, maestría, 2×2)
    seguimiento.ts           # rangos de fecha, precisión por objetivo (analítica)
    csv.ts                   # generación/descarga de CSV en el cliente
    reportes.ts              # reporte de equipo y ficha del relator a PDF/Excel (builders puros + descargas diferidas)
    materiales.ts             # biblioteca de materiales: tipos, mimes admitidos, validación de archivo
    reentrenamiento.ts        # ciclos de re-entrenamiento: tipos, estado derivado, avance, tipo de meta
    busqueda.ts              # índice + búsqueda de dominios/ejercicios (buscador global)
    gamificacion.ts          # XP, niveles, ligas
    insignias.ts             # catálogo y evaluación de insignias
    certificado.ts           # generación de certificado PNG en canvas
    colaOffline.ts           # cola de intentos sin conexión

  data/
    contenido.ts             # catálogo de dominios/objetivos/ejercicios + categorías
    contenido.test.ts        # test de integridad del catálogo (vitest)
    (reportes.test.ts y materiales.test.ts en lib/ cubren esos builders)

  components/
    Layout.tsx                # shell (sidebar/bottom-nav, header, tema, offline sync)
    BuscadorGlobal.tsx         # paleta de búsqueda global (⌘K) del header
    EstadoConexion.tsx          # indicador de conexión / sincronización offline
    AuthLayout.tsx               # panel de marca split-screen para pantallas de auth
    MarcaWom.tsx                  # logo/wordmark reutilizable
    ui.tsx                        # Boton, Campo, Tarjeta, MensajeError, EstadoCarga, Esqueleto
    ContadorAnimado.tsx            # número que cuenta hacia arriba (ease-out)
    InsigniaModal.tsx               # modal de celebración (insignias y cambios de liga)
    ErrorBoundary.tsx                # captura errores de página sin tumbar la navegación
    MenuExportar.tsx                  # menú "Exportar" reutilizable (opciones PDF/Excel/CSV)
    AdminEquipo.tsx                   # seguimiento + contenido difícil + rango/tendencia (N2) + menú Exportar (PDF/Excel/CSV)
    AdminMateriales.tsx                # biblioteca de materiales: subir archivo o agregar enlace, listar, archivar
    AdminActividades.tsx                # gestión de actividades obligatorias (admin) + adjuntar materiales
    AdminCiclosCapacitacion.tsx          # abrir/archivar ciclos de re-entrenamiento + avance por persona

  pages/
    Login.tsx / Registro.tsx / Recuperar.tsx / Restablecer.tsx / CuentaInactiva.tsx
    Panel.tsx                 # dashboard del día a día: nivel/XP, racha, repasos, insignias, teaser de liga
    Liga.tsx                   # ranking completo por división, héroes de la semana, auto-competencia
    Ejercicios.tsx             # categorías en grilla de bloques → dominios → practicar
    Practica.tsx                 # sesión de práctica con SRS + confianza, XP y celebración
    Consultas.tsx                  # relator: enviar/ver consultas (+ EstadoConsulta compartido)
    Admin.tsx                       # panel admin (relatores, equipo, actividades, consultas)
    FichaRelator.tsx                  # ficha individual con gráfico, drill al objetivo, metas y export (PDF/Excel)
    Actividades.tsx                    # relator: actividades obligatorias

design/                      # documentos de trabajo (no entran al bundle)
  revision-ux-benchmark.md   # benchmark UX/UI multidimensional (8 dims) + re-evaluaciones
  scorecard-dimensiones.html # scorecard visual de las 8 dimensiones
  metodologia-beneficios.md  # análisis pedagógico del contenido Club WOM
  auditoria-bd-acciones.md   # auditoría de integridad + recuperabilidad del log de acciones

.github/workflows/
  ci.yml                     # lint + tests (vitest) + build en cada PR
  deploy-pages.yml           # build + publica a rama gh-pages en cada push a main

vite.config.ts               # plugins: react, tailwindcss, PWA
vercel.json                  # rewrites SPA (deploy alternativo, no usado actualmente)
```

---

## 14. Desarrollo local

```bash
npm install
npm run dev        # servidor de desarrollo (Vite)
npm run lint        # oxlint
npm run build        # tsc -b && vite build (typecheck + build de producción)
npm run preview       # sirve dist/ localmente
```

Variables de entorno (`.env`, ver `.env.example`):

```
VITE_SUPABASE_URL=https://jgtrfrfolcfpvzbsiuka.supabase.co
VITE_SUPABASE_ANON_KEY=<clave publicable>
```

> La clave `anon` está diseñada para exponerse en el cliente: la seguridad
> depende de RLS, no de ocultarla. Nunca usar la clave `service_role` en
> el frontend.

---

## 15. Flujo de trabajo y convenciones

- **Nada se sube directo a `main`.** Todo cambio va en una rama → PR en
  borrador → CI (`lint` + `build`) verde → marcar listo → merge → deploy
  automático.
- **Migraciones de Supabase** se aplican con nombres descriptivos
  (`apply_migration`), quedan versionadas en el historial del proyecto
  Supabase (§4, lista completa) y siempre se revisan los *advisors* de
  seguridad después de aplicarlas.
- **Verificación antes de mergear**: `npm run lint && npm run build`
  siempre; cambios de datos/RLS se prueban end-to-end contra Supabase con
  un usuario de prueba que se crea y se elimina en la misma sesión;
  cambios visuales se capturan con Chromium (desktop + móvil, con sesión y
  datos simulados vía interceptación de red) antes de mergear.
- Commits y PRs en español, consistente con el resto del proyecto y el
  idioma de la audiencia (equipo de formación WOM).

---

## 16. Estado y próximos pasos sugeridos

**Completo y en producción (al 2026-07-18):** autenticación con activación
por admin, catálogo de **13 dominios** con SRS Leitner, anti-copia y
**aprendizaje basado en confianza** (2×2, detección del *seguro-pero-
equivocado*), gamificación completa (XP/niveles/racha/ranking/**ligas por
división + auto-competencia**/insignias/certificados), actividades
obligatorias con cumplimiento y **biblioteca de materiales de capacitación**
(§8.1 — archivo o enlace, adjuntable a cualquier actividad), **ciclos de
re-entrenamiento** (§8.2 — recertificación periódica, cambio de producto o
procedimiento, refuerzo por baja precisión, con avance visible para
ejecutivo, supervisor y en la ficha individual), **pantalla "Liga" propia**
(§7.3 — ranking completo, héroes de la semana y auto-competencia separados
del Panel, que quedó simplificado al día a día), **quick-start**
("Repasar ahora" salta directo a la sesión), Ejercicios en **grilla de
bloques**, **buscador global** (paleta ⌘K que encuentra dominios y
ejercicios), panel admin con analítica individual y de equipo **Nivel 2**
(qué atender, rango de fechas, tendencia, drill al objetivo, **exportar el
reporte de equipo y la ficha del relator a PDF/Excel/CSV**), pantalla núcleo
con celebración depurada y accesibilidad
(aria-live/foco/AA), identidad visual WOM con modo oscuro, PWA instalable con
práctica offline. **Integridad del log de acciones auditada y con respaldo
automático semanal fuera de la base** (§17). Benchmark UX/UI multidimensional
(§11): promedio **7.3/10**, 7 de 8 dimensiones en 7.5+. Análisis de coherencia
formación/re-entrenamiento en `design/coherencia-formacion-reentrenamiento.md`.

**Pendiente (decisión de negocio, no técnica):**
- **Vínculo formación ↔ KPI del negocio** (dim. 7 del benchmark, hoy 3.0 —
  la última palanca estratégica): definir qué KPI (AHT/FCR/CSAT/conversión) y
  de qué fuente sale el dato. Con eso se construye. Recordatorio programado
  para el 20-jul-2026.
- Activar en el dashboard de Supabase la protección de contraseñas
  filtradas (HaveIBeenPwned) — Auth → Passwords.
- Cambiar la rama por defecto del repo a `main` en GitHub Settings
  (cosmético; bloqueado para la sesión automatizada por política de
  permisos).

**Ideas de continuidad** (no comprometidas): que el buscador guarde
búsquedas/dominios recientes, push notifications reales, generación de
preguntas asistida por IA desde el panel admin, export agregado por
división/equipo, soporte multi-idioma si WOM lo requiere en otras operaciones.

---

## 17. Respaldo y recuperabilidad del log de acciones

Auditoría del 2026-07-12 (detalle en `design/auditoria-bd-acciones.md`).

**Qué es el log de acciones.** Cada acción de un relator queda en `attempts`
(una fila por respuesta a un ejercicio) — es la fuente de verdad del XP y de
toda la analítica. `activity_events` complementa con una bitácora de sesión
(login/logout/acceso denegado). `srs_cards` es estado derivado de repaso, no
un registro de acción.

**Integridad (impecable).** 181 intentos al momento de la auditoría, 0 nulos
en columnas clave, 0 IDs duplicados, 0 fechas futuras, 0 huérfanos; los
perfiles calzan 1:1 con `auth.users`.

**Inmutabilidad (auditoría a prueba de borrado).** Las tablas de registro
(`attempts`, `activity_events`, `insignias_usuario`, `consultas`) **no tienen
política RLS de `DELETE` ni de `UPDATE`**: solo `INSERT` y `SELECT`. Ni un
usuario ni el admin pueden borrar o alterar un registro de acción desde la
API. El admin lee todo (`is_admin()`), lo que permite exportar el historial
completo (reportes de equipo/ficha en PDF/Excel/CSV).

**Riesgo cubierto.** Todas las FK son `ON DELETE CASCADE` hacia el usuario
(`auth.users → profiles → attempts / activity_events / insignias / consultas /
goals`). En operación normal no pasa nada, porque la app da de baja con
`activo = false` en vez de borrar; pero un borrado manual del usuario
arrastraría su historial, y el plan Supabase no tiene backups automáticos ni
point-in-time recovery. Único cron (`corte-semanal-ligas`) no borra nada.

**Respaldo automático (copia inmutable fuera de la base).** Una tarea
programada semanal (lunes 09:00 UTC ≈ 05:00 Chile) exporta todas las tablas de
acciones a un `.zip` (CSV por tabla + `MANIFIESTO.txt` con conteos y rango de
fechas) y lo (1) entrega por chat, (2) envía por correo, y (3) sube a **Google
Drive**, a la carpeta del proyecto "Formación WOM - Respaldos de acciones".
Para correrlo a demanda: pedir "genera el respaldo del log de acciones ahora".

**Recomendaciones abiertas.** Guardar cada `.zip` en almacenamiento durable
(ya se sube a Google Drive); opcionalmente el plan Pro de Supabase habilita
backups diarios + PITR (con eso el respaldo semanal pasa a ser redundancia).
No se recomienda cambiar el `ON DELETE CASCADE` a `RESTRICT` (rompeía la
eliminación legítima de usuarios de prueba).
