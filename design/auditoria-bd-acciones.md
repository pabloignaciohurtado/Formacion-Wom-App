# Auditoría de integridad y recuperabilidad del log de acciones

Fecha: 2026-07-12 · Proyecto Supabase: `formacion-wom` (`jgtrfrfolcfpvzbsiuka`,
Postgres 17, región us-east-2).

## Veredicto

La base de las acciones de los usuarios está **íntegra y es de solo-anexado
(inmutable)**: hoy se puede recuperar el 100% de los registros. El único punto
a cubrir era la ausencia de una copia fuera de la base ante un borrado en
cascada o pérdida del proyecto; se resolvió con un **respaldo automático
semanal** (ver §6).

## 1. Qué es el "log de acciones"

Cada acción de un relator queda en `attempts` (una fila por respuesta a un
ejercicio) — es la fuente de verdad del XP y de toda la analítica.
`activity_events` complementa con una bitácora de sesión (login/logout/acceso
denegado/consulta). `srs_cards` es **estado derivado** de repaso, no un
registro de acción.

## 2. Inventario y volúmenes (al 2026-07-12)

| Tabla | Filas | Naturaleza |
|---|---|---|
| `attempts` | 181 | Registro de acción (inmutable) |
| `activity_events` | 205 | Bitácora de sesión (inmutable) |
| `srs_cards` | 142 | Estado de repaso (mutable, derivado) |
| `profiles` / `auth.users` | 8 / 8 | Usuarios (1:1) |
| `insignias_usuario` | 1 | Inmutable |
| `consultas` | 1 | Inmutable salvo respuesta del admin |
| `goals` | 1 | Gestionada por admin |
| `actividades` | 1 | — |
| `actividades_completadas` / `actividades_destinatarios` | 0 / 0 | — |
| `cortes_semanales` | 1 | Idempotencia de ligas |

`attempts`: 5 usuarios con actividad, rango 2026-06-15 → 2026-07-10.

## 3. Integridad verificada (sin hallazgos)

- **Sin nulos** en columnas clave de `attempts` (`user_id`, `exercise_id`,
  `domain_id`, `objetivo_id`, `correcto`, `puntaje`, `fecha`).
- **Sin IDs duplicados** y **sin fechas futuras**.
- **Sin huérfanos**: ningún `attempts`/`srs_cards`/`activity_events`/`insignias`
  apunta a un usuario inexistente; los 8 perfiles calzan 1:1 con `auth.users`.
- **`confianza`** está 100% en null: no hubo intentos desde que se activó el
  aprendizaje basado en confianza (11-jul). Es dato de adopción, no de
  integridad.

## 4. Inmutabilidad (RLS = auditoría a prueba de borrado)

Las tablas de registro **no tienen política de `DELETE` ni de `UPDATE`** en
RLS, así que ni un usuario ni el admin pueden borrar o alterar un registro de
acción desde la API (solo `INSERT` y `SELECT`):

| Tabla | INSERT | SELECT | UPDATE | DELETE |
|---|---|---|---|---|
| `attempts` | propio | propio o admin | — | — |
| `activity_events` | propio o admin | propio o admin | — | — |
| `insignias_usuario` | propio | propio o admin | — | — |
| `consultas` | propio | propio o admin | solo admin | — |
| `srs_cards` | propio | propio o admin | propio | propio |
| `goals` | solo admin | propio o admin | solo admin | solo admin |

Los `GRANT` de tabla del rol `authenticated` son los de fábrica de Supabase
(incluyen DELETE/UPDATE/TRUNCATE), pero **RLS es la reja efectiva**: sin
política, esas operaciones se deniegan. TRUNCATE no se expone por PostgREST.
El admin lee todo (`is_admin()`), lo que permite exportar el historial
completo (reportes de equipo y ficha en PDF/Excel/CSV).

## 5. Riesgo cubierto: borrado en cascada + sin backups automáticos

Todas las FK de acciones son `ON DELETE CASCADE` hacia el usuario:
`auth.users → profiles → attempts / activity_events / insignias / consultas /
goals`. En la operación normal **no pasa nada**, porque la app nunca borra
usuarios: los da de baja con `activo = false` (`baja_fecha`). Pero un borrado
manual del usuario (panel de Supabase → Authentication, o limpieza de usuarios
de prueba) **elimina en cascada su historial**, de forma permanente. Y el plan
actual no tiene backups automáticos ni point-in-time recovery, así que un
borrado o accidente no se podría restaurar desde la base.

Sin procesos destructivos: el único trigger relevante crea el perfil al
registrarse; el único cron (`corte-semanal-ligas`, 05:05 diario) solo procesa
ligas. Nada borra acciones automáticamente.

## 6. Respaldo implementado (copia inmutable fuera de la base)

Se dejó una **tarea programada semanal** (lunes 09:00 UTC ≈ 05:00 Chile) que
exporta todas las tablas de acciones a un `.zip` (CSV por tabla + un
`respaldo-completo.json` + `MANIFIESTO.txt` con conteos y rango de fechas) y lo
entrega por chat y correo. Es una copia inmutable, fuera de Supabase.

Para correrlo a demanda: pedir "genera el respaldo del log de acciones ahora".
El primer respaldo (2026-07-12, 541 filas) ya se entregó.

## 7. Recomendaciones (decisión de negocio)

- **Guardar cada `.zip` de respaldo** en un almacenamiento durable propio
  (Drive/OneDrive/repositorio). El respaldo automático produce la copia; el
  archivarla es responsabilidad del negocio.
- **Opcional — plan Pro de Supabase**: habilita backups diarios + PITR, la red
  de seguridad nativa. Con eso el respaldo semanal pasa a ser redundancia.
- **No** se recomienda cambiar el `ON DELETE CASCADE` a `RESTRICT`: rompería la
  eliminación legítima de usuarios de prueba. La disciplina de baja lógica
  (`activo = false`) + el respaldo cubren el caso.
- Pendiente de sesiones anteriores: activar en Supabase → Auth → Passwords la
  protección de contraseñas filtradas (HaveIBeenPwned).

## 8. Consultas útiles de recuperación

```sql
-- Todo el historial de un relator (acciones)
select * from public.attempts where user_id = '<uuid>' order by fecha;

-- Reconstruir volumen y precisión por semana
select date_trunc('week', fecha) as semana,
       count(*) as intentos,
       round(100.0 * count(*) filter (where correcto) / count(*), 1) as precision_pct
from public.attempts group by 1 order by 1;

-- Verificación rápida de integridad (debe dar todo 0)
select
  (select count(*) from public.attempts where user_id is null or fecha is null) as nulos_criticos,
  (select count(*) from public.attempts a
     left join public.profiles p on p.id = a.user_id where p.id is null) as huerfanos;
```
