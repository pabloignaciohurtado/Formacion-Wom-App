import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Mismo secreto y mismo criterio que las otras dos vías de generación: la
// clave vive solo aquí, nunca se expone al navegador.
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODELO = Deno.env.get("MODELO_IA") ?? "claude-sonnet-5";

const ROLES_AUTORIZADOS = new Set(["supervisor", "admin"]);

const MAXIMO_CARACTERES_LOTE = 60000;
const MINIMO_CARACTERES_LOTE = 200;
const MAXIMO_LLAMADAS = 40;
const MAXIMO_DOMINIOS = 60;
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

// El esquema tiene dos mitades. `diagnostico` es lo nuevo: qué falló en las
// llamadas y qué dominio conviene reforzar. El resto es EXACTAMENTE la misma
// forma que devuelven `generar-borrador-material` y
// `generar-ejercicios-desde-link`, para que el cliente reutilice
// `materialDesdePropuesta` sin adaptarla.
const ESQUEMA = {
  type: "object",
  properties: {
    diagnostico: {
      type: "object",
      properties: {
        resumen: {
          type: "string",
          description:
            "Dos o tres frases: qué está fallando de forma transversal en este lote de llamadas.",
        },
        patrones: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              titulo: {
                type: "string",
                description:
                  "Nombre corto del error, en términos de conducta observable.",
              },
              descripcion: {
                type: "string",
                description: "En qué consiste el error y cuándo aparece.",
              },
              llamadas: {
                type: "integer",
                description:
                  "En cuántas de las llamadas entregadas aparece este patrón.",
              },
              gravedad: {
                type: "string",
                enum: ["alta", "media", "baja"],
                description:
                  "alta = daña al cliente o incumple una norma; media = deteriora la experiencia; baja = mejorable.",
              },
              ejemplo: {
                type: "string",
                description:
                  "Frase textual del ejecutivo que ilustra el patrón, SIN datos personales del cliente.",
              },
              impacto: {
                type: "string",
                description:
                  "Qué le cuesta a la operación o al cliente que esto ocurra (rellamado, escalamiento, fuga, reclamo).",
              },
            },
            required: [
              "titulo",
              "descripcion",
              "llamadas",
              "gravedad",
              "ejemplo",
              "impacto",
            ],
          },
        },
        dominioSugerido: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description:
                "Id EXACTO de un dominio de la lista entregada si alguno cubre estos errores. Cadena vacía si ninguno calza y conviene un dominio nuevo.",
            },
            titulo: {
              type: "string",
              description:
                "Título del dominio a reforzar (el existente, o el nuevo que propones).",
            },
            motivo: {
              type: "string",
              description: "Por qué ese es el dominio a reforzar.",
            },
          },
          required: ["id", "titulo", "motivo"],
        },
      },
      required: ["resumen", "patrones", "dominioSugerido"],
    },
    titulo: {
      type: "string",
      description: "Título corto del material, sin comillas ni punto final.",
    },
    descripcion: {
      type: "string",
      description: "Una frase que resuma qué aprenderá el relator.",
    },
    icono: { type: "string", description: "Un único emoji que represente el tema." },
    objetivos: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string" },
      description:
        "Objetivos de aprendizaje observables, uno por patrón de error relevante, redactados con un verbo en infinitivo.",
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
  required: [
    "diagnostico",
    "titulo",
    "descripcion",
    "objetivos",
    "leccion",
    "preguntas",
  ],
};

const INSTRUCCIONES =
  `Eres analista de calidad y diseñador instruccional de una empresa de telecomunicaciones chilena. Recibes transcripciones de llamadas de atención al cliente que fueron mal evaluadas, y tu trabajo tiene dos partes: primero diagnosticar qué se está haciendo mal, y después convertir ese diagnóstico en formación.

Cómo diagnosticar:
- Busca patrones que se REPITEN entre llamadas, no incidentes aislados. Un error que aparece una vez en diez llamadas no es un patrón: es una anécdota.
- Describe conductas observables ("no confirma el plazo de la gestión antes de cerrar"), no rasgos de personalidad ("le falta empatía").
- El conteo de llamadas de cada patrón debe ser real: cuenta en cuántas de las transcripciones entregadas lo ves. No lo infles.
- Gravedad alta se reserva para lo que daña al cliente o incumple una norma (información errónea, promesa que no se puede cumplir, no validar identidad, cortar sin resolver).
- Si te entregan una lista de dominios existentes, revisa si alguno ya cubre estos errores y devuelve su id EXACTO. Proponer un dominio nuevo cuando ya existe uno equivalente fragmenta el catálogo. Solo propone uno nuevo si de verdad ninguno calza; en ese caso devuelve id vacío.

Cómo redactar la formación:
- Español de Chile, trato de "tú", tono directo y profesional, sin relleno ni frases motivacionales.
- La lección tiene que atacar los patrones detectados, en orden de gravedad. Para cada uno: qué se hizo mal, por qué importa, y cómo se hace bien — con el guion concreto que el relator puede decir.
- La lección debe ser autosuficiente: quien la lea tiene que poder responder las preguntas sin consultar otra fuente.
- Usa solo Markdown simple: ## y ### para subtítulos, **negrita**, *cursiva*, listas con "-", listas numeradas, "> " para una regla que no se puede olvidar, "---" para separar bloques.
- No inventes cifras, plazos, precios ni nombres de planes: usa únicamente los que aparezcan en las transcripciones. Si un dato falta, escribe explícitamente que hay que verificarlo en el sistema.
- Las preguntas deben poner al relator en la misma situación en que el lote falló, y evaluar criterio y decisión, no memoria literal. Las alternativas incorrectas tienen que ser exactamente los errores que cometieron en las llamadas.
- Cada pregunta apunta a un objetivo de la lista, y todo objetivo debe tener al menos una pregunta.

Privacidad, obligatorio:
- Las transcripciones traen datos de personas reales. En el diagnóstico, la lección, los ejemplos y las preguntas NUNCA reproduzcas nombres, RUT, teléfonos, direcciones, correos, números de cuenta ni de contrato. Escribe "el cliente", "la clienta" o un caso genérico.
- Tampoco identifiques al ejecutivo por su nombre: el material es formación, no una evaluación personal.`;

interface CuerpoPeticion {
  llamadas?: unknown;
  cantidadPreguntas?: number;
  foco?: string;
  dominios?: unknown;
}

function textoPlano(valor: unknown, maximo: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
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

  const llamadas = (Array.isArray(cuerpo.llamadas) ? cuerpo.llamadas : [])
    .map((llamada) => textoPlano(llamada, MAXIMO_CARACTERES_LOTE))
    .filter((llamada) => llamada.length > 0)
    .slice(0, MAXIMO_LLAMADAS);

  const totalCaracteres = llamadas.reduce((total, l) => total + l.length, 0);
  if (llamadas.length === 0 || totalCaracteres < MINIMO_CARACTERES_LOTE) {
    return jsonResponse(
      {
        error:
          "Pega las transcripciones completas: con tan poco texto no se pueden detectar patrones.",
      },
      400,
    );
  }

  // Tope global del lote: se recortan llamadas completas desde el final en vez
  // de cortar una a la mitad, para no dejar una transcripción truncada que el
  // modelo interprete como una llamada que se cayó.
  const seleccionadas: string[] = [];
  let acumulado = 0;
  for (const llamada of llamadas) {
    if (acumulado + llamada.length > MAXIMO_CARACTERES_LOTE) break;
    seleccionadas.push(llamada);
    acumulado += llamada.length;
  }
  const analizadas = seleccionadas.length > 0 ? seleccionadas : [llamadas[0]];

  const dominios = (Array.isArray(cuerpo.dominios) ? cuerpo.dominios : [])
    .map((d) => {
      const fila = (d ?? {}) as { id?: unknown; titulo?: unknown };
      return {
        id: textoPlano(fila.id, 64),
        titulo: textoPlano(fila.titulo, 120),
      };
    })
    .filter((d) => d.id && d.titulo)
    .slice(0, MAXIMO_DOMINIOS);

  const cantidad = Math.min(
    MAXIMO_PREGUNTAS,
    Math.max(MINIMO_PREGUNTAS, Math.round(cuerpo.cantidadPreguntas ?? 5)),
  );
  const foco = textoPlano(cuerpo.foco, 500);

  const bloqueLlamadas = analizadas
    .map((llamada, i) => `<llamada n="${i + 1}">\n${llamada}\n</llamada>`)
    .join("\n\n");

  const peticion = [
    `Analiza estas ${analizadas.length} ${
      analizadas.length === 1 ? "transcripción" : "transcripciones"
    } de llamadas mal evaluadas, detecta los patrones de error que se repiten y prepara con ellos un material de formación con ${cantidad} ${
      cantidad === 1 ? "pregunta" : "preguntas"
    } de práctica.`,
    foco ? `\n\nEnfoca el análisis en: ${foco}` : "",
    dominios.length > 0
      ? `\n\nDominios de formación que ya existen en la plataforma (usa el id EXACTO si alguno cubre estos errores):\n${
        dominios.map((d) => `- ${d.id}: ${d.titulo}`).join("\n")
      }`
      : "",
    `\n\n${bloqueLlamadas}`,
    llamadas.length > analizadas.length
      ? `\n\n(Se recortaron ${
        llamadas.length - analizadas.length
      } llamadas por longitud: trabaja solo con las anteriores y cuenta los patrones sobre esas ${analizadas.length}.)`
      : "",
  ].join("");

  let respuestaIa: Response;
  try {
    respuestaIa = await fetch("https://api.anthropic.com/v1/messages", {
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
              "Entrega el diagnóstico de las llamadas y el material de formación que lo corrige.",
            input_schema: ESQUEMA,
          },
        ],
        tool_choice: { type: "tool", name: "proponer_material" },
        messages: [{ role: "user", content: peticion }],
      }),
    });
  } catch {
    return jsonResponse(
      {
        error:
          "No se pudo contactar al servicio de IA. Reintenta en un momento.",
      },
      502,
    );
  }

  if (!respuestaIa.ok) {
    const detalle = await respuestaIa.text();
    console.error("Error de la API de IA", respuestaIa.status, detalle);
    const mensaje = respuestaIa.status === 401 || respuestaIa.status === 403
      ? "La clave de la IA fue rechazada. Revisa ANTHROPIC_API_KEY en Supabase."
      : respuestaIa.status === 429
      ? "El servicio de IA está saturado o sin cuota. Reintenta en unos minutos."
      : "El servicio de IA devolvió un error. Reintenta en un momento.";
    return jsonResponse({ error: mensaje }, 502);
  }

  const datos = await respuestaIa.json();
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

  const { diagnostico, ...propuesta } = bloque.input;
  return jsonResponse({
    propuesta,
    diagnostico: diagnostico ?? null,
    modelo: MODELO,
    llamadasAnalizadas: analizadas.length,
  });
});
