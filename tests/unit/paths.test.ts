import { describe, expect, it } from 'vitest';
import {
  normalizeBase,
  normalizeSiteUrl,
  publicAssetUrl,
  resolveAbsoluteUrl,
  withBase,
} from '../../src/lib/paths';

describe('normalizeBase', () => {
  it('returns the root base for undefined, empty and whitespace-only input', () => {
    expect(normalizeBase(undefined)).toBe('/');
    expect(normalizeBase('')).toBe('/');
    expect(normalizeBase('   ')).toBe('/');
  });

  it('keeps an already normalized root base untouched', () => {
    expect(normalizeBase('/')).toBe('/');
  });

  it('adds the missing leading slash', () => {
    expect(normalizeBase('lumina-home-demo/')).toBe('/lumina-home-demo/');
    expect(normalizeBase('lumina-home-demo')).toBe('/lumina-home-demo/');
  });

  it('adds the missing trailing slash', () => {
    expect(normalizeBase('/lumina-home-demo')).toBe('/lumina-home-demo/');
  });

  it('keeps a fully normalized base untouched and trims surrounding spaces', () => {
    expect(normalizeBase('/lumina-home-demo/')).toBe('/lumina-home-demo/');
    expect(normalizeBase('  /lumina-home-demo/  ')).toBe('/lumina-home-demo/');
  });
});

describe('withBase', () => {
  it('keeps root paths at the site root for both bases', () => {
    expect(withBase('/', '/')).toBe('/');
    expect(withBase('/', '/lumina-home-demo/')).toBe('/lumina-home-demo/');
  });

  it('keeps routes unchanged for the root base', () => {
    expect(withBase('/catalogo/', '/')).toBe('/catalogo/');
    expect(withBase('/favicon.svg', '/')).toBe('/favicon.svg');
  });

  it('prefixes routes with the demo subpath base', () => {
    expect(withBase('/catalogo/', '/lumina-home-demo/')).toBe('/lumina-home-demo/catalogo/');
    expect(withBase('/favicon.svg', '/lumina-home-demo/')).toBe('/lumina-home-demo/favicon.svg');
  });

  it('prefixes nested routes with the demo subpath base', () => {
    expect(withBase('/catalogo/persianas-y-cortinas/', '/lumina-home-demo/')).toBe(
      '/lumina-home-demo/catalogo/persianas-y-cortinas/',
    );
    expect(withBase('/catalogo/persianas-y-cortinas/sheer-elegance/', '/lumina-home-demo/')).toBe(
      '/lumina-home-demo/catalogo/persianas-y-cortinas/sheer-elegance/',
    );
  });

  it('normalizes bases that arrive without leading or trailing slashes', () => {
    expect(withBase('/catalogo/', 'lumina-home-demo')).toBe('/lumina-home-demo/catalogo/');
    expect(withBase('/catalogo/', '/lumina-home-demo')).toBe('/lumina-home-demo/catalogo/');
    expect(withBase('/catalogo/', 'lumina-home-demo/')).toBe('/lumina-home-demo/catalogo/');
    expect(withBase('/contacto/', '')).toBe('/contacto/');
    expect(withBase('/contacto/', '   ')).toBe('/contacto/');
  });
});

describe('publicAssetUrl', () => {
  it('turns a public registry path into a rooted media URL for the root base', () => {
    expect(publicAssetUrl('public/media/video/sheer-elegance-ventana.mp4', '/')).toBe(
      '/media/video/sheer-elegance-ventana.mp4',
    );
    expect(publicAssetUrl('public/media/video/sheer-elegance-ventana-poster.jpg', '/')).toBe(
      '/media/video/sheer-elegance-ventana-poster.jpg',
    );
  });

  it('prefixes public registry paths with the demo subpath base', () => {
    expect(publicAssetUrl('public/media/video/enrollable-detalle.mp4', '/lumina-home-demo/')).toBe(
      '/lumina-home-demo/media/video/enrollable-detalle.mp4',
    );
    expect(publicAssetUrl('public/media/video/enrollable-detalle-poster.jpg', '/lumina-home-demo/')).toBe(
      '/lumina-home-demo/media/video/enrollable-detalle-poster.jpg',
    );
  });

  it('normalizes a base that arrives without slashes', () => {
    expect(publicAssetUrl('public/media/video/enrollable-detalle.mp4', 'lumina-home-demo')).toBe(
      '/lumina-home-demo/media/video/enrollable-detalle.mp4',
    );
  });
});

describe('resolveAbsoluteUrl', () => {
  it('returns the path unchanged without a site URL', () => {
    expect(resolveAbsoluteUrl('/lumina-home-demo/catalogo/', undefined)).toBe('/lumina-home-demo/catalogo/');
  });

  it('returns the path unchanged for an empty or whitespace-only site URL', () => {
    expect(resolveAbsoluteUrl('/lumina-home-demo/catalogo/', '')).toBe('/lumina-home-demo/catalogo/');
    expect(resolveAbsoluteUrl('/lumina-home-demo/catalogo/', '   ')).toBe('/lumina-home-demo/catalogo/');
  });

  it('resolves the path against the confirmed site URL', () => {
    expect(resolveAbsoluteUrl('/lumina-home-demo/_astro/obra.jpeg', 'https://example.github.io')).toBe(
      'https://example.github.io/lumina-home-demo/_astro/obra.jpeg',
    );
    expect(resolveAbsoluteUrl('/lumina-home-demo/', 'https://example.github.io')).toBe(
      'https://example.github.io/lumina-home-demo/',
    );
  });
});

describe('normalizeSiteUrl', () => {
  it('returns the trimmed URL for a valid site string', () => {
    expect(normalizeSiteUrl('https://example.github.io')).toBe('https://example.github.io');
    expect(normalizeSiteUrl('  https://example.github.io  ')).toBe('https://example.github.io');
  });

  it('returns undefined for empty and whitespace-only strings', () => {
    expect(normalizeSiteUrl('')).toBeUndefined();
    expect(normalizeSiteUrl('   ')).toBeUndefined();
  });

  it('returns undefined for non-string input', () => {
    expect(normalizeSiteUrl(null)).toBeUndefined();
    expect(normalizeSiteUrl(undefined)).toBeUndefined();
    expect(normalizeSiteUrl(42)).toBeUndefined();
    expect(normalizeSiteUrl({ url: 'https://example.github.io' })).toBeUndefined();
  });
});
