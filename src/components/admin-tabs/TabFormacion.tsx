import { AdminContenidos } from '../AdminContenidos'
import { AdminMateriales } from '../AdminMateriales'
import { AdminCiclosCapacitacion } from '../AdminCiclosCapacitacion'

// Pestaña "Formación y Contenido": materiales de aprendizaje (lecciones y
// ejercicios), biblioteca de materiales adjuntables y ciclos de
// re-entrenamiento.
export default function TabFormacion() {
  return (
    <div>
      <AdminContenidos />
      <AdminMateriales />
      <AdminCiclosCapacitacion />
    </div>
  )
}
