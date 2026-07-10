# Despliegue

## Dónde vive la app

**Producción:** https://formacion-wom.vercel.app — se despliega sola en cada push a `main`.

**Previews:** cada pull request recibe su propia URL temporal. Vercel la comenta en el PR.

## Variables de entorno

La app necesita dos, y **sin ellas la compilación falla a propósito**:

| Variable | Qué es |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave publishable (`sb_publishable_…`) |

La clave es pública por diseño: viaja al navegador y la protege RLS. No es un secreto,
pero tampoco vive en el repositorio — `.env` está en `.gitignore`.

### En local

```bash
cp .env.example .env
# rellena los dos valores
```

### En Vercel

Settings → Environment Variables. Ambas en **Production** y **Preview**.
Si falta alguna en Preview, los deploys de cada PR fallarán.

### En GitHub Actions

Settings → Secrets and variables → Actions. El workflow de CI usa valores de relleno
—solo verifica que el proyecto compila, su artefacto no se despliega— pero los secrets
existen por si vuelve a hacer falta un workflow de despliegue.

## La guarda

`vite.config.ts` verifica las variables al compilar:

```
Faltan variables de entorno: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
```

Existe porque el fallo natural es silencioso. Vite compila un bundle perfecto sin las
variables; el error aparece después, en el navegador del usuario, en el `throw` de
`src/lib/supabase.ts`. Un despliegue verde que sirve una app rota es peor que un build
rojo.

La guarda solo actúa en `command === 'build'`. `vite dev` arranca sin variables, lo que
permite trabajar en la interfaz sin tocar Supabase.

## Historia

El proyecto de Vercel no estuvo conectado a Git durante un tiempo: los despliegues los
subía un agente a mano (`meta.actor: claude-code…`). Eso lo desacoplaba del repositorio
—no se enteraba de los merges— y ocultaba que la app compilaba gracias a un `.env`
commiteado. Ambas cosas están corregidas.

También hubo un segundo destino en GitHub Pages, bajo `/Formacion-Wom-App/`, que obligaba
a `App.tsx` a calcular el `basename` del router desde `BASE_URL`. Se retiró: una sola
verdad sobre dónde vive la app.
