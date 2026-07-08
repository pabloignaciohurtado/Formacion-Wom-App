import { useAuth } from '../auth/useAuth'

export default function Panel() {
  const { user } = useAuth()

  return (
    <section>
      <h2>Panel de formación</h2>
      <p>
        Hola{user?.email ? ` ${user.email}` : ''}. Esta es la base de la app de
        formación WOM: desde aquí crecerán los cursos, módulos y seguimiento de
        avance.
      </p>
    </section>
  )
}
