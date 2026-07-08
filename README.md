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
  lib/supabase.ts        # cliente Supabase (lee las variables VITE_*)
  auth/                  # contexto de sesión, hook useAuth, ruta protegida
  components/Layout.tsx  # layout con barra superior y cierre de sesión
  pages/Login.tsx        # inicio de sesión con email y contraseña
  pages/Panel.tsx        # panel inicial (punto de partida de los cursos)
```

## Flujo de trabajo

Nada se sube directo a `main`: todo cambio va en una rama, se abre un PR en borrador, CI debe quedar verde y luego se hace merge.
