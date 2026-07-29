import { Tarjeta } from '../components/ui'

// Se muestra cuando un admin restringió, a mano, el acceso de este usuario a
// la sección que intenta abrir (ver `perfil_funcionalidades`). No es un error
// de la app: es una restricción deliberada, así que el mensaje explica a
// quién pedirle el acceso en vez de sugerir que algo falló.
export default function SinAccesoFuncionalidad() {
  return (
    <section className="flex justify-center py-10">
      <Tarjeta className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-wom-50 text-3xl">
          🔒
        </div>
        <h1 className="text-xl font-extrabold">Sin acceso a esta sección</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Tu supervisor o el equipo de calidad no habilitó esta funcionalidad
          para tu usuario todavía. Si crees que es un error, contacta a tu
          supervisor.
        </p>
      </Tarjeta>
    </section>
  )
}
