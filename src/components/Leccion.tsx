import { Fragment } from 'react'
import { parsearMarkdown, type Bloque, type Inline } from '../lib/markdown'

// Dibuja el cuerpo de una lección escrita en el creador de materiales.
//
// La regla de oro: **nunca** `dangerouslySetInnerHTML`. `lib/markdown.ts`
// devuelve una estructura de datos y aquí se convierte en elementos de React,
// así que cualquier `<script>` que un administrador pegue en el cuerpo llega
// como texto y React lo escapa al pintarlo. La validación de urls también vive
// en el analizador: si una url no es segura, el nodo ya llegó degradado a texto.

function NodoInline({ nodo }: { nodo: Inline }) {
  switch (nodo.tipo) {
    case 'negrita':
      return <strong className="font-semibold text-tinta">{nodo.texto}</strong>
    case 'cursiva':
      return <em>{nodo.texto}</em>
    case 'codigo':
      return (
        <code className="rounded bg-niebla px-1.5 py-0.5 font-mono text-[0.9em] text-tinta">
          {nodo.texto}
        </code>
      )
    case 'enlace':
      return (
        // `noopener` evita que la pestaña destino pueda manipular la nuestra;
        // `noreferrer` no filtra la url interna de la plataforma.
        <a
          href={nodo.url}
          target={nodo.url.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="font-semibold text-enlace underline underline-offset-2 hover:opacity-80"
        >
          {nodo.texto}
        </a>
      )
    case 'imagen':
      return (
        <img
          src={nodo.url}
          alt={nodo.alt}
          loading="lazy"
          className="my-2 max-w-full rounded-xl border border-gray-200"
        />
      )
    default:
      return <>{nodo.texto}</>
  }
}

function Contenido({ nodos }: { nodos: Inline[] }) {
  return (
    <>
      {nodos.map((nodo, i) => (
        <Fragment key={i}>
          <NodoInline nodo={nodo} />
        </Fragment>
      ))}
    </>
  )
}

function BloqueLeccion({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case 'titulo':
      // El h1 lo pone la página; el cuerpo empieza en h2 para no romper la
      // jerarquía que recorre un lector de pantalla.
      return bloque.nivel === 2 ? (
        <h2 className="mt-6 text-xl font-bold text-tinta first:mt-0">
          <Contenido nodos={bloque.contenido} />
        </h2>
      ) : (
        <h3 className="mt-5 text-base font-bold text-tinta first:mt-0">
          <Contenido nodos={bloque.contenido} />
        </h3>
      )
    case 'parrafo':
      return (
        <p className="mt-3 leading-relaxed text-tinta-suave first:mt-0">
          <Contenido nodos={bloque.contenido} />
        </p>
      )
    case 'lista': {
      const clases = 'mt-3 space-y-1.5 pl-5 text-tinta-suave first:mt-0'
      const items = bloque.items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          <Contenido nodos={item} />
        </li>
      ))
      return bloque.ordenada ? (
        <ol className={`list-decimal ${clases}`}>{items}</ol>
      ) : (
        <ul className={`list-disc ${clases}`}>{items}</ul>
      )
    }
    case 'cita':
      return (
        <blockquote className="mt-4 border-l-4 border-enlace/40 bg-niebla px-4 py-2 italic text-tinta-suave first:mt-0">
          <Contenido nodos={bloque.contenido} />
        </blockquote>
      )
    case 'codigo':
      return (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-niebla p-4 text-sm first:mt-0">
          <code className="font-mono text-tinta">{bloque.texto}</code>
        </pre>
      )
    case 'separador':
      return <hr className="my-6 border-gray-200" />
    default:
      return null
  }
}

export function Leccion({ cuerpo, className }: { cuerpo: string; className?: string }) {
  const bloques = parsearMarkdown(cuerpo)
  if (bloques.length === 0) return null
  return (
    <div className={className}>
      {bloques.map((bloque, i) => (
        <BloqueLeccion key={i} bloque={bloque} />
      ))}
    </div>
  )
}
