// scripts/check-dist.mjs — static output checker for the Lumina Home Astro
// build (order LH-T7A).
//
// Pure Node ESM with zero dependencies (node: built-ins only) and
// deterministic output: pages are walked in sorted order and violations are
// sorted before being reported. It verifies EVERY **/*.html file under the
// dist directory against ten rules with stable rule ids:
//
//   lang-es        <html> has lang="es".
//   title          exactly one non-empty <title> per page.
//   title-unique   titles are unique across all pages.
//   description    <meta name="description"> with non-empty content.
//   h1             exactly one <h1> per page.
//   img-alt        every <img> has alt (empty only with presentation/aria-hidden).
//   link-resolve   internal href/src/poster/srcset resolve to files in dist/.
//   fragment       #id links match an id in the target page.
//   href-empty     no href="#", href="" or valueless href.
//   wa-me          wa.me links are well formed (numbers are never printed:
//                  digit runs are masked as <DIGITS> in every report line).
//   media-registry no media reference outside the registry.
//   media-file-missing  a registry path that does not exist on disk.
//
// HTML is parsed with a small tag scanner (a manual walk over the string
// plus a quote-aware attribute parser): Astro emits single-line minified
// HTML, so nothing here relies on line breaks, and the contents of
// <script>/<style> are skipped so inline code cannot fake tags. CSS
// stylesheets, script bundles and <meta> content are never flagged as
// media; the src of <script> and the href of <link> are resolved through
// link-resolve like every other internal URL.
//
// Registry extraction (rule media-registry): the registry file
// (src/data/media.ts) is a TypeScript module already validated by zod and
// by tests/unit/media.test.ts. This checker only needs the set of paths it
// declares, so a deliberately SIMPLE regex over the `file:` and `poster:`
// string literals is used instead of a TS parser; it assumes those literals
// contain no quotes or newlines (true for the whole registry).
//
// Registry paths are repository-relative (src/assets/..., public/media/...).
// The repository root used to check them on disk (media-file-missing) is
// derived from the registry file location: the registry is expected at
// <root>/src/data/media.ts, so root = resolve(dirname(registry), '../..').
// checkDist() also accepts an explicit rootDir to override that default.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = 'usage: node scripts/check-dist.mjs [--dist <dir>] [--registry <file>]';

const IMAGE_EXTENSIONS = new Set(['jpeg', 'jpg', 'png', 'webp', 'svg']);
const ASTRO_MEDIA_EXTENSIONS = new Set(['webp', 'jpg', 'jpeg', 'png', 'mp4']);
const FONT_EXTENSIONS = new Set(['woff', 'woff2']);
const ANY_MEDIA_EXTENSIONS = new Set(['jpeg', 'jpg', 'png', 'webp', 'svg', 'gif', 'mp4', 'webm', 'mov', 'avi']);
const MEDIA_TAGS = new Set(['img', 'video', 'source']);

// ---------------------------------------------------------------------------
// Minimal HTML scanning
// ---------------------------------------------------------------------------

const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>=]*)))?/g;

/** Quote-aware attribute parser: value is null for bare attributes. */
function parseAttrs(raw) {
  const attrs = new Map();
  ATTR_RE.lastIndex = 0;
  let match = ATTR_RE.exec(raw);
  while (match !== null) {
    const name = match[1].toLowerCase();
    if (!attrs.has(name)) {
      let value = null;
      if (match[2] !== undefined) value = match[2];
      else if (match[3] !== undefined) value = match[3];
      else if (match[4] !== undefined) value = match[4];
      attrs.set(name, value);
    }
    match = ATTR_RE.exec(raw);
  }
  return attrs;
}

function isAsciiLetter(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

/**
 * Tag scanner for minified single-line HTML. Returns every tag with its
 * attributes; <script>/<style> contents are skipped so inline code cannot
 * produce fake tags.
 */
function scanTags(html) {
  const tags = [];
  const len = html.length;
  let i = 0;
  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt === -1) return tags;
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end === -1) return tags;
      i = end + 3;
      continue;
    }
    const next = html[lt + 1];
    if (next === undefined) return tags;
    if (next === '/') {
      const gt = html.indexOf('>', lt + 2);
      if (gt === -1) return tags;
      const name = html.slice(lt + 2, gt).trim().toLowerCase();
      if (name !== '') tags.push({ name, attrs: new Map(), closing: true });
      i = gt + 1;
      continue;
    }
    if (!isAsciiLetter(next)) {
      i = lt + 1;
      continue;
    }
    let j = lt + 1;
    while (j < len && /[a-zA-Z0-9-]/.test(html[j])) j += 1;
    const name = html.slice(lt + 1, j).toLowerCase();
    let attrPart = '';
    let quote = '';
    while (j < len) {
      const ch = html[j];
      if (quote !== '') {
        attrPart += ch;
        if (ch === quote) quote = '';
        j += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        attrPart += ch;
        j += 1;
        continue;
      }
      if (ch === '>') break;
      attrPart += ch;
      j += 1;
    }
    if (j >= len) return tags; // unterminated tag
    const selfClosed = html[j - 1] === '/';
    tags.push({ name, attrs: parseAttrs(attrPart), closing: false });
    i = j + 1;
    if ((name === 'script' || name === 'style') && !selfClosed) {
      const close = html.indexOf(`</${name}`, i);
      if (close === -1) return tags;
      i = close;
    }
  }
  return tags;
}

/** First <title> text (trimmed), or null when the page has none. */
function firstTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  return match === null ? null : match[1].trim();
}

function pageHasId(html, id) {
  for (const tag of scanTags(html)) {
    if (tag.closing) continue;
    if (tag.attrs.get('id') === id) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function stripQueryAndFragment(url) {
  return url.split('#')[0].split('?')[0];
}

function extensionOf(url) {
  const clean = stripQueryAndFragment(url);
  const dot = clean.lastIndexOf('.');
  const slash = clean.lastIndexOf('/');
  if (dot === -1 || dot < slash) return '';
  return clean.slice(dot + 1).toLowerCase();
}

function baseNoExt(url) {
  const clean = stripQueryAndFragment(url);
  const base = basename(clean);
  const dot = base.lastIndexOf('.');
  return dot === -1 ? base : base.slice(0, dot);
}

function posixDirname(relPath) {
  const idx = relPath.lastIndexOf('/');
  return idx === -1 ? '' : relPath.slice(0, idx);
}

/** Resolves '.'/'..' segments; returns null when the path escapes the root. */
function normalizeRel(relPath) {
  const out = [];
  for (const part of relPath.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

/**
 * Maps an internal URL to a path relative to the dist directory.
 * `/` -> index.html, `/x/` -> x/index.html, `/file.ext` -> file.ext;
 * relative URLs are resolved against the page's own directory.
 * Returns null when the URL cannot be resolved inside dist.
 */
function resolveLink(ctx, url) {
  const clean = stripQueryAndFragment(url);
  if (clean.startsWith('/')) {
    if (clean === '/') return 'index.html';
    if (clean.endsWith('/')) return `${clean.slice(1)}index.html`;
    return clean.slice(1);
  }
  if (clean === '') return null;
  const pageDir = posixDirname(ctx.pagePath);
  return normalizeRel(pageDir === '' ? clean : `${pageDir}/${clean}`);
}

function schemeOf(url) {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  return match === null ? '' : match[1].toLowerCase();
}

function maskDigits(text) {
  return text.replace(/\d+/g, '<DIGITS>');
}

// ---------------------------------------------------------------------------
// Rule 9: wa.me links (numbers are masked in every report line)
// ---------------------------------------------------------------------------

function checkWaMe(href, push) {
  const masked = maskDigits(href);
  let url;
  try {
    url = new URL(href);
  } catch {
    push('wa-me', `${masked} is not a valid URL`);
    return;
  }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'wa.me') {
    push('wa-me', `${masked} must use https://wa.me`);
    return;
  }
  const path = url.pathname;
  if (path !== '/' && !/^\/\d{8,15}$/.test(path)) {
    if (/^\/\d+$/.test(path)) push('wa-me', `${masked} phone must have 8 to 15 digits`);
    else push('wa-me', `${masked} path must be empty or contain only digits (8-15)`);
    return;
  }
  const text = /(?:^|[?&])text=([^&]*)/.exec(url.search);
  if (text === null || text[1] === '') {
    push('wa-me', `${masked} is missing the text parameter or it is empty`);
    return;
  }
  try {
    decodeURIComponent(text[1]);
  } catch {
    push('wa-me', `${masked} text is not a valid percent-encoded value`);
  }
}

// ---------------------------------------------------------------------------
// Rules 6-8: link resolution, fragments and empty hrefs
// ---------------------------------------------------------------------------

function checkHref(tagName, href, env) {
  const { ctx, ids, push } = env;
  if (href === null) {
    push('href-empty', `href attribute without value on <${tagName}>`);
    return;
  }
  if (href === '') {
    push('href-empty', `href="" on <${tagName}>`);
    return;
  }
  if (href === '#') {
    push('href-empty', 'href="#" (placeholder link)');
    return;
  }
  const scheme = schemeOf(href);
  if (scheme !== '') {
    if (scheme === 'http' || scheme === 'https') {
      let url = null;
      try {
        url = new URL(href);
      } catch {
        url = null;
      }
      if (url !== null && url.hostname.toLowerCase() === 'wa.me') checkWaMe(href, push);
    }
    return; // every other scheme (mailto:, tel:, data:, ...) is out of scope
  }
  if (href.startsWith('//')) return; // protocol-relative, external
  if (href.startsWith('#')) {
    const frag = href.slice(1);
    if (frag !== '' && !ids.has(frag)) {
      push('fragment', `href="#${frag}" has no matching id in this page`);
    }
    return;
  }
  const hashIdx = href.indexOf('#');
  const frag = hashIdx === -1 ? '' : href.slice(hashIdx + 1);
  const rel = resolveLink(ctx, href);
  if (rel === null || rel === '') {
    push('link-resolve', `href="${href}" on <${tagName}> cannot be resolved inside dist`);
    return;
  }
  if (!existsSync(join(ctx.distDir, rel))) {
    push('link-resolve', `href="${href}" on <${tagName}> not found (expected file: ${rel})`);
    return;
  }
  if (frag !== '' && rel.endsWith('.html') && ctx.pages.has(rel)) {
    if (!pageHasId(ctx.pages.get(rel), frag)) {
      push('fragment', `href="${href}" id "${frag}" not found in ${rel}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 10: media references vs the registry
// ---------------------------------------------------------------------------

function checkMediaRef(tagName, attr, url, ctx, push) {
  const clean = stripQueryAndFragment(url);
  // Computed ONCE at the top of the function: the URL extension is needed by
  // the /_astro/ branches and by the outside-/media//_astro/ branch below.
  // (FIX1 P1: it was previously declared inside the /_astro/ block, so a media
  // URL outside /media/ and /_astro/ threw ReferenceError instead of being
  // reported.)
  const ext = extensionOf(clean);
  if (clean.startsWith('/media/')) {
    if (!ctx.registry.publicMediaUrls.has(clean)) {
      push('media-registry', `${attr}="${clean}" on <${tagName}> is not in the media registry`);
    }
    return;
  }
  if (clean.startsWith('/_astro/')) {
    if (FONT_EXTENSIONS.has(ext)) return; // bundled fonts
    if (clean === '/favicon.svg' || clean === '/_astro/favicon.svg') return;
    if (ASTRO_MEDIA_EXTENSIONS.has(ext)) {
      const file = basename(clean);
      let matches = false;
      for (const base of ctx.registry.astroImageBases) {
        if (file.startsWith(base)) {
          matches = true;
          break;
        }
      }
      if (!matches) {
        push('media-registry', `${attr}="${clean}" on <${tagName}> does not match any registry image under src/assets/`);
      }
      return;
    }
    push('media-registry', `${attr}="${clean}" on <${tagName}> uses media extension .${ext}, not allowed under /_astro/`);
    return;
  }
  if (ANY_MEDIA_EXTENSIONS.has(ext) && clean !== '/favicon.svg') {
    push('media-registry', `${attr}="${clean}" on <${tagName}> is a media reference outside /media/ and /_astro/`);
  }
}

// ---------------------------------------------------------------------------
// Rule 6 for src/poster/srcset on every tag
// ---------------------------------------------------------------------------

function checkResource(tagName, attr, url, env) {
  const { ctx, push } = env;
  if (url === null) {
    push('link-resolve', `${attr} attribute without value on <${tagName}>`);
    return;
  }
  if (url === '') {
    push('link-resolve', `${attr}="" on <${tagName}>`);
    return;
  }
  if (url.startsWith('#')) return;
  if (schemeOf(url) !== '') return;
  if (url.startsWith('//')) return;
  const rel = resolveLink(ctx, url);
  if (rel === null || rel === '') {
    push('link-resolve', `${attr}="${url}" on <${tagName}> cannot be resolved inside dist`);
    return;
  }
  if (!existsSync(join(ctx.distDir, rel))) {
    push('link-resolve', `${attr}="${url}" on <${tagName}> not found (expected file: ${rel})`);
  }
  if (MEDIA_TAGS.has(tagName) && url.startsWith('/')) {
    checkMediaRef(tagName, attr, url, ctx, push);
  }
}

function checkSrcset(tagName, value, env) {
  for (const candidate of value.split(',')) {
    const url = candidate.trim().split(/\s+/)[0];
    if (url === '') continue;
    checkResource(tagName, 'srcset', url, env);
  }
}

// ---------------------------------------------------------------------------
// Per-page checks
// ---------------------------------------------------------------------------

/**
 * Checks one page of the build. `ctx` carries the page path relative to the
 * dist directory, the dist directory, the map of every built page (used for
 * cross-page fragments) and the registry summary.
 */
export function checkHtml(html, ctx) {
  const out = [];
  const push = (rule, detail) => {
    out.push(`${ctx.pagePath}: ${rule}: ${detail}`);
  };

  const tags = scanTags(html);
  const opening = [];
  const ids = new Set();
  for (const tag of tags) {
    if (tag.closing) continue;
    opening.push(tag);
    const id = tag.attrs.get('id');
    if (typeof id === 'string') ids.add(id);
  }
  const env = { ctx, ids, push };

  // Rule 1: lang-es.
  const htmlTag = opening.find((tag) => tag.name === 'html');
  if (htmlTag === undefined) {
    push('lang-es', 'no <html> element found');
  } else {
    const lang = htmlTag.attrs.get('lang');
    if (lang === undefined || lang === null) push('lang-es', '<html> is missing the lang attribute (expected lang="es")');
    else if (lang !== 'es') push('lang-es', `lang="${lang}" (expected "es")`);
  }

  // Rule 2: title (exactly one, non-empty; uniqueness is checked in checkDist).
  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  if (titles.length === 0) push('title', 'no <title> element found');
  else if (titles.length > 1) push('title', `expected exactly one <title>, found ${titles.length}`);
  else if (titles[0][1].trim() === '') push('title', '<title> is empty');

  // Rule 3: description.
  const hasDescription = opening.some(
    (tag) =>
      tag.name === 'meta' &&
      tag.attrs.get('name') === 'description' &&
      (tag.attrs.get('content') ?? '').trim() !== '',
  );
  if (!hasDescription) push('description', 'no <meta name="description"> with non-empty content');

  // Rule 4: h1.
  const h1Count = opening.filter((tag) => tag.name === 'h1').length;
  if (h1Count === 0) push('h1', 'no <h1> element found');
  else if (h1Count > 1) push('h1', `expected exactly one <h1>, found ${h1Count}`);

  // Rules 5-10, tag by tag.
  for (const tag of opening) {
    if (tag.name === 'img') {
      const alt = tag.attrs.get('alt');
      const src = tag.attrs.get('src');
      const label = `<img${typeof src === 'string' ? ` src="${src}"` : ''}>`;
      if (alt === undefined || alt === null) {
        push('img-alt', `${label} is missing the alt attribute`);
      } else if (alt === '') {
        const role = tag.attrs.get('role');
        const ariaHidden = tag.attrs.get('aria-hidden');
        if (role !== 'presentation' && ariaHidden !== 'true') {
          push('img-alt', `${label} has an empty alt without role="presentation" or aria-hidden="true"`);
        }
      }
    }
    const href = tag.attrs.get('href');
    if (href !== undefined) checkHref(tag.name, href, env);
    const src = tag.attrs.get('src');
    if (src !== undefined) checkResource(tag.name, 'src', src, env);
    const poster = tag.attrs.get('poster');
    if (poster !== undefined) checkResource(tag.name, 'poster', poster, env);
    const srcset = tag.attrs.get('srcset');
    if (srcset !== undefined && srcset !== null) checkSrcset(tag.name, srcset, env);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Whole-build checks
// ---------------------------------------------------------------------------

/**
 * Extracts the `file:` and `poster:` string literals from the registry
 * source. Deliberately simple (see the header comment): the registry is a
 * TS module validated elsewhere; only its path literals matter here.
 */
function extractRegistryPaths(registrySource) {
  const paths = [];
  const re = /\b(?:file|poster)\s*:\s*(['"])([^'"\n]+)\1/g;
  let match = re.exec(registrySource);
  while (match !== null) {
    paths.push(match[2]);
    match = re.exec(registrySource);
  }
  return [...new Set(paths)];
}

/** Every .html file under the dist directory (recursive), in sorted relative-path order. */
function listHtmlFiles(distDir) {
  const files = [];
  const walk = (abs, relDir) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const childRel = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
      const childAbs = join(abs, entry.name);
      if (entry.isDirectory()) walk(childAbs, childRel);
      else if (entry.name.endsWith('.html')) files.push({ abs: childAbs, rel: childRel });
    }
  };
  walk(distDir, '');
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return files;
}

/**
 * Checks the whole build. `distDir` is the build output directory and
 * `registryFile` the media registry (expected at <root>/src/data/media.ts);
 * `rootDir` overrides the repository root used for registry paths on disk.
 * Returns { pages, violations } with the violations sorted.
 */
export function checkDist({ distDir, registryFile, rootDir }) {
  const dist = resolve(distDir);
  const registryPath = resolve(registryFile);
  const root = rootDir === undefined ? resolve(dirname(registryPath), '..', '..') : resolve(rootDir);
  if (!existsSync(dist)) throw new Error(`dist/ not found: run pnpm build (checked: ${dist})`);
  if (!existsSync(registryPath)) throw new Error(`registry file not found: ${registryFile}`);
  const registryRel = relative(root, registryPath) || basename(registryPath);

  const violations = [];
  const registryPaths = extractRegistryPaths(readFileSync(registryPath, 'utf8'));
  const publicMediaUrls = new Set();
  const astroImageBases = new Set();
  for (const registryPathEntry of registryPaths) {
    if (registryPathEntry.startsWith('public/')) {
      publicMediaUrls.add(`/${registryPathEntry.slice('public/'.length)}`);
    }
    if (registryPathEntry.startsWith('src/assets/') && IMAGE_EXTENSIONS.has(extensionOf(registryPathEntry))) {
      astroImageBases.add(baseNoExt(registryPathEntry));
    }
    if (!existsSync(join(root, registryPathEntry))) {
      violations.push(`${registryRel}: media-file-missing: ${registryPathEntry} does not exist on disk`);
    }
  }
  const registry = { publicMediaUrls, astroImageBases };

  const htmlFiles = listHtmlFiles(dist);
  const pages = new Map();
  for (const file of htmlFiles) pages.set(file.rel, readFileSync(file.abs, 'utf8'));

  for (const file of htmlFiles) {
    violations.push(
      ...checkHtml(pages.get(file.rel), {
        pagePath: file.rel,
        distDir: dist,
        pages,
        registry,
      }),
    );
  }

  // Rule 2 (cross-page): title-unique, reporting every duplicate group.
  const byTitle = new Map();
  for (const file of htmlFiles) {
    const title = firstTitle(pages.get(file.rel));
    if (title === null || title === '') continue;
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title).push(file.rel);
  }
  const groups = [...byTitle.entries()]
    .filter(([, rels]) => rels.length > 1)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [title, rels] of groups) {
    for (const rel of rels) {
      const others = rels.filter((candidate) => candidate !== rel).join(', ');
      violations.push(`${rel}: title-unique: duplicate title "${title}" (also on: ${others})`);
    }
  }

  violations.sort();
  return { pages: htmlFiles.length, violations };
}

// ---------------------------------------------------------------------------
// Guarded CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { dist: 'dist', registry: 'src/data/media.ts' };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg !== '--dist' && arg !== '--registry') return { error: `unknown argument: ${arg}` };
    const value = args[i + 1];
    if (value === undefined || value === '') return { error: `missing value for ${arg}` };
    opts[arg === '--dist' ? 'dist' : 'registry'] = value;
    i += 1;
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.error !== undefined) {
    console.error(opts.error);
    console.error(USAGE);
    process.exit(1);
    return;
  }
  try {
    const { pages, violations } = checkDist({
      distDir: resolve(process.cwd(), opts.dist),
      registryFile: resolve(process.cwd(), opts.registry),
    });
    for (const line of violations) console.log(line);
    console.log(`check-dist: ${pages} page(s), ${violations.length} violation(s)`);
    process.exit(violations.length === 0 ? 0 : 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
