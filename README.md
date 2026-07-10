# Formación WOM

Plataforma de formación interna para relatores de WOM: ejercicios con repaso
espaciado, gamificación, actividades obligatorias y panel de administración.

**Producción:** https://pabloignaciohurtado.github.io/Formacion-Wom-App/

## Dónde está cada cosa

| Documento | Para qué |
|---|---|
| Este README | Arrancar en cinco minutos |
| [`DOCUMENTACION.md`](./DOCUMENTACION.md) | Arquitectura, modelo de datos, módulos, sistema de diseño |
| [`docs/DESPLIEGUE.md`](./docs/DESPLIEGUE.md) | Dónde vive la app, variables de entorno, la guarda de build |
| [`CLAUDE.md`](./CLAUDE.md) | Memoria operativa para sesiones de Claude Code |

## Stack

- **Frontend:** React 19 + TypeScript + Vite, PWA con cola offline
- **Ruteo:** React Router
- **Estilos y movimiento:** Tailwind v4 + `motion`
- **Backend como servicio:** Supabase (auth, Postgres con RLS, funciones RPC)
- **Lint:** oxlint
- **CI:** GitHub Actions (lint + build en cada PR)
- **Despliegue:** GitHub Pages en cada push a `main`

No hay backend propio. El frontend habla directo con Supabase; toda la seguridad
de acceso vive en políticas RLS y funciones `SECURITY DEFINER`, nunca en el cliente.

## Empezar

```bash
npm install
cp .env.example .env    # y rellena los dos valores
npm run dev
```

`.env` está en `.gitignore` y no se versiona. `npm run build` **falla a propósito**
si falta alguna variable; `npm run dev` arranca igual, para poder trabajar en la
interfaz sin tocar Supabase. El porqué está en [`docs/DESPLIEGUE.md`](./docs/DESPLIEGUE.md).

```bash
npm run lint       # oxlint
npm run build      # tsc -b && vite build
npm run preview    # sirve dist/ localmente
```

> La clave `anon` / publicable está diseñada para exponerse en el navegador: la
> seguridad depende de las políticas RLS, no de ocultarla. Nunca pongas la clave
> `service_role` en el frontend.

## Estructura

```
src/
  auth/                     # sesión + perfil, useAuth, rutas protegida y de admin
  components/
    ui.tsx                  # Boton, Campo, Tarjeta, MensajeError, MensajeAviso, Esqueleto
    estilosBoton.ts         # clasesBoton(): un solo origen para el estilo del botón
    Layout.tsx              # barra superior, navegación, tema claro/oscuro
    EstadoConexion.tsx      # chip de "sin conexión / sincronizando"
    InsigniaModal.tsx       # celebración de insignias y cambios de liga
    ContadorAnimado.tsx     # número que cuenta hacia arriba
    AdminEquipo.tsx         # seguimiento del equipo y contenido difícil
    AdminActividades.tsx    # gestión de actividades obligatorias
  pages/
    Login / Registro / Recuperar / Restablecer / CuentaInactiva
    Panel.tsx               # nivel, racha, XP, ranking, héroes, insignias
    Ejercicios.tsx          # categorías → dominios → practicar
    Practica.tsx            # sesión con SRS, XP y celebración
    Actividades.tsx         # actividades obligatorias del relator
    Consultas.tsx           # enviar y ver consultas
    Admin.tsx               # relatores, equipo, actividades, consultas
    FichaRelator.tsx        # ficha individual con gráfico y metas
  lib/
    supabase.ts             # cliente tipado (lee las VITE_*)
    database.types.ts       # tipos generados del esquema real
    srs.ts                  # Leitner: cajas, intervalos, maestría
    gamificacion.ts         # XP, niveles, ligas
    insignias.ts            # catálogo y otorgamiento
    colaOffline.ts          # cola de intentos sin conexión
    motion.ts               # easings y stagger del sistema de movimiento
    certificado.ts          # certificado descargable de dominio
  data/contenido.ts         # catálogo editable de dominios, objetivos y ejercicios
```

## Ejercicios y repaso espaciado

El contenido (dominios → objetivos → ejercicios de alternativas) vive en
`src/data/contenido.ts`; los ids son estables y se referencian desde `attempts` y
`srs_cards`. Cada respuesta registra un intento y actualiza la tarjeta SRS con el
método Leitner: acertar sube de caja (intervalos de 1, 2, 4, 8 y 16 días), fallar
devuelve a la caja 1. La maestría del dominio es el avance promedio de caja de sus
ejercicios.

Sin conexión, el intento se guarda en `localStorage` y se sincroniza al volver la
red. La interfaz lo dice: hay un chip en la cabecera y un aviso en la tarjeta.

## Modelo de datos (Supabase)

RLS activo en las diez tablas, todas con políticas acotadas al rol `authenticated`:

- `profiles` — perfil por usuario (`role`, `activo`, `liga`); lo crea el trigger `handle_new_user`
- `attempts` — intentos de ejercicios
- `srs_cards` — repaso espaciado Leitner (`caja`, `proximo_repaso`)
- `goals` — metas de maestría por dominio, asignadas por un admin
- `actividades` / `actividades_completadas` — tareas obligatorias
- `insignias_usuario` — insignias otorgadas
- `consultas` — preguntas de relatores respondidas por un admin
- `cortes_semanales` — cierre semanal de ligas (lo escribe `asegurar_corte_semanal()`)
- `activity_events` — **heredada de un prototipo anterior a este repositorio.** Ningún código actual la lee ni la escribe; se conserva por su valor histórico

Cada usuario solo ve y escribe sus propias filas; `is_admin()` habilita la vista
global. Las funciones RPC no son invocables sin sesión.

## Flujo de trabajo

Nada se sube directo a `main`: todo cambio va en una rama descriptiva, se abre un
PR en borrador, el CI debe quedar verde, y luego se mergea.
