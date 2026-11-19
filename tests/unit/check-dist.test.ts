import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Unit tests for scripts/check-dist.mjs (order LH-T7A).
 *
 * The toolchain is dependency-frozen and ships no @types/node, so the Node
 * built-ins used here are loaded through computed-specifier dynamic imports
 * and typed with minimal local interfaces; `process` is declared as a
 * global. No dependency is added and no `any` is used.
 */

type SpawnResult = { status: number | null; stdout: string | null; stderr: string | null };
type NodeChildProcess = {
  spawnSync(command: string, args: string[], options: { cwd: string; encoding: 'utf8' }): SpawnResult;
};
type NodeFs = {
  mkdirSync(path: string, options: { recursive: true }): void;
  mkdtempSync(prefix: string): string;
  rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
  writeFileSync(path: string, data: string): void;
};
type NodeOs = { tmpdir(): string };
type NodePath = { dirname(p: string): string; join(...parts: string[]): string; resolve(...parts: string[]): string };
type NodeUrl = { pathToFileURL(path: string): { href: string } };

declare global {
  interface NodeProcess {
    cwd(): string;
    execPath: string;
  }
  var process: NodeProcess;
}

async function loadNode<T>(name: string): Promise<T> {
  return (await import(/* @vite-ignore */ name)) as T;
}

const { spawnSync } = await loadNode<NodeChildProcess>('node:child_process');
const fs = await loadNode<NodeFs>('node:fs');
const { tmpdir } = await loadNode<NodeOs>('node:os');
const { dirname, join, resolve } = await loadNode<NodePath>('node:path');
const { pathToFileURL } = await loadNode<NodeUrl>('node:url');

/**
 * The checker module is imported through a dynamic import with a computed
 * file URL, so no declaration file is needed and it is typed minimally.
 */
type HtmlCtx = {
  pagePath: string;
  distDir: string;
  pages: Map<string, string>;
  registry: { publicMediaUrls: Set<string>; astroImageBases: Set<string> };
};
type CheckDistOptions = { distDir: string; registryFile: string; rootDir?: string };
type CheckResult = { pages: number; violations: string[] };

const mod = (await import(pathToFileURL(resolve(process.cwd(), 'scripts/check-dist.mjs')).href)) as unknown as {
  checkDist: (options: CheckDistOptions) => CheckResult;
  checkHtml: (html: string, ctx: HtmlCtx) => string[];
};

// Fictitious wa.me phone for the "with number" form: built at runtime so no
// digit string is ever typed in this file (order LH-T7A, H6).
const PHONE = '57' + '0'.repeat(10);
const WA_VALID_WITHOUT_NUMBER = 'https://wa.me/?text=Hola%20Mundo';
const WA_VALID_WITH_NUMBER = `https://wa.me/${PHONE}?text=Hola`;

type FileMap = Record<string, string>;

/** Minimal valid fixture site (4 pages, registry with one image and one video). */
function baseSite(): FileMap {
  const indexHtml = [
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">',
    '<title>Inicio — Fixture</title>',
    '<meta name="description" content="Pagina de inicio de la fixture">',
    '<link rel="stylesheet" href="/_astro/estilo.css">',
    '<link rel="icon" href="/favicon.svg">',
    '<style>.hero { color: red }</style>',
    '</head><body id="contenido"><h1>Inicio</h1><p>',
    '<a href="/category/">Categoria</a>',
    '<a href="/category/sub/">Subcategoria</a>',
    '<a href="/404.html">Error</a>',
    '<a href="#contenido">Saltar</a>',
    '<a href="/category/#contenido">Ancla categoria</a>',
    `<img src="/_astro/hero.Zk1w9.webp" srcset="/_astro/hero.Zk1w9.webp 640w, /_astro/hero.Mk2x8Q.webp 960w" alt="Hero">`,
    '<img src="/_astro/hero.Mk2x8Q.webp" alt="" aria-hidden="true">',
    `<video controls poster="/media/video/clip-poster.jpg"><source src="/media/video/clip.mp4" type="video/mp4"></video>`,
    '<a href="https://example.com/pagina">Externo</a>',
    '<a href="mailto:correo@example.com">Correo</a>',
    `<a href="tel:+${'1'.repeat(8)}">Telefono</a>`,
    `<a href="${WA_VALID_WITHOUT_NUMBER}">WhatsApp sin numero</a>`,
    `<a href="${WA_VALID_WITH_NUMBER}">WhatsApp con numero</a>`,
    '</p></body></html>',
  ].join('');
  const categoryHtml = [
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">',
    '<title>Categoria — Fixture</title>',
    '<meta name="description" content="Pagina de categoria">',
    '<link rel="stylesheet" href="/_astro/estilo.css">',
    '</head><body id="contenido"><h1>Categoria</h1>',
    '<a href="/">Inicio</a>',
    '</body></html>',
  ].join('');
  const subHtml = [
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">',
    '<title>Subcategoria — Fixture</title>',
    '<meta name="description" content="Pagina de subcategoria">',
    '<link rel="stylesheet" href="/_astro/estilo.css">',
    '</head><body id="contenido"><h1>Subcategoria</h1>',
    '<a href="/">Inicio</a>',
    '</body></html>',
  ].join('');
  const notFoundHtml = [
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">',
    '<title>No encontrada — Fixture</title>',
    '<meta name="description" content="Pagina de error">',
    '<link rel="stylesheet" href="/_astro/estilo.css">',
    '</head><body id="contenido"><h1>No encontrada</h1>',
    '<a href="/">Inicio</a>',
    '</body></html>',
  ].join('');
  const registrySource = [
    '// Fixture registry (double de prueba; no es el media.ts real).',
    'export const fixtureRegistry = [',
    "  { id: 'hero', kind: 'image', file: 'src/assets/hero.jpeg', alt: 'Hero' },",
    "  { id: 'clip', kind: 'video', file: 'public/media/video/clip.mp4', poster: 'public/media/video/clip-poster.jpg', alt: 'Clip' },",
    '];',
    '',
  ].join('\n');
  return {
    'src/data/media.ts': registrySource,
    'src/assets/hero.jpeg': '(fixture)',
    'public/media/video/clip.mp4': '(fixture)',
    'public/media/video/clip-poster.jpg': '(fixture)',
    'dist/index.html': indexHtml,
    'dist/category/index.html': categoryHtml,
    'dist/category/sub/index.html': subHtml,
    'dist/404.html': notFoundHtml,
    'dist/_astro/estilo.css': 'body { margin: 0 }',
    'dist/_astro/hero.Zk1w9.webp': '(fixture)',
    'dist/_astro/hero.Mk2x8Q.webp': '(fixture)',
    'dist/media/video/clip.mp4': '(fixture)',
    'dist/media/video/clip-poster.jpg': '(fixture)',
    'dist/favicon.svg': '<svg></svg>',
  };
}

let tmpRoot = '';

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(join(tmpdir(), 'check-dist-t7a-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

/** Writes the fixture under the OS temp directory (never inside the repo). */
function buildSite(mutate?: (files: FileMap) => void): CheckDistOptions {
  const files = baseSite();
  if (mutate !== undefined) mutate(files);
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(tmpRoot, relPath);
    fs.mkdirSync(dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return { distDir: join(tmpRoot, 'dist'), registryFile: join(tmpRoot, 'src/data/media.ts') };
}

function patch(files: FileMap, relPath: string, replace: (page: string) => string): void {
  files[relPath] = replace(files[relPath] ?? '');
}

describe('checkDist: valid fixture', () => {
  it('reports 0 violations and the right page count for a minimal valid site', () => {
    const { distDir, registryFile } = buildSite();
    const result = mod.checkDist({ distDir, registryFile });
    expect(result.violations).toEqual([]);
    expect(result.pages).toBe(4);
  });

  it('accepts the two well-formed wa.me forms (with and without number)', () => {
    const { distDir, registryFile } = buildSite();
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.includes(': wa-me:'))).toEqual([]);
  });

  it('accepts an empty alt when the image has aria-hidden="true"', () => {
    const { distDir, registryFile } = buildSite();
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.includes(': img-alt:'))).toEqual([]);
  });

  it('ignores external, mailto: and tel: links', () => {
    const { distDir, registryFile } = buildSite();
    const { violations } = mod.checkDist({ distDir, registryFile });
    const touched = violations.filter(
      (line) => line.includes('example.com') || line.includes('mailto:') || line.includes('tel:'),
    );
    expect(touched).toEqual([]);
  });
});

describe('checkDist: negative fixtures', () => {
  it('lang-es: flags a page whose <html> has no lang attribute', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace(' lang="es"', ''));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: lang-es:'))).toHaveLength(1);
  });

  it('title: flags an empty <title>', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('<title>Inicio — Fixture</title>', '<title></title>'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: title:'))).toHaveLength(1);
  });

  it('title-unique: reports every page of a duplicate title group', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/category/index.html', (page) =>
        page.replace('<title>Categoria — Fixture</title>', '<title>Inicio — Fixture</title>'),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const duplicates = violations.filter((line) => line.includes(': title-unique:'));
    expect(duplicates).toHaveLength(2);
    expect(duplicates.some((line) => line.startsWith('index.html: title-unique:'))).toBe(true);
    expect(duplicates.some((line) => line.startsWith('category/index.html: title-unique:'))).toBe(true);
  });

  it('description: flags a missing <meta name="description">', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('<meta name="description" content="Pagina de inicio de la fixture">', ''),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: description:'))).toHaveLength(1);
  });

  it('h1: flags a page without <h1>', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('<h1>Inicio</h1>', ''));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: h1:'))).toHaveLength(1);
  });

  it('h1: flags a page with two <h1>', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('<h1>Inicio</h1>', '<h1>Uno</h1><h1>Dos</h1>'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const h1Lines = violations.filter((line) => line.startsWith('index.html: h1:'));
    expect(h1Lines).toHaveLength(1);
    expect(h1Lines[0]).toContain('found 2');
  });

  it('img-alt: flags an <img> without alt', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace(' alt="Hero"', ''));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: img-alt:'))).toHaveLength(1);
  });

  it('img-alt: flags an empty alt without role="presentation" or aria-hidden="true"', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace(
          '<img src="/_astro/hero.Mk2x8Q.webp" alt="" aria-hidden="true">',
          '<img src="/_astro/hero.Mk2x8Q.webp" alt="">',
        ),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: img-alt:'))).toHaveLength(1);
  });

  it('link-resolve: flags a broken internal link', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('href="/category/"', 'href="/roto/"'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: link-resolve:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('/roto/');
  });

  it('link-resolve: maps /x/ to x/index.html (accepted when the file exists)', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('href="/category/sub/"', 'href="/category/otra/"'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: link-resolve:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('category/otra/index.html');
  });

  it('fragment: flags a same-page #id link without a matching id', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('href="#contenido"', 'href="#fantasma"'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: fragment:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('#fantasma');
  });

  it('fragment: flags a /path/#id link whose target page lacks the id', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('href="/category/#contenido"', 'href="/category/#fantasma"'),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: fragment:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('category/index.html');
  });

  it('href-empty: flags href="#"', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('href="#contenido"', 'href="#"'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: href-empty:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('href="#"');
  });

  it('href-empty: flags href=""', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('href="#contenido"', 'href=""'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: href-empty:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('href=""');
  });

  it('href-empty: flags a href attribute without value', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('<a href="#contenido">Saltar</a>', '<a href>Saltar</a>'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: href-empty:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('without value');
  });

  it('wa-me: flags letters in the wa.me path', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace(WA_VALID_WITH_NUMBER, 'https://wa.me/abc?text=Hola'));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: wa-me:'))).toHaveLength(1);
  });

  it('wa-me: flags a wa.me link without text and masks the phone digits', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace(WA_VALID_WITH_NUMBER, `https://wa.me/${PHONE}`));
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: wa-me:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('text');
    expect(lines[0]).toContain('<DIGITS>');
    expect(lines[0]).not.toContain(PHONE);
  });

  it('wa-me: flags a wa.me link whose text has a bad percent escape', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace(WA_VALID_WITHOUT_NUMBER, 'https://wa.me/?text=%E0%A4%A'),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.startsWith('index.html: wa-me:'))).toHaveLength(1);
  });

  it('media-registry: flags a /media/ URL that is not in the registry', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/media/video/clip.mp4"', 'src="/media/video/desconocido.mp4"'),
      );
      // The file exists, so only media-registry fires (not link-resolve).
      files['dist/media/video/desconocido.mp4'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: media-registry:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('not in the media registry');
  });

  it('media-registry: flags a /_astro/ image that does not match a registry image', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/_astro/hero.Zk1w9.webp"', 'src="/_astro/ajena.Qw7e2.webp"'),
      );
      files['dist/_astro/ajena.Qw7e2.webp'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: media-registry:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('does not match any registry image');
  });

  it('media-file-missing: reports registry paths that do not exist on disk', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'src/data/media.ts', (source) =>
        source.replace(
          '];',
          "  { id: 'fantasma', kind: 'video', file: 'public/media/video/fantasma.mp4', poster: 'public/media/video/fantasma-poster.jpg', alt: 'Fantasma' },\n];",
        ),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.includes(': media-file-missing:'));
    expect(lines).toHaveLength(2);
    expect(lines.some((line) => line.includes('public/media/video/fantasma.mp4'))).toBe(true);
    expect(lines.some((line) => line.includes('public/media/video/fantasma-poster.jpg'))).toBe(true);
  });

  it('returns violations in deterministic sorted order', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page
          .replace(' lang="es"', '')
          .replace('href="/category/"', 'href="/roto/"')
          .replace('href="#contenido"', 'href="#"'),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations).toEqual([...violations].sort());
    expect(violations).toHaveLength(3);
    expect(violations[0]).toMatch(/^index\.html: href-empty:/);
    expect(violations[1]).toMatch(/^index\.html: lang-es:/);
    expect(violations[2]).toMatch(/^index\.html: link-resolve:/);
  });
});

describe('checkHtml', () => {
  it('checks a single page in isolation with the same rule ids', () => {
    const html = [
      '<!DOCTYPE html><html lang="en"><head>',
      '<title>Aislada</title>',
      '</head><body id="contenido"><h1>Aislada</h1>',
      '<a href="#missing">ir</a>',
      '</body></html>',
    ].join('');
    const ctx: HtmlCtx = {
      pagePath: 'aislada.html',
      distDir: join(tmpRoot, 'dist'),
      pages: new Map([['aislada.html', html]]),
      registry: { publicMediaUrls: new Set(['/media/video/clip.mp4']), astroImageBases: new Set(['hero']) },
    };
    const violations = mod.checkHtml(html, ctx);
    expect(violations.filter((line) => line.startsWith('aislada.html: lang-es:'))).toHaveLength(1);
    expect(violations.filter((line) => line.startsWith('aislada.html: fragment:'))).toHaveLength(1);
  });
});

describe('checkMediaRef: full branch coverage (FIX1 P1)', () => {
  it('accepts a /media/ URL that IS in the registry (img)', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/media/video/clip.mp4"'),
      );
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.includes(': media-registry:'))).toEqual([]);
  });

  it('flags a /media/ URL that is NOT in the registry with the specific message', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/media/video/desconocido.jpg"'),
      );
      files['dist/media/video/desconocido.jpg'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: media-registry:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('src="/media/video/desconocido.jpg"');
    expect(lines[0]).toContain('is not in the media registry');
  });

  it('accepts a font file under /_astro/', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/_astro/fuente.A1b2.woff2"'),
      );
      files['dist/_astro/fuente.A1b2.woff2'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.includes(': media-registry:'))).toEqual([]);
  });

  it('accepts /_astro/favicon.svg and /favicon.svg on an <img>', () => {
    const faviconCases: Array<{ url: string; file: string }> = [
      { url: '/_astro/favicon.svg', file: 'dist/_astro/favicon.svg' },
      { url: '/favicon.svg', file: 'dist/favicon.svg' },
    ];
    for (const { url, file } of faviconCases) {
      const { distDir, registryFile } = buildSite((files) => {
        patch(files, 'dist/index.html', (page) => page.replace('src="/_astro/hero.Mk2x8Q.webp"', `src="${url}"`));
        files[file] = files[file] ?? '(fixture)';
      });
      const { violations } = mod.checkDist({ distDir, registryFile });
      expect(violations.filter((line) => line.includes(': media-registry:'))).toEqual([]);
    }
  });

  it('accepts a /_astro/ image whose basename starts with a registry image base', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/_astro/hero.Otra9.webp"'),
      );
      files['dist/_astro/hero.Otra9.webp'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.includes(': media-registry:'))).toEqual([]);
  });

  it('flags a /_astro/ image that does not match a registry image with the specific message', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/_astro/ajena2.Qw7e2.webp"'),
      );
      files['dist/_astro/ajena2.Qw7e2.webp'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: media-registry:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('does not match any registry image under src/assets/');
  });

  it('flags a /_astro/ file with a non-media, non-font extension (current code reports it)', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/_astro/dato.Zz9.txt"'),
      );
      files['dist/_astro/dato.Zz9.txt'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: media-registry:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('uses media extension .txt, not allowed under /_astro/');
  });

  it('flags a media URL OUTSIDE /media/ and /_astro/ on <img> (the case that used to throw)', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/otro.jpg"'));
      // The file exists so only media-registry fires (not link-resolve).
      files['dist/otro.jpg'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/^index\.html: media-registry:/);
    expect(violations[0]).toContain('src="/otro.jpg"');
    expect(violations[0]).toContain('is a media reference outside /media/ and /_astro/');
  });

  it('flags the same outside URL on <video poster>', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) =>
        page.replace('poster="/media/video/clip-poster.jpg"', 'poster="/otro.jpg"'),
      );
      files['dist/otro.jpg'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: media-registry:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('poster="/otro.jpg"');
    expect(lines[0]).toContain('is a media reference outside /media/ and /_astro/');
  });

  it('flags the same outside URL on <source src>', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('src="/media/video/clip.mp4"', 'src="/otro.jpg"'));
      files['dist/otro.jpg'] = '(fixture)';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    const lines = violations.filter((line) => line.startsWith('index.html: media-registry:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('src="/otro.jpg"');
    expect(lines[0]).toContain('is a media reference outside /media/ and /_astro/');
  });

  it('does not produce media-registry for a non-media URL such as <a href="/pagina/">', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('href="/category/"', 'href="/pagina/"'));
      files['dist/pagina/index.html'] = '<!DOCTYPE html><html lang="es"><head><title>Pagina</title><meta name="description" content="x"></head><body id="contenido"><h1>Pagina</h1></body></html>';
    });
    const { violations } = mod.checkDist({ distDir, registryFile });
    expect(violations.filter((line) => line.includes(': media-registry:'))).toEqual([]);
  });
});

describe('CLI', () => {
  it('exits 0 and prints the summary on the valid fixture', () => {
    const { distDir, registryFile } = buildSite();
    const run = spawnSync(process.execPath, ['scripts/check-dist.mjs', '--dist', distDir, '--registry', registryFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(run.status).toBe(0);
    expect((run.stdout ?? '').trim().endsWith('check-dist: 4 page(s), 0 violation(s)')).toBe(true);
  });

  it('exits 1 and prints the violation line on a defective site', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('href="/category/"', 'href="/roto/"'));
    });
    const run = spawnSync(process.execPath, ['scripts/check-dist.mjs', '--dist', distDir, '--registry', registryFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expect(run.stdout ?? '').toContain('index.html: link-resolve:');
  });

  it('exits 1 with a dist/ not found message for a missing dist directory', () => {
    const run = spawnSync(process.execPath, ['scripts/check-dist.mjs', '--dist', join(tmpRoot, 'inexistente')], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expect(run.stderr ?? '').toContain('dist/ not found: run pnpm build');
  });

  it('FIX1 P1 regression: reports an outside media URL AND prints the summary (no crash)', () => {
    const { distDir, registryFile } = buildSite((files) => {
      patch(files, 'dist/index.html', (page) => page.replace('src="/_astro/hero.Mk2x8Q.webp"', 'src="/otro.jpg"'));
      // The file is NOT created: link-resolve must also be reported, and the
      // process must still print the summary line instead of crashing.
    });
    const run = spawnSync(process.execPath, ['scripts/check-dist.mjs', '--dist', distDir, '--registry', registryFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expect(run.stdout ?? '').toContain('index.html: media-registry:');
    expect(run.stdout ?? '').toContain('is a media reference outside /media/ and /_astro/');
    expect(run.stdout ?? '').toContain('index.html: link-resolve:');
    expect(run.stdout ?? '').toContain('check-dist: 4 page(s), 2 violation(s)');
  });
});
