-- Rollback de la migración `rls_scope_authenticated_e_initplan` (10-jul-2026).
--
-- Aquella migración hizo tres cosas, ninguna de las cuales altera quién puede
-- ver qué:
--   1. Acotó al rol `authenticated` once políticas que vivían sobre `public`
--      (que incluye `anon`). No había fuga: sin sesión, auth.uid() es nulo y
--      devolvían cero filas.
--   2. Envolvió `auth.uid()` e `is_admin()` en `(select ...)` para que Postgres
--      los evalúe una vez por consulta y no una vez por fila.
--   3. Partió las políticas `ALL` que se solapaban con las de `SELECT`.
--
-- Este script restaura el estado anterior tal cual. Ejecutar en el SQL Editor
-- de Supabase solo si algo se rompió.

begin;

drop policy if exists actividades_admin  on public.actividades;
drop policy if exists actividades_insert on public.actividades;
drop policy if exists actividades_update on public.actividades;
drop policy if exists actividades_delete on public.actividades;
drop policy if exists actividades_select on public.actividades;
drop policy if exists completadas_delete on public.actividades_completadas;
drop policy if exists completadas_insert on public.actividades_completadas;
drop policy if exists completadas_select on public.actividades_completadas;
drop policy if exists events_insert     on public.activity_events;
drop policy if exists events_select     on public.activity_events;
drop policy if exists attempts_insert   on public.attempts;
drop policy if exists attempts_select   on public.attempts;
drop policy if exists consultas_insert  on public.consultas;
drop policy if exists consultas_select  on public.consultas;
drop policy if exists consultas_update  on public.consultas;
drop policy if exists cortes_select     on public.cortes_semanales;
drop policy if exists goals_select      on public.goals;
drop policy if exists goals_write       on public.goals;
drop policy if exists goals_insert      on public.goals;
drop policy if exists goals_update      on public.goals;
drop policy if exists goals_delete      on public.goals;
drop policy if exists insignias_insert  on public.insignias_usuario;
drop policy if exists insignias_select  on public.insignias_usuario;
drop policy if exists profiles_insert   on public.profiles;
drop policy if exists profiles_select   on public.profiles;
drop policy if exists profiles_update   on public.profiles;
drop policy if exists cards_select      on public.srs_cards;
drop policy if exists cards_write       on public.srs_cards;
drop policy if exists cards_insert      on public.srs_cards;
drop policy if exists cards_update      on public.srs_cards;
drop policy if exists cards_delete      on public.srs_cards;

create policy actividades_admin  on public.actividades to authenticated for all using (is_admin()) with check (is_admin());
create policy actividades_select on public.actividades to authenticated for select using (true);

create policy completadas_delete on public.actividades_completadas to authenticated for delete using ((user_id = auth.uid()) or is_admin());
create policy completadas_insert on public.actividades_completadas to authenticated for insert with check (user_id = auth.uid());
create policy completadas_select on public.actividades_completadas to authenticated for select using ((user_id = auth.uid()) or is_admin());

create policy events_insert on public.activity_events for insert with check ((user_id = auth.uid()) or is_admin());
create policy events_select on public.activity_events for select using ((user_id = auth.uid()) or is_admin());

create policy attempts_insert on public.attempts for insert with check (user_id = auth.uid());
create policy attempts_select on public.attempts for select using ((user_id = auth.uid()) or is_admin());

create policy consultas_insert on public.consultas for insert with check (user_id = auth.uid());
create policy consultas_select on public.consultas for select using ((user_id = auth.uid()) or is_admin());
create policy consultas_update on public.consultas for update using (is_admin()) with check (is_admin());

create policy cortes_select on public.cortes_semanales to authenticated for select using (true);

create policy goals_select on public.goals for select using ((user_id = auth.uid()) or is_admin());
create policy goals_write  on public.goals for all using (is_admin()) with check (is_admin());

create policy insignias_insert on public.insignias_usuario to authenticated for insert with check (user_id = auth.uid());
create policy insignias_select on public.insignias_usuario to authenticated for select using ((user_id = auth.uid()) or is_admin());

create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_select on public.profiles for select using ((id = auth.uid()) or is_admin());
create policy profiles_update on public.profiles for update using ((id = auth.uid()) or is_admin());

create policy cards_select on public.srs_cards for select using ((user_id = auth.uid()) or is_admin());
create policy cards_write  on public.srs_cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Los índices son aditivos y no hace falta revertirlos, pero si se quisiera:
-- drop index if exists public.idx_actividades_creada_por;
-- drop index if exists public.idx_actividades_completadas_user_id;
-- drop index if exists public.idx_goals_asignada_por;
-- drop index if exists public.idx_profiles_alta_por;

commit;
