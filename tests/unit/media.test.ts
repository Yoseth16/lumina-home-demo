import { describe, expect, it } from 'vitest';
import { canRender, mediaRegistry, validateMediaRegistry } from '../../src/data/media';
import type { ItemLike, MediaEntryLike } from '../../src/data/media';

/** Ids enumerados en la orden LH-T3 (sección media.ts) y en el Addendum B (cláusulas T3). */
const expectedRegistryIds = [
  'brand-mockup',
  'obra-enrollable-doble-altura',
  'sheer-elegance-ventana',
  'sheer-elegance-detalle',
  'enrollable-detalle',
];

const forbiddenReferences = [
  '2.jpeg',
  '4.jpeg',
  '5.jpeg',
  '6.jpeg',
  'WhatsApp Image',
  'Captura de pantalla',
];

const validImage: MediaEntryLike = {
  id: 'entrada-valida',
  kind: 'image',
  file: 'src/assets/obras/entrada-valida.png',
  alt: 'Entrada de prueba válida',
  license: 'propio-autorizado',
  publishAuthorized: false,
};

describe('mediaRegistry', () => {
  it('contains exactly the ids listed in the order', () => {
    expect(mediaRegistry.map((entry) => entry.id)).toEqual(expectedRegistryIds);
  });

  it('passes validateMediaRegistry', () => {
    expect(validateMediaRegistry(mediaRegistry)).toEqual([]);
  });

  it('references none of the forbidden client files', () => {
    const serialised = JSON.stringify(mediaRegistry);
    for (const forbidden of forbiddenReferences) {
      expect(serialised).not.toContain(forbidden);
    }
  });
});

describe('validateMediaRegistry: negative fixtures', () => {
  it('rejects a licence outside the three allowed values', () => {
    const entry: MediaEntryLike = { ...validImage, id: 'licencia-mala', license: 'desconocida' };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  it('rejects duplicate ids', () => {
    const first: MediaEntryLike = { ...validImage, id: 'duplicada', alt: 'Primera entrada' };
    const second: MediaEntryLike = { ...first, alt: 'Segunda entrada' };
    expect(validateMediaRegistry([first, second]).length).toBeGreaterThan(0);
  });

  it('rejects an image without alt', () => {
    const entry: MediaEntryLike = {
      id: 'imagen-sin-alt',
      kind: 'image',
      file: 'src/assets/obras/sin-alt.png',
      license: 'propio-autorizado',
      publishAuthorized: false,
    };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  it('rejects a video without poster', () => {
    const entry: MediaEntryLike = {
      id: 'video-sin-poster',
      kind: 'video',
      file: 'public/media/video/sin-poster.mp4',
      alt: 'Video sin poster',
      license: 'propio-autorizado',
      publishAuthorized: false,
    };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  it('rejects a video without alt', () => {
    const entry: MediaEntryLike = {
      id: 'video-sin-alt',
      kind: 'video',
      file: 'public/media/video/sin-alt.mp4',
      poster: 'public/media/video/sin-alt-poster.jpg',
      license: 'propio-autorizado',
      publishAuthorized: false,
    };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  it('rejects licencia-comercial without source', () => {
    const entry: MediaEntryLike = {
      id: 'comercial-sin-source',
      kind: 'image',
      file: 'src/assets/obras/comercial.png',
      alt: 'Entrada comercial sin fuente',
      license: 'licencia-comercial',
      publishAuthorized: false,
    };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  it('rejects a provisional entry with file', () => {
    const entry: MediaEntryLike = {
      id: 'provisional-con-file',
      kind: 'image',
      file: 'src/assets/obras/provisional.png',
      alt: 'Entrada provisional con archivo',
      license: 'provisional',
      publishAuthorized: false,
    };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  it('rejects a video with provisional licence (Addendum B: video licences are propio-autorizado/licencia-comercial)', () => {
    const entry: MediaEntryLike = {
      id: 'video-provisional',
      kind: 'video',
      file: 'public/media/video/provisional.mp4',
      poster: 'public/media/video/provisional-poster.jpg',
      alt: 'Video provisional',
      license: 'provisional',
      publishAuthorized: false,
    };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  it('rejects file extensions outside the allowed set', () => {
    const entry: MediaEntryLike = {
      id: 'extension-mala',
      kind: 'image',
      file: 'src/assets/obras/extension-mala.gif',
      alt: 'Entrada con extensión no permitida',
      license: 'propio-autorizado',
      publishAuthorized: false,
    };
    expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
  });

  describe('forbidden references', () => {
    for (const forbidden of forbiddenReferences) {
      it(`rejects a source reference to ${forbidden}`, () => {
        const entry: MediaEntryLike = {
          ...validImage,
          id: 'referencia-prohibida',
          source: `cliente (${forbidden})`,
        };
        expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
      });
    }

    it('rejects a file reference to 4.jpeg', () => {
      const entry: MediaEntryLike = { ...validImage, file: 'src/assets/obras/4.jpeg' };
      expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
    });

    it('rejects a poster reference to 6.jpeg', () => {
      const entry: MediaEntryLike = { ...validImage, poster: 'public/media/video/6.jpeg' };
      expect(validateMediaRegistry([entry]).length).toBeGreaterThan(0);
    });
  });

  it('rejects an item media id that is not in the registry', () => {
    const item: ItemLike = { slug: 'item-fantasma', media: ['no-registrada'] };
    expect(validateMediaRegistry([validImage], [item]).length).toBeGreaterThan(0);
  });

  it('accepts item media ids present in the registry', () => {
    const item: ItemLike = { slug: 'item-valido', media: ['brand-mockup'] };
    expect(validateMediaRegistry(mediaRegistry, [item])).toEqual([]);
  });
});

describe('canRender', () => {
  it('renders own and commercial media as assets in the local demo', () => {
    expect(canRender({ license: 'propio-autorizado', publishAuthorized: false }, { publicDeploy: false })).toBe('asset');
    expect(canRender({ license: 'licencia-comercial', publishAuthorized: false }, { publicDeploy: false })).toBe('asset');
  });

  it('gates public deployment behind publishAuthorized', () => {
    expect(canRender({ license: 'propio-autorizado', publishAuthorized: false }, { publicDeploy: true })).toBe('placeholder');
    expect(canRender({ license: 'licencia-comercial', publishAuthorized: false }, { publicDeploy: true })).toBe('placeholder');
    expect(canRender({ license: 'propio-autorizado', publishAuthorized: true }, { publicDeploy: true })).toBe('asset');
    expect(canRender({ license: 'licencia-comercial', publishAuthorized: true }, { publicDeploy: true })).toBe('asset');
  });

  it('always renders provisional entries as placeholders', () => {
    expect(canRender({ license: 'provisional', publishAuthorized: false }, { publicDeploy: false })).toBe('placeholder');
    expect(canRender({ license: 'provisional', publishAuthorized: true }, { publicDeploy: true })).toBe('placeholder');
  });

  it('renders the real registry as local assets and public placeholders (client material not yet authorised)', () => {
    for (const entry of mediaRegistry) {
      expect(canRender(entry, { publicDeploy: false })).toBe('asset');
      expect(canRender(entry, { publicDeploy: true })).toBe('placeholder');
    }
  });
});
