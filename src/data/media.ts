import { MediaEntrySchema } from './schema';
import type { MediaEntry } from './schema';

/**
 * Registro de medios de Lumina Home. Las entradas solo DESCRIBEN archivos
 * que tareas posteriores crean (T4 copia las imágenes con sha verificado;
 * T6 produce los vídeos re-codificados con ffmpeg): no hay acceso al
 * sistema de archivos aquí ni en los tests.
 *
 * `publishAuthorized: false` en todo el material del cliente: se muestra
 * en la demo LOCAL, pero no está autorizado aún para despliegue público.
 */
export const mediaRegistry = MediaEntrySchema.array().parse([
  {
    id: 'brand-mockup',
    kind: 'image',
    file: 'src/assets/brand/lumina-brand-mockup.jpeg',
    alt: 'Mockup de marca de Lumina Home',
    license: 'propio-autorizado',
    source: 'cliente (3.jpeg)',
    publishAuthorized: false,
  },
  {
    id: 'obra-enrollable-doble-altura',
    kind: 'image',
    file: 'src/assets/works/enrollable-doble-altura.jpeg',
    alt: 'Sala de doble altura con persianas enrollables',
    license: 'propio-autorizado',
    source: 'cliente (7.jpeg)',
    publishAuthorized: false,
  },
  {
    id: 'sheer-elegance-ventana',
    kind: 'video',
    file: 'public/media/video/sheer-elegance-ventana.mp4',
    poster: 'public/media/video/sheer-elegance-ventana-poster.jpg',
    alt: 'Persiana Sheer Elegance instalada en una ventana',
    license: 'propio-autorizado',
    source: 'cliente (2.mp4)',
    publishAuthorized: false,
  },
  {
    id: 'sheer-elegance-detalle',
    kind: 'video',
    file: 'public/media/video/sheer-elegance-detalle.mp4',
    poster: 'public/media/video/sheer-elegance-detalle-poster.jpg',
    alt: 'Detalle de las franjas traslúcidas y opacas de la persiana Sheer Elegance',
    license: 'propio-autorizado',
    source: 'cliente (3.mp4)',
    publishAuthorized: false,
  },
  {
    id: 'enrollable-detalle',
    kind: 'video',
    file: 'public/media/video/enrollable-detalle.mp4',
    poster: 'public/media/video/enrollable-detalle-poster.jpg',
    alt: 'Detalle del mecanismo de una persiana enrollable',
    license: 'propio-autorizado',
    source: 'cliente (WhatsApp Video 2026-11-18 at 1.57.59 PM.mp4)',
    publishAuthorized: false,
  },
]);

const ALLOWED_LICENCES: readonly string[] = ['propio-autorizado', 'licencia-comercial', 'provisional'];
const ALLOWED_EXTENSIONS: readonly string[] = ['.jpeg', '.jpg', '.png', '.svg', '.mp4', '.webp'];
const FORBIDDEN_REFERENCES: readonly string[] = [
  '2.jpeg',
  '4.jpeg',
  '5.jpeg',
  '6.jpeg',
  'WhatsApp Image',
  'Captura de pantalla',
];

/** Vista estructural flexible de una entrada de medios, para validar datos crudos. */
export interface MediaEntryLike {
  id?: string;
  kind?: string;
  file?: string;
  poster?: string;
  alt?: string;
  license?: string;
  source?: string;
  credit?: string;
  publishAuthorized?: boolean;
}

/** Vista estructural flexible de un ítem del catálogo, para validar sus referencias de medios. */
export interface ItemLike {
  slug?: string;
  media?: string[];
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot).toLowerCase();
}

/**
 * Valida un registro de medios (y, opcionalmente, los ítems que lo referencian)
 * sin tocar el sistema de archivos. Devuelve la lista de violaciones; vacía
 * significa registro válido.
 */
export function validateMediaRegistry(
  entries: readonly MediaEntryLike[],
  items?: readonly ItemLike[],
): string[] {
  const violations: string[] = [];
  const seenIds = new Set<string>();
  const knownIds = new Set<string>();

  for (const entry of entries) {
    const id = entry.id ?? '(sin id)';

    if (entry.id !== undefined) {
      if (seenIds.has(entry.id)) {
        violations.push(`[${id}] id duplicado`);
      } else {
        seenIds.add(entry.id);
        knownIds.add(entry.id);
      }
    }

    if (entry.license === undefined || !ALLOWED_LICENCES.includes(entry.license)) {
      violations.push(`[${id}] licencia fuera de los valores permitidos: ${entry.license ?? '(ausente)'}`);
    }

    if (isBlank(entry.alt)) {
      if (entry.kind === 'image') {
        violations.push(`[${id}] imagen sin alt`);
      }
      if (entry.kind === 'video') {
        violations.push(`[${id}] video sin alt`);
      }
    }
    if (entry.kind === 'video' && isBlank(entry.poster)) {
      violations.push(`[${id}] video sin poster`);
    }
    if (entry.kind === 'video' && entry.license === 'provisional') {
      violations.push(`[${id}] video con licencia provisional`);
    }

    if (entry.license === 'licencia-comercial' && isBlank(entry.source)) {
      violations.push(`[${id}] licencia-comercial sin source`);
    }

    if (entry.license === 'provisional' && entry.file !== undefined) {
      violations.push(`[${id}] entrada provisional con file`);
    }

    for (const reference of [entry.file, entry.poster]) {
      if (reference !== undefined && reference !== '') {
        const extension = extensionOf(reference);
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          violations.push(`[${id}] extensión no permitida: ${extension || '(sin extensión)'}`);
        }
      }
    }

    for (const reference of [entry.file, entry.poster, entry.source, entry.credit]) {
      if (reference === undefined) {
        continue;
      }
      for (const forbidden of FORBIDDEN_REFERENCES) {
        if (reference.includes(forbidden)) {
          violations.push(`[${id}] referencia prohibida "${forbidden}": ${reference}`);
        }
      }
    }
  }

  if (items !== undefined) {
    for (const item of items) {
      const slug = item.slug ?? '(sin slug)';
      for (const mediaId of item.media ?? []) {
        if (!knownIds.has(mediaId)) {
          violations.push(`[item ${slug}] media no registrado: ${mediaId}`);
        }
      }
    }
  }

  return violations;
}

/**
 * Decide si una entrada se renderiza como asset real o como placeholder.
 * - `provisional` siempre es placeholder.
 * - `propio-autorizado` y `licencia-comercial` (imágenes y vídeos) se
 *   renderizan en la demo LOCAL; en despliegue público solo si
 *   `publishAuthorized` es true.
 */
export function canRender(
  entry: Pick<MediaEntry, 'license' | 'publishAuthorized'>,
  options: { publicDeploy: boolean },
): 'asset' | 'placeholder' {
  if (entry.license === 'provisional') {
    return 'placeholder';
  }
  if (options.publicDeploy) {
    return entry.publishAuthorized ? 'asset' : 'placeholder';
  }
  return 'asset';
}
