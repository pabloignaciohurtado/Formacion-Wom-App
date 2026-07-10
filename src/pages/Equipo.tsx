import { AdminEquipo } from '../components/AdminEquipo'
import { AdminActividades } from '../components/AdminActividades'

// La pantalla de un supervisor: seguimiento de su equipo y asignación de
// módulos obligatorios. Es el mismo par de componentes que usa el admin en
// Administración; la RLS y los RPC acotan los datos al equipo propio.
// La ficha individual queda fuera: sus consultas son de admin.
export default function Equipo() {
  return (
    <section>
      <h1 className="text-2xl font-extrabold lg:text-3xl">Mi equipo</h1>
      <p className="mt-1 text-tinta-suave">
        Sigue el avance de tu equipo y asígnale módulos obligatorios.
      </p>

      <AdminEquipo conFicha={false} />

      <AdminActividades />
    </section>
  )
}
