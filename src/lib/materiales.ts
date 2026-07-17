// Lógica pura de la biblioteca de materiales de capacitación: qué tipos
// existen, cómo se etiquetan, y cómo se valida un archivo antes de subirlo.
// Separado del componente para poder probarlo sin montar React ni Supabase —
// mismo patrón que `lib/asignacion.ts` y `lib/reportes.ts`.
import {
  File,
  FileText,
  Image as ImageIcon,
  Link2,
  Presentation,
  Video,
} from 'lucide-react'
import type { Tables } from './database.types'

export type Material = Tables<'materiales'>

export type TipoMaterial =
  | 'pdf'
  | 'documento'
  | 'presentacion'
  | 'imagen'
  | 'video'
  | 'enlace'

export const TIPOS_MATERIAL: TipoMaterial[] = [
  'pdf',
  'documento',
  'presentacion',
  'imagen',
  'video',
  'enlace',
]

export const ETIQUETAS_TIPO: Record<TipoMaterial, string> = {
  pdf: 'PDF',
  documento: 'Documento',
  presentacion: 'Presentación',
  imagen: 'Imagen',
  video: 'Video',
  enlace: 'Enlace',
}

export const ICONO_TIPO: Record<TipoMaterial, typeof FileText> = {
  pdf: FileText,
  documento: File,
  presentacion: Presentation,
  imagen: ImageIcon,
  video: Video,
  enlace: Link2,
}

// Solo estos tipos se suben como archivo a Storage; video y enlace siempre
// son una URL externa (evita gastar la cuota gratuita de 1 GB del proyecto
// en contenido pesado — ver CLAUDE.md). `as const` para que MIME_POR_TIPO
// pueda tipar sus llaves exactamente con este subconjunto, no con
// TipoMaterial completo.
export const TIPOS_ARCHIVO = ['pdf', 'documento', 'presentacion', 'imagen'] as const

// Debe reflejar exactamente `allowed_mime_types` del bucket `materiales`
// (migración `biblioteca_de_materiales`) — si se agrega un mime aquí sin
// agregarlo también en el bucket, Storage rechaza la subida igual.
export const MIME_POR_TIPO: Record<(typeof TIPOS_ARCHIVO)[number], string[]> = {
  pdf: ['application/pdf'],
  documento: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  presentacion: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  imagen: ['image/png', 'image/jpeg', 'image/webp'],
}

export const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024 // 20 MB, igual que el bucket

// A qué tipo de material corresponde un mime de archivo. `null` si no está
// entre los permitidos (la subida se rechaza antes de llamar a Storage).
export function inferirTipoPorMime(mime: string): TipoMaterial | null {
  for (const tipo of TIPOS_ARCHIVO) {
    if (MIME_POR_TIPO[tipo].includes(mime)) return tipo
  }
  return null
}

export type ValidacionArchivo = { ok: true } | { ok: false; error: string }

// Validación previa a subir: mismo criterio que hará cumplir el bucket
// (mime + tamaño), pero con un mensaje legible antes de gastar la llamada
// de red.
export function validarArchivo(archivo: { type: string; size: number }): ValidacionArchivo {
  if (!inferirTipoPorMime(archivo.type)) {
    return {
      ok: false,
      error: 'Tipo de archivo no admitido. Usa PDF, Word, PowerPoint, Excel o imagen (PNG/JPG/WebP).',
    }
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return { ok: false, error: 'El archivo supera el máximo de 20 MB.' }
  }
  return { ok: true }
}

// Ruta única dentro del bucket: no se puede usar el id del material porque
// aún no existe (Storage se sube antes del insert) — un uuid propio evita
// colisiones de nombre entre archivos distintos con el mismo nombre original.
export function rutaAlmacenamiento(idUnico: string, nombreArchivo: string): string {
  const punto = nombreArchivo.lastIndexOf('.')
  const extension = punto >= 0 ? nombreArchivo.slice(punto) : ''
  return `${idUnico}${extension}`
}

// "1.4 MB", "230 KB", "—" si no hay tamaño (materiales de tipo enlace/video).
export function formatoTamano(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
