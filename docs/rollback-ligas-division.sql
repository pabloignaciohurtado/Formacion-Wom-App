-- Rollback de la migración `ligas_por_division_y_autocompetencia` (11-jul-2026).
--
-- Aquella migración solo AÑADIÓ dos funciones de lectura (no tocó políticas,
-- tablas ni la fórmula de puntaje ni el corte semanal):
--   - ranking_division()      → ranking del que llama dentro de su propio tier.
--   - mi_progreso_semanal()   → su semana actual vs. su propia semana anterior.
--
-- Revertir solo las elimina. El Panel volvería a necesitar ranking_semanal()
-- (que nunca se borró), así que la app antigua sigue funcionando. Ejecutar en
-- el SQL Editor de Supabase solo si algo se rompió.

begin;

drop function if exists public.ranking_division();
drop function if exists public.mi_progreso_semanal();

commit;
