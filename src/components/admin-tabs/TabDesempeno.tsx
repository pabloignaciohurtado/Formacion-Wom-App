import { AdminEquipo } from '../AdminEquipo'
import { AdminOtorgarInsignias } from '../AdminOtorgarInsignias'

// Pestaña "Desempeño y Reconocimiento": seguimiento del equipo (tendencia y
// contenido difícil, dentro de AdminEquipo) + otorgar insignias manuales.
export default function TabDesempeno() {
  return (
    <div>
      <AdminEquipo />
      <AdminOtorgarInsignias />
    </div>
  )
}
