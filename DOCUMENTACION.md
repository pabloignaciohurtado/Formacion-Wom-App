# Formación WOM — Documentación del proyecto

Plataforma web interna de formación para relatores de WOM: ejercicios con
repaso espaciado, gamificación (XP, niveles, racha, ligas, insignias,
ranking), actividades obligatorias con seguimiento de cumplimiento, y panel
de administración con analítica por persona y por contenido.

- **En producción:** https://pabloignaciohurtado.github.io/Formacion-Wom-App/
- **Repositorio:** `pabloignaciohurtado/Formacion-Wom-App` (GitHub)
- **Estado:** 19 PRs merged, en operación con datos reales

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
┌─────────────────────┐        ┌──────────────────────────┐
│   Navegador (SPA)    │◄──────►│   Supabase (BaaS)         │
│   React 19 + Vite     │  REST  │   - Postgres + RLS         │
│   PWA / offline queue │  Auth  │   - Auth (email/password)  │
└──────────┬───────────┘        │   - Funciones SQL (RPC)    │
           │                     └──────────────────────────┘
           │ build estático
           ▼
┌──────────────────────┐
│   GitHub Pages         │  ← publicado por GitHub Actions
│   (rama gh-pages)       │     en cada push a main
└──────────────────────┘
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
   → GitHub Actions "CI": npm ci, oxlint, tsc + vite build
   → si está verde: merge a main
   → GitHub Actions "Deploy a GitHub Pages":
        build con --base=/Formacion-Wom-App/
        copia index.html → 404.html (fallback de SPA)
        publica el contenido de dist/ a la rama gh-pages (git push forzado)
   → GitHub Pages sirve gh-pages en la URL pública
```

Archivos clave: `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`.

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
todas las tablas.** 7 migraciones aplicadas, en orden:

1. `endurecer_funciones_security_definer`
2. `proteger_campos_administrativos_perfil`
3. `gamificacion_ranking_racha`
4. `actividades_obligatorias`
5. `insignias_usuario`
6. `ligas_semanales`
7. `analytics_admin`

### 4.1 Tablas

| Tabla | Rol | Notas |
|---|---|---|
| `profiles` | Perfil por usuario | `role` (relator/admin), `activo`, `liga`; **fila creada únicamente por trigger**, nunca por el cliente |
| `attempts` | Cada respuesta a un ejercicio | `correcto`, `puntaje`, `domain_id`, `objetivo_id`, `fecha` — es la fuente de verdad del XP y las métricas |
| `srs_cards` | Estado de repaso espaciado | PK compuesta `(user_id, exercise_id)`; `caja` (1–5), `proximo_repaso` |
| `goals` | Metas de maestría por dominio | Asignadas por un admin, PK `id` = `"{user_id}-{domain_id}"` |
| `consultas` | Preguntas de relatores | `estado` (pendiente/respondida), `respuesta_admin` |
| `actividades` | Actividades obligatorias | `activa` (archivado suave), `fecha_limite`, `enlace` |
| `actividades_completadas` | Cumplimiento | PK compuesta `(actividad_id, user_id)` |
| `insignias_usuario` | Insignias obtenidas | PK compuesta `(user_id, insignia_id)`; el catálogo vive en el frontend |
| `cortes_semanales` | Idempotencia del corte de ligas | PK `semana` (date); registra qué semanas ya se procesaron |
| `activity_events` | Bitácora genérica | Heredada del esquema original, uso libre |

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
| `resumen_equipo()` | `SECURITY DEFINER`, guard `is_admin()` en el `WHERE` | Ficha resumida de cada relator activo: XP, precisión, última actividad, obligatorias pendientes |
| `precision_por_dominio()` | `SECURITY DEFINER`, guard `is_admin()` | Precisión agregada del equipo por dominio (≥5 intentos) — detecta contenido difícil |

### 4.3 Políticas RLS (resumen)

- **`profiles`**: cada quien lee/actualiza su fila (`id = auth.uid()`) o el admin todo (`is_admin()`); insert solo con `id = auth.uid()` (disparado por el trigger de alta). El trigger `proteger_campos_perfil` impide, además, que un usuario cambie sus propios campos administrativos aunque intente `UPDATE` directo a la API.
- **`attempts` / `srs_cards`**: cada quien lee/escribe solo lo propio (`user_id = auth.uid()`); admin lee todo.
- **`consultas`**: cada quien crea/lee lo propio; solo admin actualiza (responde).
- **`actividades`**: lectura para todo `authenticated`; gestión (`ALL`) solo admin.
- **`actividades_completadas`**: cada quien inserta/borra lo propio; admin lee todo.
- **`insignias_usuario`**: cada quien inserta/lee lo propio; admin lee todo. Verificado con un test E2E real: un usuario no puede otorgarse insignias a nombre de otro (bloqueado por RLS).
- **`goals`**: lectura propia o admin; escritura (`ALL`) solo admin.
- **`cortes_semanales`**: lectura para todo `authenticated` (necesaria para que el cliente decida si llamar al RPC de corte); sin escritura directa, solo vía la función `SECURITY DEFINER`.

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
de datos. **12 dominios**, agrupados en **3 categorías** (`CATEGORIAS`):

- 🛒 **Productos y Servicios**: Portabilidad, Planes, Prepago, Equipos,
  Boleta y Pagos, Servicios Adicionales
- 🔧 **Técnico y Conectividad**: Internet Fibra, Internet Móvil, Roaming,
  Servicio Técnico
- 🎯 **Habilidades**: Atención al Cliente, Técnicas de Formación

Cada dominio tiene 2 objetivos y ~10 ejercicios de alternativas con
explicación pedagógica (≈112 preguntas en total). Los `id` de dominio y
ejercicio son **estables** (`po-01`, `atencion-cliente`, etc.): son la
clave foránea lógica que usan `attempts` y `srs_cards`, así que renombrar
o borrar un ejercicio existente rompe el historial de quienes ya lo
respondieron. Agregar contenido nuevo es seguro y no requiere migración.

### 6.2 Algoritmo Leitner (`src/lib/srs.ts`)

- 5 cajas; intervalo hasta el próximo repaso: **1, 2, 4, 8, 16 días**
  (`DIAS_POR_CAJA`).
- Acierto → sube una caja (tope caja 5). Fallo → vuelve a caja 1.
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
3. Al responder: feedback inmediato (check verde / shake en la incorrecta,
   explicación), se calcula la nueva caja, y se registran en paralelo un
   `insert` en `attempts` y un `upsert` en `srs_cards`.
4. **XP en vivo**: +25 por acierto, +5 por intento fallido (constantes en
   `src/lib/gamificacion.ts`), con chip flotante animado.
5. Al terminar la cola: pantalla de resumen con confetti (colores WOM),
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
TalentCards y las mecánicas de Duolingo (ver §11).

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
  vista guardada en `localStorage` del dispositivo.
- `liga` está protegida por el mismo trigger que protege `role`/`activo`:
  un usuario no puede subirse de liga escribiendo directo a la API.

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
  publicar (título, descripción, enlace opcional, fecha límite opcional);
  lista con **barra de cumplimiento X/Y** y los nombres de quienes ya la
  completaron; "archivar" en vez de borrar (`activa=false`).
- **Relator** (`src/pages/Actividades.tsx`): pendientes con semáforo de
  fecha límite (ámbar ≤3 días, rojo vencida), enlace al material, botón
  "Marcar completada" (mini confetti), sección de completadas tachadas.
- Contribuye a la insignia "Siempre al día" y es una de las señales del
  dashboard de equipo en Admin.

---

## 9. Panel de administración

`src/pages/Admin.tsx` compone tres bloques:

1. **Relatores**: tabla con activar/desactivar (registra `alta_por`,
   `alta_fecha`/`baja_fecha`), badge de rol y punto de estado.
2. **`AdminEquipo`** (analítica, §4.2 `resumen_equipo`/`precision_por_dominio`):
   - Tabla de seguimiento por persona: liga, XP, precisión, **última
     práctica con semáforo** (rojo si ≥7 días sin actividad o nunca
     practicó — los que necesitan un empujón saltan a la vista), estado
     de obligatorias, enlace a su ficha individual.
   - **Contenido difícil**: dominios con precisión de equipo <70%,
     candidatos a reforzar en sesión presencial o a revisar sus preguntas.
3. **`AdminActividades`** (§8) y **Consultas** (responder preguntas de
   relatores, marca `estado='respondida'`).

### 9.1 Ficha individual (`src/pages/FichaRelator.tsx`, ruta `/admin/relator/:id`)

- Cabecera con avatar, liga y datos de contacto.
- 3 métricas (XP, ejercicios, precisión) de las últimas 8 semanas.
- **Gráfico de evolución semanal de XP**: barras SVG dibujadas a mano
  (sin librería de gráficos) agrupando `attempts` por semana ISO.
- Maestría por cada uno de los 12 dominios (barras de progreso).
- **Asignación de metas** desde la UI: elegir dominio + % objetivo →
  `upsert` en `goals`; se muestra meta vs. avance real con semáforo de
  cumplimiento.

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
celebraciones/insignias/ligas, `AnimatePresence` para modales y paneles
colapsables, transiciones de progreso con easing. `canvas-confetti` para
las celebraciones (fin de sesión, insignia nueva, cambio de liga,
actividad completada).

---

## 11. Benchmark competitivo (contexto de decisiones)

Se comparó contra Axonify, SC Training/EdApp, Qstream, TalentCards y las
mecánicas públicas de Duolingo. Hallazgo: la app ya igualaba el núcleo
pedagógico (SRS real) pero carecía de insignias/certificados, ligas,
analítica de administrador y experiencia instalable/offline — las 4
brechas que se cerraron en los PRs #16–#19 (§12). Con eso, Formación WOM
alcanza paridad funcional con esas plataformas comerciales a costo $0.

Quedan fuera de alcance, documentadas como pendientes (P3):

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
  iconos — ~42 archivos), `registerType: autoUpdate`.
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
    srs.ts                   # algoritmo Leitner (cajas, intervalos, maestría)
    gamificacion.ts          # XP, niveles, ligas
    insignias.ts             # catálogo y evaluación de insignias
    certificado.ts           # generación de certificado PNG en canvas
    colaOffline.ts           # cola de intentos sin conexión

  data/
    contenido.ts             # catálogo de dominios/objetivos/ejercicios + categorías

  components/
    Layout.tsx                # shell (sidebar/bottom-nav, header, tema, offline sync)
    AuthLayout.tsx             # panel de marca split-screen para pantallas de auth
    MarcaWom.tsx                # logo/wordmark reutilizable
    ui.tsx                      # Boton, Campo, Tarjeta, MensajeError, EstadoCarga, Esqueleto
    ContadorAnimado.tsx          # número que cuenta hacia arriba (ease-out)
    InsigniaModal.tsx             # modal de celebración (insignias y cambios de liga)
    AdminEquipo.tsx                # tabla de seguimiento + contenido difícil
    AdminActividades.tsx            # gestión de actividades obligatorias (admin)

  pages/
    Login.tsx / Registro.tsx / Recuperar.tsx / Restablecer.tsx / CuentaInactiva.tsx
    Panel.tsx                 # dashboard: nivel, racha, XP, ranking, héroes, insignias
    Ejercicios.tsx             # categorías colapsables → dominios → practicar
    Practica.tsx                 # sesión de práctica con SRS, XP y celebración
    Consultas.tsx                  # relator: enviar/ver consultas (+ EstadoConsulta compartido)
    Admin.tsx                       # panel admin (relatores, equipo, actividades, consultas)
    FichaRelator.tsx                  # ficha individual con gráfico y metas
    Actividades.tsx                    # relator: actividades obligatorias

.github/workflows/
  ci.yml                     # lint + build en cada PR
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

**Completo y en producción:** autenticación con activación por admin,
catálogo de 12 dominios con SRS Leitner y anti-copia, gamificación
completa (XP/niveles/racha/ranking/ligas/insignias/certificados),
actividades obligatorias con cumplimiento, panel admin con analítica
individual y de equipo, identidad visual WOM con modo oscuro, PWA
instalable con práctica offline.

**Pendiente (decisión de negocio, no técnica):**
- Activar en el dashboard de Supabase la protección de contraseñas
  filtradas (HaveIBeenPwned) — Auth → Passwords.
- Cambiar la rama por defecto del repo a `main` en GitHub Settings
  (cosmético; bloqueado para la sesión automatizada por política de
  permisos).

**Ideas de continuidad** (no comprometidas, para cuando se retome el
proyecto): push notifications reales, generación de preguntas asistida
por IA desde el panel admin, exportar reportes de equipo a PDF/Excel,
soporte multi-idioma si WOM lo requiere en otras operaciones.
