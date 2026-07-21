import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ROLES_VALIDOS = new Set(["ejecutivo", "supervisor", "admin"]);

function generarPassword(): string {
  const alfabeto =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Da de alta un usuario desde el panel de Admin, sin exponer nunca la clave
// service_role al cliente. Dos capas de guardia: verify_jwt=true a nivel de
// gateway (rechaza sin JWT válido) y, aquí dentro, se verifica que el JWT
// forwardeado sea efectivamente de un admin antes de usar service_role.
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Falta autenticación" }, 401);
  }

  const clienteLlamante = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: datosUsuario, error: errorUsuario } = await clienteLlamante.auth
    .getUser();
  if (errorUsuario || !datosUsuario.user) {
    return jsonResponse({ error: "Sesión inválida" }, 401);
  }

  const { data: perfilLlamante, error: errorPerfil } = await clienteLlamante
    .from("profiles")
    .select("role")
    .eq("id", datosUsuario.user.id)
    .maybeSingle();
  if (errorPerfil || perfilLlamante?.role !== "admin") {
    return jsonResponse(
      { error: "Solo un administrador puede crear usuarios" },
      403,
    );
  }

  let cuerpo: {
    nombre?: string;
    email?: string;
    password?: string;
    role?: string;
    supervisor_id?: string | null;
  };
  try {
    cuerpo = await req.json();
  } catch {
    return jsonResponse({ error: "Cuerpo de la solicitud inválido" }, 400);
  }

  const nombre = (cuerpo.nombre ?? "").trim();
  const email = (cuerpo.email ?? "").trim().toLowerCase();
  const role = ROLES_VALIDOS.has(cuerpo.role ?? "")
    ? (cuerpo.role as string)
    : "ejecutivo";
  const supervisorId = cuerpo.supervisor_id || null;
  const passwordProvista = (cuerpo.password ?? "").trim();

  if (!nombre || !email) {
    return jsonResponse({ error: "Nombre y correo son obligatorios" }, 400);
  }
  if (passwordProvista && passwordProvista.length < 8) {
    return jsonResponse(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      400,
    );
  }

  const password = passwordProvista || generarPassword();
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: creado, error: errorCrear } = await admin.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
  if (errorCrear || !creado.user) {
    const mensaje = errorCrear?.message?.includes("already been registered")
      ? "Ya existe una cuenta con ese correo"
      : errorCrear?.message ?? "No se pudo crear el usuario";
    return jsonResponse({ error: mensaje }, 400);
  }

  const { error: errorUpdate } = await admin
    .from("profiles")
    .update({
      role,
      activo: true,
      alta_por: datosUsuario.user.id,
      alta_fecha: new Date().toISOString(),
      supervisor_id: supervisorId,
    })
    .eq("id", creado.user.id);

  if (errorUpdate) {
    return jsonResponse({ error: errorUpdate.message }, 500);
  }

  return jsonResponse({ id: creado.user.id, email, password });
});
