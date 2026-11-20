// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Normaliza la ruta base del despliegue (GitHub Pages): garantiza barra
 * inicial y final (`lumina-home-demo` → `/lumina-home-demo/`). Vacía o
 * ausente → `/` (raíz, valor por defecto en local).
 *
 * @param {string | undefined} raw
 * @returns {string}
 */
function normalizeBase(raw) {
  const trimmed = raw === undefined ? '' : raw.trim();
  if (trimmed === '') {
    return '/';
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

/* Entorno del proceso visto con un tipo mínimo (sin depender de
   @types/node): solo las dos variables de despliegue que se leen. */
const nodeProcess = /** @type {unknown} */ (process);
const nodeEnv =
  /** @type {{ env?: Record<string, string | undefined> }} */ (nodeProcess).env ?? {};

const basePath = nodeEnv.PUBLIC_BASE_PATH?.trim() ?? '';
const siteUrl = nodeEnv.PUBLIC_SITE_URL?.trim() ?? '';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  base: normalizeBase(basePath),
  site: siteUrl === '' ? undefined : siteUrl,
});
