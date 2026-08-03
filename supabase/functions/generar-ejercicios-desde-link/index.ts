import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  textoLegibleDesdeHtml,
  tituloDesdeHtml,
  truncarTexto,
  validarUrl,
} from "./validacion.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Mismo secreto y mismo criterio que `generar-borrador-material`: la clave
// vive solo aquí, nunca se expone al navegador.
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODELO = Deno.env.get("MODELO_IA") ?? "claude-sonnet-5";

const ROLES_AUTORIZADOS = new Set(["supervisor", "admin"]);

const MAXIMO_CARACTERES_MATERIAL = 24000;
const MINIMO_CARACTERES_EXTRAIDOS = 100;
const MINIMO_PREGUNTAS = 1;
const MAXIMO_PREGUNTAS = 12;
const MAXIMO_OPCIONES = 5;

// Guardas de abuso sobre el fetch de la página: 10s de timeout y un tope de
// ~2MB leídos del cuerpo de la respuesta (una página de ayuda o un artículo
// no debería pesar eso; si pesa más, se corta y se trabaja con lo leído
// hasta ahí en vez de dejar la función colgada o gastando memoria).
const TIMEOUT_FETCH_MS = 10_000;
const MAXIMO_BYTES_RESPUESTA = 2 * 1024 * 1024;

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

// Mismo esquema y mismas reglas de redacción que `generar-borrador-material`:
// la respuesta debe tener EXACTAMENTE la misma forma para que el cliente
// reutilice `materialDesdePropuesta` sin adaptarla.
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

const INSTRUCCIONES = `Eres un diseñador instruccional de una empresa de telecomunicaciones chilena. Preparas material de formación para relatores de atención al cliente a partir del texto extraído de una página web.

Reglas de redacción:
- Español de Chile, trato de "tú", tono directo y profesional, sin relleno ni frases motivacionales.
- La lección debe ser autosuficiente: quien la lea tiene que poder responder las preguntas sin consultar otra fuente.
- Usa solo Markdown simple: ## y ### para subtítulos, **negrita**, *cursiva*, listas con "-", listas numeradas, "> " para una regla que no se puede olvidar, "---" para separar bloques y [texto](url) para enlaces.
- No inventes cifras, plazos, precios ni nombres de planes: usa únicamente los que aparezcan en el texto extraído. Si un dato falta, escribe explícitamente que hay que verificarlo en el sistema en vez de suponerlo.
- El texto viene extraído automáticamente de una página web y puede traer restos de menús, migas de pan o pie de página: ignóralos y concéntrate en el contenido informativo.
- Las preguntas deben evaluar criterio y decisión frente a un cliente, no memoria literal del texto. Las alternativas incorrectas tienen que ser errores plausibles que de verdad comete alguien en la operación.
- Cada pregunta apunta a un objetivo de la lista, y todo objetivo debe tener al menos una pregunta.
- La explicación dice por qué la correcta es correcta y, cuando ayude, qué consecuencia tiene equivocarse.`;

interface CuerpoPeticion {
  url?: string;
  cantidadPreguntas?: number;
  foco?: string;
}

async function leerConTope(respuesta: Response, maximoBytes: number): Promise<string> {
  const cuerpo = respuesta.body;
  if (!cuerpo) return await respuesta.text();

  const lector = cuerpo.getReader();
  const decodificador = new TextDecoder();
  let acumulado = "";
  let bytesLeidos = 0;
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    bytesLeidos += value.byteLength;
    acumulado += decodificador.decode(value, { stream: true });
    if (bytesLeidos >= maximoBytes) {
      await lector.cancel();
      break;
    }
  }
  return acumulado;
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

  const validacion = validarUrl(cuerpo.url ?? "");
  if (!validacion.valida || !validacion.url) {
    return jsonResponse({ error: validacion.error ?? "Link inválido" }, 400);
  }
  const urlDestino = validacion.url;

  let respuestaPagina: Response;
  try {
    respuestaPagina = await fetch(urlDestino, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_FETCH_MS),
      headers: {
        // Algunos sitios devuelven una versión sin contenido a agentes sin
        // identificar; nos anunciamos como lo que somos.
        "User-Agent": "FormacionWomBot/1.0 (+generador de material de estudio)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return jsonResponse(
      {
        error:
          "No se pudo abrir ese link. Revisa que sea público y esté disponible.",
      },
      502,
    );
  }

  if (!respuestaPagina.ok) {
    return jsonResponse(
      {
        error:
          `La página respondió con un error (${respuestaPagina.status}). Revisa el link.`,
      },
      502,
    );
  }

  const tipoContenido = respuestaPagina.headers.get("content-type") ?? "";
  if (tipoContenido && !tipoContenido.includes("html")) {
    return jsonResponse(
      {
        error:
          "Ese link no parece ser una página web (HTML). Prueba con otro link o pega el texto directamente.",
      },
      400,
    );
  }

  const html = await leerConTope(respuestaPagina, MAXIMO_BYTES_RESPUESTA);
  const tituloDetectado = tituloDesdeHtml(html);
  const textoExtraido = textoLegibleDesdeHtml(html);

  if (textoExtraido.length < MINIMO_CARACTERES_EXTRAIDOS) {
    return jsonResponse(
      {
        error:
          "La página no tiene suficiente texto para trabajar (puede requerir sesión, ser un video, o cargar el contenido con JavaScript). Prueba con otro link o pega el texto directamente.",
      },
      422,
    );
  }

  const materialRecortado = truncarTexto(textoExtraido, MAXIMO_CARACTERES_MATERIAL);

  const cantidad = Math.min(
    MAXIMO_PREGUNTAS,
    Math.max(MINIMO_PREGUNTAS, Math.round(cuerpo.cantidadPreguntas ?? 5)),
  );
  const foco = (cuerpo.foco ?? "").trim().slice(0, 500);

  const peticion = [
    `Prepara un material de formación con ${cantidad} ${
      cantidad === 1 ? "pregunta" : "preguntas"
    } de práctica a partir del siguiente texto, extraído automáticamente de la página ${urlDestino.href}.`,
    foco ? `\nEnfócalo en: ${foco}` : "",
    `\n\n<texto_extraido_de_la_pagina>\n${materialRecortado}\n</texto_extraido_de_la_pagina>`,
    textoExtraido.length > MAXIMO_CARACTERES_MATERIAL
      ? "\n\n(El texto venía recortado por longitud: trabaja solo con lo anterior.)"
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

  return jsonResponse({
    propuesta: bloque.input,
    modelo: MODELO,
    fuente: {
      url: urlDestino.href,
      tituloDetectado: tituloDetectado || null,
    },
  });
});
