# Contexto del proyecto para Claude Code

Este archivo se carga automáticamente al abrir una sesión en este repo.
Léelo primero. Para la arquitectura y funcionalidad completa, ver
[`DOCUMENTACION.md`](./DOCUMENTACION.md) — este archivo es memoria
operativa: quién es el usuario, cómo se trabaja aquí, y qué se aprendió
por las malas.

## Quién y qué

- **Dueño del proyecto:** Pablo Hurtado (`pabloignaciohurtado@gmail.com`,
  `pablo.hurtado@wom.cl`) — coordinador de formación en WOM (telco
  chilena). No es programador; espera que Claude ejecute de punta a punta
  (research → código → PR → merge → deploy → verificación) sin pedirle
  pasos manuales salvo que sean estrictamente inevitables.
- **Qué es:** plataforma de formación interna para relatores WOM. Ejercicios
  con repaso espaciado (SRS Leitner), gamificación completa (XP, niveles,
  racha, ligas, insignias, certificados, ranking), actividades
  obligatorias, panel admin con analítica.
- **Producción:** https://pabloignaciohurtado.github.io/Formacion-Wom-App/
  (GitHub Pages, rama `gh-pages`, auto-desplegado en cada push a `main`).
- **Supabase:** proyecto `formacion-wom`, ref `jgtrfrfolcfpvzbsiuka`. Es el
  único proyecto correcto — la cuenta también tiene `Buscadordeprecios`
  (inactivo, no tocar) y en algún momento Pablo mencionó un dashboard
  llamado "formación-mujer" que **no es este proyecto** (confusión de
  navegación suya, no un proyecto real relacionado).
- **Estado al 2026-07-18:** funcionalidad completa en producción (ver §16
  de `DOCUMENTACION.md`). No hay trabajo a medias ni ramas colgando.
  Desde el 2026-07-09 se sumaron (PRs merged, todos desplegados): ligas por
  división + auto-competencia, quick-start, limpieza de celebración +
  accesibilidad del núcleo, **aprendizaje basado en confianza** en el SRS
  (columna `attempts.confianza`, 2×2 con detección del *seguro-pero-
  equivocado*), **analítica de jefaturas Nivel 1 y 2** (qué atender, export
  CSV, rango de fechas, tendencia, drill al objetivo), **dominio Club WOM**
  (13 dominios; + `contenido.test.ts` de integridad), **Ejercicios en grilla
  de bloques**, **buscador global** (paleta ⌘K en el header:
  `BuscadorGlobal.tsx` + `lib/busqueda.ts`, encuentra dominios y ejercicios),
  **export del reporte de equipo y de la ficha del relator a PDF/Excel**
  (menú "Exportar" reutilizable `components/MenuExportar.tsx` + `lib/reportes.ts`;
  jspdf y write-excel-file en carga diferida, fuera del bundle inicial), y una
  **auditoría de integridad + respaldo automático del log de acciones**
  (ver sección "Respaldo" más abajo y `design/auditoria-bd-acciones.md`), una
  **biblioteca de materiales de capacitación** (tabla `materiales` +
  bucket privado `materiales` en Storage, componente
  `components/AdminMateriales.tsx`) adjuntable a cualquier actividad
  obligatoria vía `actividad_materiales` (N:N) — ver DOCUMENTACION.md §8.1, y
  **ciclos de re-entrenamiento** (tabla `ciclos_capacitacion` +
  `ciclos_capacitacion_destinatarios`, componente
  `components/AdminCiclosCapacitacion.tsx`, RPC `progreso_ciclos_capacitacion()`)
  para recertificación periódica, cambio de producto/procedimiento o refuerzo
  por baja precisión — ver DOCUMENTACION.md §8.2 y el análisis previo en
  `design/coherencia-formacion-reentrenamiento.md`. El mismo día (2026-07-18),
  a pedido de Pablo ("la sección Panel está con muchas cosas, que el ranking
  y las posiciones tengan su propio espacio"), se separó el ranking/liga del
  Panel a una pantalla nueva `src/pages/Liga.tsx` (ruta `/liga`, ítem propio
  en el menú con ícono de trofeo) — ver DOCUMENTACION.md §7.3. El Panel quedó
  solo con el día a día (nivel/XP, racha, repasos, insignias) más una
  tarjeta compacta de posición que enlaza a `/liga`.
  Benchmark UX/UI multidimensional: promedio **6.3 → 7.3** (`design/revision-ux-benchmark.md`,
  scorecard en `design/scorecard-dimensiones.html`). El 2026-07-21, a pedido
  de Pablo ("en el panel de admin poder crear usuarios"), se agregó alta de
  usuario directo desde `/admin` (botón "Nuevo usuario",
  `components/AdminCrearUsuario.tsx`) sin pasar por autorregistro: llama al
  **primer Edge Function del proyecto**, `admin-crear-usuario`
  (`supabase/functions/admin-crear-usuario/index.ts`), que es el único
  lugar que usa `service_role` (nunca expuesto al cliente) — ver
  DOCUMENTACION.md §5. La contraseña se genera sola si no se indica una, y
  se muestra una única vez para copiar y compartir por canal seguro.

  > Nota de higiene: la §4 de `DOCUMENTACION.md` (lista numerada de
  > migraciones) quedó desactualizada antes de esta sesión — el proyecto
  > tiene 19 migraciones reales pero la lista numerada solo muestra 10
  > (le faltan las de roles ejecutivo/supervisor/alcance, ligas por
  > división, corte semanal vía `pg_cron`, etc., de la sesión del
  > 2026-07-10). No se corrigió aquí para no mezclar un audit de docs no
  > pedido con esta feature; si Pablo pide "actualiza la documentación"
  > de nuevo, reconciliar esa lista contra `list_migrations` primero.

## Cómo se trabaja en este repo

- **Flujo estricto:** rama de sesión → PR en borrador → CI verde → marcar
  listo → merge (squash) → esperar el deploy → verificar en producción con
  `curl`/grep del bundle publicado. Nunca directo a `main`.
- **La rama de sesión se reinicia desde `main` antes de cada PR nuevo:**
  `git fetch origin main && git checkout -B <rama-de-sesión> origin/main`.
  No se acumulan commits viejos de PRs ya mergeados en la rama de trabajo.
- **Migraciones Supabase** vía `apply_migration` con nombre descriptivo,
  y siempre revisar `get_advisors(type: security)` después.
- **Verificación antes de mergear**, no solo "compila":
  - `npm run lint && npm run build` siempre.
  - Cambios de datos/RLS: E2E real contra Supabase con un usuario de
    prueba (`test-claude@example.com`) que se crea, se ejercita, y se
    **elimina por completo** al terminar (`auth.users` + todas las tablas
    hijas) — nunca dejar basura de pruebas en la base real.
  - Cambios visuales: capturas con Playwright + Chromium
    (`/opt/pw-browsers/chromium`) en desktop (1440px) y móvil (390px),
    con sesión y datos simulados vía interceptación de red
    (`page.route` sobre `https://jgtrfrfolcfpvzbsiuka.supabase.co/**`).
    Enviar las capturas al usuario con `SendUserFile` antes de dar el PR
    por bueno visualmente.
- **CI a veces se cancela solo** (infraestructura de GitHub Actions, no el
  código). Si un run queda `cancelled` sin pasos fallidos, un commit vacío
  (`git commit --allow-empty`) lo vuelve a disparar.
- **El deploy a Pages puede demorar 10–20 min en propagar** después de que
  el workflow termina en verde (CDN de GitHub, no es un error). Si
  `sw.js`/`manifest.webmanifest`/el bundle nuevo dan 404 recién desplegado,
  esperar y reintentar antes de asumir que algo se rompió — revisar
  primero si el proceso interno "pages build and deployment" (visible en
  Actions) ya terminó.
- Comunicación con el usuario, commits, PRs: todo en **español**.

## Respaldo y recuperabilidad del log de acciones

- **El rastro de acciones es impecable e inmutable.** Auditoría del 2026-07-12
  (`design/auditoria-bd-acciones.md`): 0 nulos/huérfanos/duplicados, integridad
  referencial 1:1 con `auth.users`. Las tablas de registro (`attempts`,
  `activity_events`, `insignias_usuario`, `consultas`) **no tienen política
  RLS de DELETE ni UPDATE** → son solo-anexado; nadie las puede borrar/editar
  desde la API. `attempts` es la fuente de verdad de las acciones.
- **Riesgo cubierto:** todas las FK son `ON DELETE CASCADE` hacia el usuario
  (`auth.users → profiles → attempts/…`). La app nunca borra usuarios (baja
  lógica `activo=false`), pero un borrado manual del usuario arrastraría su
  historial, y el plan Supabase no tiene backups automáticos/PITR.
- **Respaldo automático semanal** (tarea programada, lunes 09:00 UTC): exporta
  todas las tablas a un `.zip` (CSV por tabla + `MANIFIESTO.txt`) y lo entrega
  por chat/correo **y lo sube a Google Drive**, carpeta del proyecto
  "Formación WOM - Respaldos de acciones" (id
  `1QAubda3rlaEgCCu94s9lqejDTvWnEO_T`). Es copia inmutable fuera de la base.
  Para correrlo a demanda: pedir "genera el respaldo del log de acciones ahora".
- **Export manual del respaldo** (lo que hace la tarea): `execute_sql` con un
  `json_build_object(...)::text` de todas las tablas → el output grande se
  guarda en un `.txt` que es JSON `{"result":"…"}`; parsear con `json.load`,
  tomar `['result']`, extraer con regex el array `[{"respaldo": "<json>"}]` y
  hacer doble `json.loads` (el `::text` lo deja doble-codificado). Luego CSV
  por tabla + zip.

## Restricciones de la sesión (no son bugs, son la plataforma)

- El proxy de la sesión **bloquea escrituras a la configuración del
  repositorio** en GitHub (settings, default branch, habilitar Pages vía
  API). Por eso la rama por defecto del repo sigue siendo la rama de
  sesión y no `main` — es cosmético, no afecta nada funcional, y Pablo ya
  sabe que solo él puede cambiarlo desde Settings → General.
- Por eso también el deploy usa `git push` directo a la rama `gh-pages`
  en vez del flujo nativo "Source: GitHub Actions" de Pages (ese requiere
  un permiso de API que el token del workflow no tiene).
- Force-push y push a `main` desde Bash quedan bloqueados por el
  clasificador de permisos salvo que el usuario los autorice explícitamente
  con la frase exacta ("sí: push de X e Y") — normalmente no hace falta
  porque el flujo normal usa PRs vía la API de GitHub (`mcp__github__*`),
  que sí tiene permiso de escritura.

## Gotchas técnicos ya resueltos (no los repitas)

- **Playwright + mocks de Supabase:** para que `count: 'exact', head: true`
  funcione en las capturas hay que exponer el header `content-range` con
  `access-control-expose-headers` en la respuesta simulada, si no el
  conteo queda en 0 aunque el mock "responda bien".
- **`row_number()` en Postgres es `bigint`**: al restarlo de una fecha hay
  que castear a `::int` explícito o falla `operator does not exist: date - bigint`.
- **`vite build --base=...` para GitHub Pages de proyecto** (no de
  usuario): el sitio vive en un subpath, así que `BrowserRouter` usa
  `basename={import.meta.env.BASE_URL}` para funcionar igual en local y
  en producción.
- **Cera Pro (tipografía corporativa WOM) es comercial**, no se puede
  redistribuir — se usa Poppins self-hosted como equivalente visual libre.
- **Playwright se instala en el proyecto** (`npm install --no-save
  playwright-core`) porque `npm install` normal a veces lo purga entre
  pasos; si un script `.mjs` de capturas falla con `ERR_MODULE_NOT_FOUND`,
  reinstalar antes de asumir otra cosa. El script `.mjs` debe estar **dentro
  del proyecto** (no en `/tmp`) para que resuelva `node_modules`.
- **`git push` directo está BLOCKED (403)** en esta sesión: se usa
  `mcp__Github2__push_files` con el contenido inline y luego se verifica
  `git diff HEAD origin/<rama> | wc -l == 0`. Para fidelidad byte a byte con
  acentos y símbolos, generar el string escapado con
  `python3 -c "import json;print(json.dumps(open(F).read()))"` y pegar ese
  literal como `content` del push (evita errores de escape a mano).
- **Verificar CI con `pull_request_read` método `get_check_runs`** (da el
  check "verificar" con conclusion success/failure). El `get_status` del PR
  devuelve *commit statuses* (total_count 0), no los check runs de Actions;
  alternativa: `actions_list list_workflow_runs` filtrando por la rama.
- **Trabajar siempre en rama de sesión**, nunca commitear en `main` local. Si
  por error se commiteó en main local, `git checkout main && git reset --hard
  origin/main` lo realinea (el push real va por MCP a la rama, no por git).
- **Capturas Playwright:** con el build local (base `/`) navegar a la ruta
  **sin** el prefijo `/Formacion-Wom-App/` (ej. `http://localhost:4173/ejercicios`),
  o React Router no matchea. El gate de cuenta exige un perfil simulado con
  `{ activo: true, role: 'admin' }` (la columna es `role`, no `rol`).
- **`pkill -f "vite preview"` combinado con `&` o más comandos en una misma
  llamada Bash da exit 144** y corta el resto — correr el kill solo, en su
  propia llamada, o simplemente lanzar el preview en otro puerto.
- **Cambios de dependencias → los workflows usan `npm install`, no `npm ci`.**
  El proxy no deja pushear por MCP el `package-lock.json` regenerado (~268 KB;
  `push_files` inline se trunca), así que el lock queda detrás de
  `package.json`. `npm install` reconcilia y compila; `npm ci` fallaría. Para
  el push de un cambio con deps: NO incluir el lock (dejarlo como en `main`) y
  editar `ci.yml`/`deploy-pages.yml` a `npm install`. Volver a `npm ci` estricto
  requiere commitear el lock desde un entorno con push directo (esta sesión no
  lo tiene: `GH_TOKEN` del entorno no sirve para git, y `git push` pide auth).
- **jspdf + write-excel-file se cargan con `import()` diferido** dentro de
  `lib/reportes.ts` para no engordar el bundle inicial; se testea el export de
  verdad con Playwright (descarga real del PDF/xlsx y validación de cabeceras).
  El glifo `≥` no existe en las fuentes estándar de jsPDF (WinAnsi) — usar
  ASCII (ej. "7+ días") en el texto del PDF.
- **Subir un binario a Google Drive** con `mcp__Google_Drive__create_file`:
  `base64Content` (genéralo con `base64 -w0`) + `contentMimeType: application/zip`
  + `disableConversionToGoogleType: true` + `parentId` de la carpeta. El
  `fileSize` que devuelve al crear puede venir engañoso (reportó 10 KB para un
  zip de 14 KB); verificar de verdad con `download_file_content` y probar el
  archivo (el zip trae su EOCD `PK\x05\x06` al final si está completo). Para
  pegar el base64 en el tool-call, que quepa bajo el cap de lectura (~22 KB):
  mantener el zip liviano (solo CSV, sin el JSON gigante) o dividirlo.
- **Errores transitorios de MCP** `Tool permission stream closed before
  response received`: son intermitentes (a Google Drive le pasó 2 veces
  seguidas y funcionó al reintentar). Reintentar la MISMA llamada, no cambiar
  de enfoque.
- **Salida grande de `execute_sql`** se guarda a un `.txt` en `tool-results/`
  en vez de mostrarse; procesarla con Python (`json.load` del archivo → `['result']`
  → regex del array → doble `json.loads`), no pegarla al contexto.
- **Bucket de Storage privado + descarga con `createSignedUrl`**: el bucket
  `materiales` no es público (`public: false`); "Ver" un archivo pide una
  URL firmada en el momento del clic (`supabase.storage.from('materiales').
  createSignedUrl(path, 60)`), nunca una URL fija — la RLS de
  `storage.objects` es la que autoriza, no la opacidad de la ruta. Los tipos
  de `Database` (`database.types.ts`) se mantienen a mano igual que el resto
  del esquema; `storage.buckets`/`storage.objects` no se tipan ahí (son
  schema `storage`, fuera de `public`).
- **E2E de RLS sin crear usuarios reales:** el clasificador de permisos de
  la sesión **bloquea** cualquier script (Bash/Node) que haga `signUp` real
  contra el proyecto Supabase de producción, aunque sea "de prueba" — lo
  trata como escritura persistente no autorizada específicamente, y la
  autorización genérica del usuario no alcanza para cubrirlo. Alternativa
  que sí funciona y es más rápida: un único `execute_sql` con
  `BEGIN; ... ROLLBACK;` que (1) inserta filas de prueba en `auth.users`
  (dispara `handle_new_user`, que ya crea el `profile`) y las ajusta con
  `UPDATE profiles` a los roles que hagan falta, (2) simula cada usuario con
  `select set_config('request.jwt.claims', json_build_object('sub', '<uuid>',
  'role','authenticated')::text, true); set local role authenticated;` antes
  de cada bloque de aserciones (así `auth.uid()` resuelve a ese usuario y
  las políticas RLS se evalúan de verdad, no como `postgres`/`service_role`
  que las saltan), (3) vuelca cada resultado a una tabla `temporary` con
  `grant all ... to authenticated` para poder escribirla bajo el rol
  simulado, y (4) termina en `ROLLBACK` — cero datos persistidos, verificable
  después con un `count(*)` sobre los emails de prueba. Para probar que un
  `INSERT` está bloqueado por RLS, envolverlo en `do $$ ... exception when
  insufficient_privilege then ... end $$;` (si no lanza esa excepción, la
  política falló). Usado para verificar `ciclos_capacitacion` (7/7 checks:
  alcance, aislamiento, bloqueo de insert no autorizado, y visibilidad
  correcta del RPC `progreso_ciclos_capacitacion()` para uno mismo, el
  supervisor del equipo, y un tercero ajeno).

## Pendientes de decisión humana (no técnicos)

- Activar "Prevent the use of leaked passwords" en Supabase → Auth →
  Passwords (Pablo lo tiene pendiente hace varias sesiones).
- Cambiar la rama por defecto del repo a `main` en GitHub Settings
  (cosmético, ver arriba).
- **Vínculo formación ↔ KPI del negocio (dim 7 del benchmark, hoy en
  3.0 — la última palanca estratégica).** Pablo lo pospuso el 11-jul-2026.
  Bloqueado hasta que defina: (1) qué KPI conectar (AHT, FCR, CSAT,
  conversión…) y (2) de qué fuente/formato sale el dato (una planilla de
  ejemplo basta). Con eso se construye. Hay un recordatorio programado
  para el 20-jul-2026. Contexto: `design/revision-ux-benchmark.md` §7 y §11.

## Ideas de continuidad no comprometidas

Si Pablo pide seguir: que el buscador global guarde búsquedas/dominios
recientes (ofrecido, no comprometido), push notifications reales, generación
de preguntas asistida por IA desde el panel admin (hoy se agregan preguntas al
catálogo manualmente cuando él pasa material de referencia), exportar reportes
también a nivel de división/equipo agregado, o replicar el respaldo en otro
destino (OneDrive lo evaluó y decidió dejarlo solo en Google Drive). Ver §16
de `DOCUMENTACION.md`.
