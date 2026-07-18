import { AdminEquipo } from '../components/AdminEquipo'
import { AdminActividades } from '../components/AdminActividades'
import { AdminCiclosCapacitacion } from '../components/AdminCiclosCapacitacion'
import { AdminMateriales } from '../components/AdminMateriales'

// La pantalla de un supervisor: seguimiento de su equipo, asignación de
// módulos obligatorios y apertura de ciclos de re-entrenamiento. Es el mismo
// cuarteto de componentes que usa el admin en Administración; la RLS y los
// RPC acotan los datos al equipo propio (y los materiales, a lo que el
// propio supervisor subió más lo que ya es público). La ficha individual
// queda fuera: sus consultas son de admin.
export default function Equipo() {
  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">Mi equipo</h1>
      <p className="mt-1 text-tinta-suave">
        Sigue el avance de tu equipo, asígnale módulos obligatorios y abre
        ciclos de re-entrenamiento.
      </p>

      <AdminEquipo conFicha={false} />

      <AdminMateriales />

      <AdminActividades />

      <AdminCiclosCapacitacion />
    </section>
  )
}
