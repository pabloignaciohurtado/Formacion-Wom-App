import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// La clave de la API vive SOLO aquí, como secreto del proyecto Supabase.
// Nunca se expone al navegador: el panel llama a esta función con el JWT del
// usuario y es la función la que habla con Anthropic.
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODELO = Deno.env.get("MODELO_IA") ?? "claude-sonnet-5";

const ROLES_AUTORIZADOS = new Set(["supervisor", "admin"]);

// Límites defensivos: el material de referencia lo pega una persona y podría
// ser un manual entero. Cortarlo aquí evita una cuenta desagradable y una
// respuesta que tardaría minutos.
const MAXIMO_CARACTERES_MATERIAL = 24000;
const MINIMO_PREGUNTAS = 1;
const MAXIMO_PREGUNTAS = 12;
const MAXIMO_OPCIONES = 5;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// El esquema de la propuesta. Se declara como "herramienta" y se fuerza su
// uso, que es la forma fiable de recibir JSON válido: el modelo no puede
// contestar con prosa ni envolver el objeto en ```json.
const ESQUEMA_PROPUESTA = {
  type: "object",
  properties: {
    titulo: {
      type: "string",
      description: "Título corto del material, sin comillas ni punto final.",
    },
    descripcion: {
      type: "string",
      description: "Una frase que resuma qué aprenderá el relator.",
    },
    icono: {
      type: "string",
      description: "Un único emoji que represente el tema.",
    },
    objetivos: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string" },
      description:
        "Objetivos de aprendizaje observables, redactados con un verbo en infinitivo.",
    },
    leccion: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        cuerpo: {
          type: "string",
          description:
            "La lectura completa en Markdown simple: ##, ###, **negrita**, *cursiva*, listas con -, listas numeradas, > cita, [enlace](url), --- separador.",
        },
      },
      required: ["titulo", "cuerpo"],
    },
    preguntas: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          enunciado: { type: "string" },
          opciones: {
            type: "array",
            minItems: 2,
            maxItems: MAXIMO_OPCIONES,
            items: { type: "string" },
          },
          correcta: {
            type: "integer",
            description: "Índice (base 0) de la alternativa correcta.",
          },
          explicacion: {
            type: "string",
            description:
              "Por qué esa alternativa es la correcta, en una o dos frases.",
          },
          objetivo: {
            type: "integer",
            description:
              "Índice (base 0) del objetivo de la lista `objetivos` al que responde esta pregunta.",
          },
        },
        required: [
          "enunciado",
          "opciones",
          "correcta",
          "explicacion",
          "objetivo",
        ],
      },
    },
  },
  required: ["titulo", "descripcion", "objetivos", "leccion", "preguntas"],
};

const INSTRUCCIONES = `Eres un diseñador instruccional de una empresa de telecomunicaciones chilena. Preparas material de formación para relatores de atención al cliente.

Reglas de redacción:
- Español de Chile, trato de "tú", tono directo y profesional, sin relleno ni frases motivacionales.
- La lección debe ser autosuficiente: quien la lea tiene que poder responder las preguntas sin consultar otra fuente.
- Usa solo Markdown simple: ## y ### para subtítulos, **negrita**, *cursiva*, listas con "-", listas numeradas, "> " para una regla que no se puede olvidar, "---" para separar bloques y [texto](url) para enlaces.
- No inventes cifras, plazos, precios ni nombres de planes: usa únicamente los que aparezcan en el material de referencia. Si un dato falta, escribe explícitamente que hay que verificarlo en el sistema en vez de suponerlo.
- Las preguntas deben evaluar criterio y decisión frente a un cliente, no memoria literal del texto. Las alternativas incorrectas tienen que ser errores plausibles que de verdad comete alguien en la operación.
- Cada pregunta apunta a un objetivo de la lista, y todo objetivo debe tener al menos una pregunta.
- La explicación dice por qué la correcta es correcta y, cuando ayude, qué consecuencia tiene equivocarse.`;

interface CuerpoPeticion {
  material?: string;
  cantidadPreguntas?: number;
  foco?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse(
      {
        error:
          "Falta configurar la clave de la IA. En Supabase → Edge Functions → Secrets agrega ANTHROPIC_API_KEY.",
      },
      503,
    );
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

  // Mismo criterio que la RLS de `contenido_dominios`: quien no puede publicar
  // un material tampoco puede gastar cuota de IA generándolo.
  const { data: perfil, error: errorPerfil } = await clienteLlamante
    .from("profiles")
    .select("role")
    .eq("id", datosUsuario.user.id)
    .maybeSingle();
  if (errorPerfil || !ROLES_AUTORIZADOS.has(perfil?.role ?? "")) {
    return jsonResponse(
      { error: "Solo un supervisor o administrador puede generar borradores" },
      403,
    );
  }

  let cuerpo: CuerpoPeticion;
  try {
    cuerpo = await req.json();
  } catch {
    return jsonResponse({ error: "Cuerpo de la solicitud inválido" }, 400);
  }

  const material = (cuerpo.material ?? "").trim();
  if (material.length < 40) {
    return jsonResponse(
      {
        error:
          "Pega al menos un párrafo de material de referencia para que la propuesta tenga de dónde salir.",
      },
      400,
    );
  }
  const materialRecortado = material.slice(0, MAXIMO_CARACTERES_MATERIAL);

  const cantidad = Math.min(
    MAXIMO_PREGUNTAS,
    Math.max(MINIMO_PREGUNTAS, Math.round(cuerpo.cantidadPreguntas ?? 5)),
  );
  const foco = (cuerpo.foco ?? "").trim().slice(0, 500);

  const peticion = [
    `Prepara un material de formación con ${cantidad} ${
      cantidad === 1 ? "pregunta" : "preguntas"
    } de práctica a partir del siguiente material de referencia.`,
    foco ? `\nEnfócalo en: ${foco}` : "",
    `\n\n<material_de_referencia>\n${materialRecortado}\n</material_de_referencia>`,
    material.length > MAXIMO_CARACTERES_MATERIAL
      ? "\n\n(El material venía recortado por longitud: trabaja solo con lo anterior.)"
      : "",
  ].join("");

  let respuesta: Response;
  try {
    respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 8000,
        system: INSTRUCCIONES,
        tools: [
          {
            name: "proponer_material",
            description:
              "Entrega la propuesta completa de material de formación.",
            input_schema: ESQUEMA_PROPUESTA,
          },
        ],
        tool_choice: { type: "tool", name: "proponer_material" },
        messages: [{ role: "user", content: peticion }],
      }),
    });
  } catch {
    return jsonResponse(
      { error: "No se pudo contactar al servicio de IA. Reintenta en un momento." },
      502,
    );
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    console.error("Error de la API de IA", respuesta.status, detalle);
    // El detalle puede traer información del proveedor: al cliente solo le
    // llega un mensaje accionable, nunca la respuesta cruda.
    const mensaje = respuesta.status === 401 || respuesta.status === 403
      ? "La clave de la IA fue rechazada. Revisa ANTHROPIC_API_KEY en Supabase."
      : respuesta.status === 429
      ? "El servicio de IA está saturado o sin cuota. Reintenta en unos minutos."
      : "El servicio de IA devolvió un error. Reintenta en un momento.";
    return jsonResponse({ error: mensaje }, 502);
  }

  const datos = await respuesta.json();
  const bloque = (datos?.content ?? []).find(
    (b: { type?: string }) => b?.type === "tool_use",
  );
  if (!bloque?.input) {
    console.error("Respuesta de IA sin bloque tool_use", JSON.stringify(datos));
    return jsonResponse(
      { error: "La IA no devolvió una propuesta utilizable. Reintenta." },
      502,
    );
  }

  return jsonResponse({ propuesta: bloque.input, modelo: MODELO });
});
