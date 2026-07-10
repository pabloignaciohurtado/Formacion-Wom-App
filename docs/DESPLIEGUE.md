# Despliegue

## Dónde vive la app

**Producción:** https://pabloignaciohurtado.github.io/Formacion-Wom-App/

Se despliega sola en cada push a `main`, vía `.github/workflows/deploy-pages.yml`.
El workflow compila con `--base=/Formacion-Wom-App/` porque Pages sirve la app bajo esa
ruta, y `App.tsx` lee `import.meta.env.BASE_URL` para calcular el `basename` del router.

**Un solo destino, a propósito.** Hubo un segundo despliegue en Vercel. Se retiró.

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

### En GitHub

Settings → Secrets and variables → Actions.

- `deploy-pages.yml` las lee de ahí y **falla ruidosamente si alguna está vacía**.
- `ci.yml` usa valores de relleno: solo verifica que el proyecto compila, y su artefacto
  no se despliega.

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

Vive en `vite.config.ts` y no en el workflow porque un workflow solo protege a su propio
destino. La configuración de Vite protege a todos.

## Historia, y por qué se retiró Vercel

El proyecto `formacion-wom` de Vercel no estuvo conectado a Git: sus despliegues los subía
un agente a mano (`meta.actor: claude-code…`). Eso lo desacoplaba del repositorio —no se
enteraba de los merges— y ocultaba que la app compilaba únicamente gracias a un `.env`
commiteado.

Al intentar conectarlo apareció el problema de fondo: el proyecto estaba enlazado al
repositorio de **otro** proyecto (`pablo-hurtado-landing`). Un push allí habría desplegado
el portfolio sobre el dominio de la app de formación.

Dos destinos de producción para el mismo código son dos verdades sobre dónde vive la app.
Pages ya funcionaba, ya se disparaba desde `main` y ya tenía sus secrets. Vercel se retira.
