import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { Boton, Tarjeta } from '../components/ui'

export default function CuentaInactiva() {
  const { user, signOut } = useAuth()

  return (
    <AuthLayout>
      <Tarjeta className="p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-wom-50 text-3xl">
          ⏳
        </div>
        <h1 className="text-2xl font-extrabold">Cuenta pendiente</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Tu cuenta <strong>{user?.email}</strong> fue creada, pero todavía no
          está activada. Un administrador debe habilitarla antes de que puedas
          entrar a la plataforma.
        </p>
        <p className="mt-2 text-sm text-tinta-suave">
          Si crees que es un error, contacta a tu coordinador de formación.
        </p>
        <Boton
          type="button"
          variante="secundario"
          className="mt-6"
          onClick={() => void signOut()}
        >
          Cerrar sesión
        </Boton>
      </Tarjeta>
    </AuthLayout>
  )
}
