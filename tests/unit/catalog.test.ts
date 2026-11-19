import { describe, expect, it } from 'vitest';
import { categories, fichaItems, getCategory, getItem } from '../../src/data/catalog';
import { mediaRegistry, validateMediaRegistry } from '../../src/data/media';

const allItems = categories.flatMap((category) => category.items);

describe('catalog: categories', () => {
  it('has exactly three categories with exact slugs, names, shortNames and taglines', () => {
    expect(categories).toHaveLength(3);
    expect(categories.map((category) => category.slug)).toEqual([
      'polarizados',
      'papel-tapiz',
      'persianas-y-cortinas',
    ]);

    const polarizados = getCategory('polarizados');
    expect(polarizados?.name).toBe('Polarizados');
    expect(polarizados?.shortName).toBe('Polarizados');
    expect(polarizados?.tagline).toBe('Privacidad, protección y control solar.');

    const papelTapiz = getCategory('papel-tapiz');
    expect(papelTapiz?.name).toBe('Papel tapiz / Tapizados');
    expect(papelTapiz?.shortName).toBe('Papel tapiz');
    expect(papelTapiz?.tagline).toBe('Renueva tus espacios con diseños y texturas.');

    const persianas = getCategory('persianas-y-cortinas');
    expect(persianas?.name).toBe('Persianas y cortinas');
    expect(persianas?.shortName).toBe('Persianas y cortinas');
    expect(persianas?.tagline).toBe('Controla la luz y transforma tus ambientes.');

    for (const category of categories) {
      expect(category.summary).toBeUndefined();
      expect(category.heroMedia).toBeUndefined();
    }
  });

  it('has eighteen items with exact names and slugs per category', () => {
    expect(allItems).toHaveLength(18);

    expect(getCategory('polarizados')?.items.map((item) => item.name)).toEqual([
      'Espejo Premium',
      'Nanocerámico',
      'Opalizado',
      'Película de Seguridad',
      'Sandblasting Decorativo',
    ]);
    expect(getCategory('polarizados')?.items.map((item) => item.slug)).toEqual([
      'espejo-premium',
      'nanoceramico',
      'opalizado',
      'pelicula-de-seguridad',
      'sandblasting-decorativo',
    ]);

    expect(getCategory('papel-tapiz')?.items.map((item) => item.name)).toEqual(['Lisos', 'Texturizados']);
    expect(getCategory('papel-tapiz')?.items.map((item) => item.slug)).toEqual(['lisos', 'texturizados']);

    expect(getCategory('persianas-y-cortinas')?.items.map((item) => item.name)).toEqual([
      'Enrollable',
      'Enrollable Premium',
      'Dos en Uno',
      'Sheer Elegance',
      'Panel Japonés',
      'Persiana Vertical',
      'Romana',
      'Venecian',
      'Cortina Luxury',
      'Cortina Hannas',
      'Cortina Vintage',
    ]);
    expect(getCategory('persianas-y-cortinas')?.items.map((item) => item.slug)).toEqual([
      'enrollable',
      'enrollable-premium',
      'dos-en-uno',
      'sheer-elegance',
      'panel-japones',
      'persiana-vertical',
      'romana',
      'venecian',
      'cortina-luxury',
      'cortina-hannas',
      'cortina-vintage',
    ]);
  });

  it('has unique, URL-safe slugs within each category', () => {
    for (const category of categories) {
      const slugs = category.items.map((item) => item.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) {
        expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
    }
  });

  it('has exactly two ficha items: enrollable and sheer-elegance', () => {
    const fichas = fichaItems();
    expect(fichas.map((pair) => pair.item.slug).sort()).toEqual(['enrollable', 'sheer-elegance']);
    expect(fichas.map((pair) => pair.category.slug)).toEqual(['persianas-y-cortinas', 'persianas-y-cortinas']);
    expect(allItems.filter((item) => item.status === 'ficha')).toHaveLength(2);
  });

  it('marks the other sixteen items pendiente with provisional copy and no content fields', () => {
    for (const item of allItems) {
      if (item.status === 'ficha') {
        continue;
      }
      expect(item.copyStatus).toBe('provisional');
      expect(item.summary).toBeUndefined();
      expect(item.description).toBeUndefined();
      expect(item.features).toBeUndefined();
      expect(item.media).toBeUndefined();
    }
    expect(allItems.filter((item) => item.status === 'pendiente')).toHaveLength(16);
  });

  it('carries the two confirmed sentences verbatim with copyStatus confirmado', () => {
    const enrollable = getItem('persianas-y-cortinas', 'enrollable');
    const sheerElegance = getItem('persianas-y-cortinas', 'sheer-elegance');

    const enrollableSentence =
      'Sistema práctico y moderno que permite subir y bajar la tela para controlar la entrada de luz y privacidad.';
    expect(enrollable?.status).toBe('ficha');
    expect(enrollable?.copyStatus).toBe('confirmado');
    expect(enrollable?.summary).toBe(enrollableSentence);
    expect(enrollable?.description).toBe(enrollableSentence);
    expect(enrollable?.features).toEqual([
      'Se sube y se baja la tela',
      'Control de la entrada de luz',
      'Control de la privacidad',
    ]);
    expect(enrollable?.media).toEqual(['obra-enrollable-doble-altura', 'enrollable-detalle']);

    const sheerSentence =
      'Combina franjas traslúcidas y opacas que permiten graduar la entrada de luz y conservar la privacidad.';
    expect(sheerElegance?.status).toBe('ficha');
    expect(sheerElegance?.copyStatus).toBe('confirmado');
    expect(sheerElegance?.summary).toBe(sheerSentence);
    expect(sheerElegance?.description).toBe(sheerSentence);
    expect(sheerElegance?.features).toEqual([
      'Franjas traslúcidas y opacas',
      'Graduación de la entrada de luz',
      'Conserva la privacidad',
    ]);
    expect(sheerElegance?.media).toEqual(['sheer-elegance-ventana', 'sheer-elegance-detalle']);
  });

  it('exposes getCategory and getItem helpers', () => {
    expect(getCategory('papel-tapiz')?.slug).toBe('papel-tapiz');
    expect(getCategory('inexistente')).toBeUndefined();
    expect(getItem('polarizados', 'espejo-premium')?.name).toBe('Espejo Premium');
    expect(getItem('polarizados', 'inexistente')).toBeUndefined();
    expect(getItem('inexistente', 'espejo-premium')).toBeUndefined();
  });
});

describe('catalog and media registry: client content clauses', () => {
  it('serialises without the forbidden catalogue word and without forbidden claims', () => {
    // La palabra vetada se construye por partes para que el literal no
    // aparezca en el código (C7 de la orden: grep sin salida en src y tests).
    const forbiddenWord = 'Trad' + 'icional';
    const serialised = JSON.stringify({ categories, mediaRegistry });
    expect(serialised).not.toContain(forbiddenWord);
    expect(serialised).not.toMatch(/garant|certific|precio|años de experiencia/i);
  });

  it('references only registered media ids on ficha items', () => {
    const knownIds = new Set(mediaRegistry.map((entry) => entry.id));
    for (const { item } of fichaItems()) {
      for (const mediaId of item.media ?? []) {
        expect(knownIds.has(mediaId)).toBe(true);
      }
    }
  });

  it('passes validateMediaRegistry over the registry with all catalog items', () => {
    expect(validateMediaRegistry(mediaRegistry, allItems)).toEqual([]);
  });
});
