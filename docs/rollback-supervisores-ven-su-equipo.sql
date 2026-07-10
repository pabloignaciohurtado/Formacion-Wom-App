-- Rollback de las migraciones `supervisores_ven_su_equipo` y
-- `destinatarios_sin_recursion` (10-jul-2026).
--
-- Aquellas migraciones hicieron dos cosas:
--   1. Dar visibilidad al supervisor sobre su equipo: perfiles, completadas,
--      resumen_equipo() y precision_por_dominio() acotados a su gente.
--   2. Romper la recursión infinita (42P17) entre las políticas de
--      actividades y actividades_destinatarios usando funciones
--      SECURITY DEFINER (es_destinatario, es_creador_de_actividad,
--      es_de_mi_equipo).
--
-- OJO: este script restaura el estado anterior TAL CUAL, y ese estado
-- incluía el bug de recursión — toda lectura de actividades por un usuario
-- autenticado fallaba. Ejecutar en el SQL Editor de Supabase solo si algo
-- se rompió y se necesita volver al punto de partida exacto.

begin;

-- ── Políticas ──────────────────────────────────────────────────────────────────────

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using ((id = (select auth.uid())) or (select is_admin()));

drop policy if exists completadas_select on public.actividades_completadas;
create policy completadas_select on public.actividades_completadas
  for select to authenticated
  using ((user_id = (select auth.uid())) or (select is_admin()));

drop policy if exists actividades_select on public.actividades;
create policy actividades_select on public.actividades
  for select to authenticated
  using (
    alcance = 'todos'
    or creada_por = (select auth.uid())
    or (select is_admin())
    or exists (
      select 1 from actividades_destinatarios d
      where d.actividad_id = actividades.id and d.user_id = (select auth.uid())
    )
  );

drop policy if exists destinatarios_select on public.actividades_destinatarios;
create policy destinatarios_select on public.actividades_destinatarios
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select is_admin())
    or exists (
      select 1 from actividades a
      where a.id = actividades_destinatarios.actividad_id
        and a.creada_por = (select auth.uid())
    )
  );

drop policy if exists destinatarios_insert on public.actividades_destinatarios;
create policy destinatarios_insert on public.actividades_destinatarios
  for insert to authenticated
  with check (
    (select is_admin())
    or (
      exists (
        select 1 from actividades a
        where a.id = actividades_destinatarios.actividad_id
          and a.creada_por = (select auth.uid())
      )
      and exists (
        select 1 from profiles p
        where p.id = actividades_destinatarios.user_id
          and p.supervisor_id = (select auth.uid())
      )
    )
  );

drop policy if exists destinatarios_delete on public.actividades_destinatarios;
create policy destinatarios_delete on public.actividades_destinatarios
  for delete to authenticated
  using (
    (select is_admin())
    or exists (
      select 1 from actividades a
      where a.id = actividades_destinatarios.actividad_id
        and a.creada_por = (select auth.uid())
    )
  );

-- ── Funciones ──────────────────────────────────────────────────────────────────

drop function if exists public.es_destinatario(uuid);
drop function if exists public.es_creador_de_actividad(uuid);
drop function if exists public.es_de_mi_equipo(uuid);

create or replace function public.resumen_equipo()
returns table(
  user_id uuid, nombre text, liga text, xp integer, intentos integer,
  correctas integer, ultima_actividad timestamptz, obligatorias_pendientes integer
)
language sql stable security definer set search_path to 'public'
as $$
  with tot as (
    select a.user_id,
           sum(case when a.correcto then 25 else 5 end)::int as xp,
           count(*)::int as intentos,
           count(*) filter (where a.correcto)::int as correctas,
           max(a.fecha) as ultima
    from attempts a
    group by a.user_id
  ),
  oblig as (
    select p.id as uid,
           count(act.id) filter (
             where not exists (
               select 1 from actividades_completadas c
               where c.actividad_id = act.id and c.user_id = p.id
             )
           )::int as pendientes
    from profiles p
    cross join actividades act
    where act.activa
    group by p.id
  )
  select p.id, p.nombre, p.liga,
         coalesce(t.xp, 0), coalesce(t.intentos, 0), coalesce(t.correctas, 0),
         t.ultima, coalesce(o.pendientes, 0)
  from profiles p
  left join tot t on t.user_id = p.id
  left join oblig o on o.uid = p.id
  where p.activo and is_admin()
  order by coalesce(t.xp, 0) desc;
$$;

create or replace function public.precision_por_dominio()
returns table(domain_id text, intentos integer, correctas integer, precision_pct integer)
language sql stable security definer set search_path to 'public'
as $$
  select a.domain_id,
         count(*)::int,
         count(*) filter (where a.correcto)::int,
         round(100.0 * count(*) filter (where a.correcto) / count(*))::int
  from attempts a
  where is_admin()
  group by a.domain_id
  having count(*) >= 5
  order by 4 asc;
$$;

commit;
