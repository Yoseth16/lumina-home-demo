/**
 * Rutas internas del sitio con soporte de subruta base (GitHub Pages).
 *
 * El despliegue puede vivir en un subdirectorio (`base` de Astro,
 * configurado por `PUBLIC_BASE_PATH` en `astro.config.mjs`). Las rutas
 * escritas a mano en las plantillas pasan siempre por `withBase` para
 * anteponer la base; el número de WhatsApp y los demás datos siguen
 * viniendo de sus helpers propios (`whatsapp.ts`).
 */

/**
 * Normaliza la ruta base: recorta espacios, garantiza barra inicial y
 * final, y devuelve `/` cuando falta o queda vacía (`''` → `/`,
 * `'/lumina-home-demo'` → `'/lumina-home-demo/'`).
 */
export function normalizeBase(base?: string): string {
  const trimmed = base === undefined ? '' : base.trim();
  if (trimmed === '') {
    return '/';
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

/**
 * Antepone la base a una ruta interna del sitio: con base `/` la ruta
 * no cambia y con `/lumina-home-demo/` queda prefijada
 * (`'/'` → `'/lumina-home-demo/'`, `'/catalogo/'` →
 * `'/lumina-home-demo/catalogo/'`).
 */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  const strippedPath = path.replace(/^\/+/, '');
  return `${normalizeBase(base)}${strippedPath}`;
}

/**
 * Convierte una ruta de registro `public/...` en URL pública con la
 * base aplicada: `public/media/video/x.mp4` → `<base>/media/video/x.mp4`.
 */
export function publicAssetUrl(registryPath: string, base: string = import.meta.env.BASE_URL): string {
  return withBase(registryPath.replace(/^public/, ''), base);
}

/**
 * Resuelve una ruta como URL absoluta cuando hay sitio confirmado
 * (`PUBLIC_SITE_URL`); sin sitio devuelve la ruta sin tocar.
 */
export function resolveAbsoluteUrl(path: string, siteUrl?: string): string {
  if (siteUrl === undefined || siteUrl.trim() === '') {
    return path;
  }
  return new URL(path, siteUrl).href;
}

/**
 * Normaliza el sitio confirmado: devuelve la cadena recortada cuando
 * `raw` es una cadena no vacía y `undefined` en cualquier otro caso
 * (sin sitio confirmado no se inventa URL).
 */
export function normalizeSiteUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
