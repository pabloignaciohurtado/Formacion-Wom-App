-- Rollback de la migración `intentos_con_confianza`.
-- Quita la columna de autoevaluación de seguridad de los intentos.
-- Seguro de correr: es aditiva y nullable; ningún dato existente depende de ella.
-- Ojo: el frontend que envía `confianza` debe revertirse antes o a la vez,
-- si no los inserts con esa columna fallarán.

alter table public.attempts
  drop column if exists confianza;
