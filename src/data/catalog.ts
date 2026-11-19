import { CategorySchema } from './schema';
import type { Category, Item } from './schema';

/**
 * Catálogo de Lumina Home (demo comercial estática).
 * Se valida con zod en la carga del módulo: cualquier desviación del
 * esquema interrumpe el build/tests en lugar de llegar a producción.
 *
 * Los ítems `pendiente` no llevan descripción ni medios: su copy real
 * aún no ha sido confirmado por el cliente y no se inventa contenido.
 */
export const categories = CategorySchema.array().parse([
  {
    slug: 'polarizados',
    name: 'Polarizados',
    shortName: 'Polarizados',
    tagline: 'Privacidad, protección y control solar.',
    items: [
      { slug: 'espejo-premium', name: 'Espejo Premium', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'nanoceramico', name: 'Nanocerámico', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'opalizado', name: 'Opalizado', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'pelicula-de-seguridad', name: 'Película de Seguridad', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'sandblasting-decorativo', name: 'Sandblasting Decorativo', status: 'pendiente', copyStatus: 'provisional' },
    ],
  },
  {
    slug: 'papel-tapiz',
    name: 'Papel tapiz / Tapizados',
    shortName: 'Papel tapiz',
    tagline: 'Renueva tus espacios con diseños y texturas.',
    items: [
      { slug: 'lisos', name: 'Lisos', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'texturizados', name: 'Texturizados', status: 'pendiente', copyStatus: 'provisional' },
    ],
  },
  {
    slug: 'persianas-y-cortinas',
    name: 'Persianas y cortinas',
    shortName: 'Persianas y cortinas',
    tagline: 'Controla la luz y transforma tus ambientes.',
    items: [
      {
        slug: 'enrollable',
        name: 'Enrollable',
        status: 'ficha',
        summary: 'Sistema práctico y moderno que permite subir y bajar la tela para controlar la entrada de luz y privacidad.',
        description: 'Sistema práctico y moderno que permite subir y bajar la tela para controlar la entrada de luz y privacidad.',
        features: ['Se sube y se baja la tela', 'Control de la entrada de luz', 'Control de la privacidad'],
        media: ['obra-enrollable-doble-altura', 'enrollable-detalle'],
        copyStatus: 'confirmado',
      },
      { slug: 'enrollable-premium', name: 'Enrollable Premium', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'dos-en-uno', name: 'Dos en Uno', status: 'pendiente', copyStatus: 'provisional' },
      {
        slug: 'sheer-elegance',
        name: 'Sheer Elegance',
        status: 'ficha',
        summary: 'Combina franjas traslúcidas y opacas que permiten graduar la entrada de luz y conservar la privacidad.',
        description: 'Combina franjas traslúcidas y opacas que permiten graduar la entrada de luz y conservar la privacidad.',
        features: ['Franjas traslúcidas y opacas', 'Graduación de la entrada de luz', 'Conserva la privacidad'],
        media: ['sheer-elegance-ventana', 'sheer-elegance-detalle'],
        copyStatus: 'confirmado',
      },
      { slug: 'panel-japones', name: 'Panel Japonés', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'persiana-vertical', name: 'Persiana Vertical', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'romana', name: 'Romana', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'venecian', name: 'Venecian', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'cortina-luxury', name: 'Cortina Luxury', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'cortina-hannas', name: 'Cortina Hannas', status: 'pendiente', copyStatus: 'provisional' },
      { slug: 'cortina-vintage', name: 'Cortina Vintage', status: 'pendiente', copyStatus: 'provisional' },
    ],
  },
]);

/** Devuelve la categoría con el slug dado, o undefined. */
export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

/** Devuelve el ítem `itemSlug` dentro de la categoría `categorySlug`, o undefined. */
export function getItem(categorySlug: string, itemSlug: string): Item | undefined {
  return getCategory(categorySlug)?.items.find((item) => item.slug === itemSlug);
}

/** Pares `{ category, item }` de todos los ítems con estado `ficha`. */
export function fichaItems(): Array<{ category: Category; item: Item }> {
  const result: Array<{ category: Category; item: Item }> = [];
  for (const category of categories) {
    for (const item of category.items) {
      if (item.status === 'ficha') {
        result.push({ category, item });
      }
    }
  }
  return result;
}
