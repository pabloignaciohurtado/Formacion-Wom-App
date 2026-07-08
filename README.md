# Formación WOM

Aplicación web de formación interna de WOM. Construida con React 19, TypeScript, Vite y Supabase (autenticación y base de datos).

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Ruteo:** React Router
- **Backend como servicio:** Supabase (auth, Postgres, storage)
- **Lint:** oxlint
- **CI:** GitHub Actions (lint + build en cada PR)

## Configuración

Las variables de entorno viven en `.env` (ver `.env.example`):

```
VITE_SUPABASE_URL=<url del proyecto Supabase>
VITE_SUPABASE_ANON_KEY=<clave publicable (anon) de Supabase>
```

> La clave `anon`/publicable está diseñada para exponerse en el cliente; la seguridad de los datos depende de las políticas RLS de Supabase, no de ocultar esta clave. Nunca pongas aquí la clave `service_role`.

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run lint      # lint con oxlint
npm run build     # typecheck + build de producción
npm run preview   # servir el build localmente
```

## Estructura

```
src/
  lib/supabase.ts           # cliente Supabase tipado (lee las variables VITE_*)
  lib/database.types.ts     # tipos generados desde el esquema real de Supabase
  auth/                     # contexto de sesión + perfil, hook useAuth, ruta protegida
  components/Layout.tsx     # layout con barra superior, nombre/rol y cierre de sesión
  pages/Login.tsx           # inicio de sesión con email y contraseña
  pages/Registro.tsx        # registro de relatores (el trigger crea el perfil inactivo)
  pages/CuentaInactiva.tsx  # pantalla para cuentas aún no activadas por un admin
  pages/Panel.tsx           # panel con resumen real (repasos, intentos, metas, consultas)
  pages/Consultas.tsx       # relator: enviar consultas y ver respuestas
  pages/Admin.tsx           # admin: activar/desactivar relatores y responder consultas
```

## Modelo de datos (Supabase)

El esquema vive en el proyecto Supabase con RLS activo en todas las tablas:

- `profiles` — perfil por usuario (`role`: `relator` | `admin`, `activo` lo habilita un admin; se crea solo vía trigger `handle_new_user`)
- `attempts` — intentos de ejercicios (puntaje, correcto, dominio y objetivo)
- `goals` — metas de maestría por dominio, asignadas por un admin
- `srs_cards` — repaso espaciado tipo Leitner (`caja`, `proximo_repaso`)
- `activity_events` — bitácora de actividad
- `consultas` — preguntas de relatores respondidas por un admin

Cada usuario solo ve/escribe sus propias filas; `is_admin()` habilita la vista global para administradores.

## Flujo de trabajo

Nada se sube directo a `main`: todo cambio va en una rama, se abre un PR en borrador, CI debe quedar verde y luego se hace merge.
