import { useAuth } from '../auth/useAuth'

export default function CuentaInactiva() {
  const { user, signOut } = useAuth()

  return (
    <main className="pantalla-login">
      <div className="tarjeta-login">
        <h1>Formación WOM</h1>
        <p>
          Tu cuenta <strong>{user?.email}</strong> fue creada, pero todavía no
          está activada. Un administrador debe habilitarla antes de que puedas
          entrar a la plataforma.
        </p>
        <p className="subtitulo">
          Si crees que es un error, contacta a tu coordinador de formación.
        </p>
        <button type="button" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
