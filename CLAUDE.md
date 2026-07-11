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
- **Estado al 2026-07-09:** 20 PRs merged, funcionalidad completa en
  producción (ver §16 de `DOCUMENTACION.md` para el detalle). No hay
  trabajo a medias ni ramas colgando.

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
  reinstalar antes de asumir otra cosa.

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
  para el 20-jul-2026. Contexto: `docs/revision-ux-benchmark.md` §7 y §11.

## Ideas de continuidad no comprometidas

Si Pablo pide seguir: push notifications reales, generación de preguntas
asistida por IA desde el panel admin (hoy se agregan preguntas al catálogo
manualmente cuando él pasa material de referencia), exportar reportes de
equipo a PDF/Excel. Ver §16 de `DOCUMENTACION.md`.
