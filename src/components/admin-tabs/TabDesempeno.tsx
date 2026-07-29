import { AdminEquipo } from '../AdminEquipo'
import { AdminOtorgarInsignias } from '../AdminOtorgarInsignias'
import { AdminFamiliasInsignias } from '../AdminFamiliasInsignias'

// Pestaña "Desempeño y Reconocimiento": seguimiento del equipo (tendencia y
// contenido difícil, dentro de AdminEquipo), otorgar insignias manuales
// puntuales, y administrar familias de insignias bronce/plata/oro (creación,
// edición, desactivación y carga de progreso que dispara el otorgamiento
// automático de medallas).
export default function TabDesempeno() {
  return (
    <div>
      <AdminEquipo />
      <AdminOtorgarInsignias />
      <AdminFamiliasInsignias />
    </div>
  )
}
