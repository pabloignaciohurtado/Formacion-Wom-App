-- Rollback de la migración `analitica_jefaturas_nivel2`.
-- Restaura resumen_equipo y precision_por_dominio a su versión sin rango
-- (0 argumentos) y elimina tendencia_equipo.
-- Ojo: el frontend de Nivel 2 llama a estas funciones con `desde` y usa
-- tendencia_equipo; revertir el frontend antes o a la vez, o esas llamadas
-- fallarán.

drop function if exists public.resumen_equipo(timestamptz, timestamptz);
drop function if exists public.precision_por_dominio(timestamptz, timestamptz);
drop function if exists public.tendencia_equipo(int);

create function public.resumen_equipo()
returns table(
  user_id uuid, nombre text, liga text, xp integer,
  intentos integer, correctas integer,
  ultima_actividad timestamptz, obligatorias_pendientes integer
)
language sql stable security definer set search_path to 'public'
as $$
  with visibles as (
    select p.id, p.nombre, p.liga
    from profiles p
    where p.activo and (is_admin() or p.supervisor_id = auth.uid())
  ),
  tot as (
    select a.user_id,
           sum(case when a.correcto then 25 else 5 end)::int as xp,
           count(*)::int as intentos,
           count(*) filter (where a.correcto)::int as correctas,
           max(a.fecha) as ultima
    from attempts a
    where a.user_id in (select id from visibles)
    group by a.user_id
  ),
  oblig as (
    select v.id as uid,
           count(act.id) filter (
             where not exists (
               select 1 from actividades_completadas c
               where c.actividad_id = act.id and c.user_id = v.id
             )
           )::int as pendientes
    from visibles v
    join actividades act
      on act.activa
     and (act.alcance = 'todos'
          or exists (
            select 1 from actividades_destinatarios d
            where d.actividad_id = act.id and d.user_id = v.id
          ))
    group by v.id
  )
  select v.id, v.nombre, v.liga,
         coalesce(t.xp, 0), coalesce(t.intentos, 0), coalesce(t.correctas, 0),
         t.ultima, coalesce(o.pendientes, 0)
  from visibles v
  left join tot t on t.user_id = v.id
  left join oblig o on o.uid = v.id
  order by coalesce(t.xp, 0) desc;
$$;

create function public.precision_por_dominio()
returns table(domain_id text, intentos integer, correctas integer, precision_pct integer)
language sql stable security definer set search_path to 'public'
as $$
  select a.domain_id,
         count(*)::int,
         count(*) filter (where a.correcto)::int,
         round(100.0 * count(*) filter (where a.correcto) / count(*))::int
  from attempts a
  where is_admin()
     or exists (
       select 1 from profiles p
       where p.id = a.user_id and p.supervisor_id = auth.uid()
     )
  group by a.domain_id
  having count(*) >= 5
  order by 4 asc;
$$;
