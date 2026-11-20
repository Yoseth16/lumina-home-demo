# lumina-home-demo

Demostración comercial estática de Lumina Home: polarizados, papel tapiz,
persianas y cortinas. Sitio generado con Astro; sin base de datos ni servidor.

## Qué es

Un sitio estático de demostración de Lumina Home. Incluye portada, vista
general del catálogo, páginas de categoría, fichas de producto y un
formulario de contacto. Las cotizaciones salen por WhatsApp, mediante
enlaces `wa.me` que ya llevan el mensaje listo.

No hay base de datos ni servidor: el sitio se genera como archivos
estáticos y se sirve tal cual. Los textos e imágenes son provisionales y
el sitio está marcado como `noindex`; no está desplegado. En todas las
páginas, una barra fina de aviso muestra el texto «Demostración: textos e
imágenes provisionales».

## Requisitos

- Node 26, según `.nvmrc` (aquí verificado con `node --version`:
  `v26.13.0`).
- pnpm. `package.json` no declara el campo `packageManager`; el gestor
  queda fijado en el repositorio por `pnpm-lock.yaml`. La versión usada
  en este proyecto es pnpm 12.16.1.
- No se necesita ninguna otra herramienta global.

## Primeros pasos

```sh
pnpm install
pnpm dev
```

`pnpm dev` inicia el servidor de desarrollo y Astro imprime la URL local
(`localhost`). Para generar el sitio y verlo como quedará publicado:

```sh
pnpm build
pnpm preview
```

Para generar el sitio sin número de WhatsApp (enlaces sin destinatario,
ver la sección «Cómo editar»):

```sh
PUBLIC_WHATSAPP_NUMBER= pnpm build
```

## Scripts

| Script | Comando | Para qué |
| --- | --- | --- |
| `dev` | `astro dev` | Servidor de desarrollo con recarga. |
| `build` | `astro build` | Genera el sitio estático en `dist/`. |
| `preview` | `astro preview` | Sirve `dist/` de forma local. |
| `typecheck` | `astro check` | Diagnóstico de los archivos `.astro` y del código. |
| `typecheck:tests` | `tsc --noEmit -p tsconfig.tests.json` | Comprueba los archivos de tests. |
| `test` | `vitest run` | Suite de pruebas unitarias. |
| `check:dist` | `node scripts/check-dist.mjs` | Valida las páginas generadas en `dist/`. |

## Cómo editar

- **Catálogo**: `src/data/catalog.ts`. Define las categorías, sus ítems y
  los ids de medios de cada ficha (`media`). El campo `status` distingue
  una ficha completa (`ficha`) de una pendiente (`pendiente`): los ítems
  pendientes se muestran con la etiqueta «Ficha en preparación» y no
  llevan descripción ni medios.
- **Datos del sitio**: `src/data/site.ts` (nombre, eslogan, ciudad). Los
  campos sin confirmar (correo, dirección) quedan sin definir y ocultos.
- **Número de WhatsApp**: se configura con la variable
  `PUBLIC_WHATSAPP_NUMBER` (solo dígitos, con código de país) en un
  archivo `.env.local` en la raíz del proyecto; ese archivo está fuera de
  git porque `.gitignore` cubre `.env*`. Nunca se escribe el número en el
  código ni se sube a git. Ejemplo de línea en `.env.local`:

  ```sh
  PUBLIC_WHATSAPP_NUMBER=<NÚMERO_CON_CÓDIGO_DE_PAÍS>
  ```

  Sin un número válido, los enlaces abren `wa.me/?text=…` sin
  destinatario y la página de contacto muestra «Número de WhatsApp
  pendiente de confirmar (demostración)».

## Cómo añadir medios autorizados

- El registro de medios es `src/data/media.ts` (`mediaRegistry`), con
  cinco entradas que apuntan a ocho archivos. Cada entrada declara `id`,
  `kind` (imagen o vídeo), `file`, `alt`, `license` y el campo
  `publishAuthorized`: en `false`, el material se muestra en la demo local
  pero no está autorizado para publicación pública.
- Ubicaciones que espera el código: imágenes en `src/assets/` (por
  ejemplo `src/assets/works/`); vídeos y sus pósters en
  `public/media/video/`.
- Extensiones permitidas: `.jpeg`, `.jpg`, `.png`, `.svg`, `.mp4`,
  `.webp`.
- Vídeos: MP4 con códec H.264 y un póster JPG por cada uno. Los tres
  vídeos actuales no llevan pista de audio; si el cliente aporta vídeos
  con sonido, hay que añadir subtítulos antes de usarlos.
- Solo se añaden archivos con autorización escrita. La suite
  `tests/unit/media.test.ts` (que corre con `pnpm test`) valida el
  registro: ids únicos, licencias permitidas, `alt` y póster obligatorios,
  referencias prohibidas a archivos del cliente no autorizados y el
  marcado `publishAuthorized`.
- `_cliente/` es la carpeta local, ignorada por git, donde se dejan los
  archivos que envía el cliente antes de decidir su uso.

## Calidad y comprobaciones

Ejecute una tras otra:

```sh
pnpm typecheck
pnpm typecheck:tests
pnpm test
PUBLIC_WHATSAPP_NUMBER= pnpm build
pnpm check:dist
```

Una salida sana se ve así:

- `pnpm typecheck`: 0 errores, 0 avisos, 0 notas sobre 38 archivos.
- `pnpm typecheck:tests`: sin errores.
- `pnpm test`: 96 pruebas en 5 archivos, todas aprobadas.
- `PUBLIC_WHATSAPP_NUMBER= pnpm build`: sin errores.
- `pnpm check:dist`: `check-dist: 9 page(s), 0 violation(s)`.

Accesibilidad: el repositorio usa un auxiliar local
`.claude/skills/accessibility-engineering/scripts/audit-a11y.sh` (no
forma parte del árbol rastreado; es una copia local). Necesita un binario
de Chrome, que se instala con `npx puppeteer browsers install chrome`, o
un `chromeLaunchConfig.executablePath` que apunte a un Chrome ya
instalado. Con axe-core 4.13.0, la verificación alcanzó 0 violaciones en
las 9 páginas.

## Incluido en la demo / Pendiente del cliente

Incluido:

- Portada con galería de materiales.
- Vista general del catálogo.
- Tres páginas de categoría (polarizados, papel tapiz, persianas y
  cortinas).
- Dos fichas de producto completas: Enrollable y Sheer Elegance.
- Los demás ítems, como «Ficha en preparación».
- Formulario de contacto con salida por WhatsApp.
- Página 404.
- Diseño responsive comprobado a 320, 360, 768 y 1280 px.
- Navegación por teclado y enlace de salto al contenido.
- Sin medios sin licencia.

Pendiente del cliente, con su consecuencia:

- **P1** — Logotipo original: la vectorización actual es provisional y
  está etiquetada así en la barra de aviso.
- **P2** — Número comercial de WhatsApp: sin él, los enlaces no llevan
  destinatario.
- **P3** — Autorización escrita para publicar los vídeos: obligatoria
  antes de cualquier despliegue público.
- **P4** — Fotografías con licencia o propias: las actuales no están
  autorizadas para publicación.
- **P5** — Nombres finales de las subcategorías y productos restantes.
- **P6** — Textos finales de la portada.
- **P7** — Datos de contacto (dirección, correo, horario, redes): la
  página de contacto tiene espacio para ellos.
- **P8** — Dominio y hosting: el sitio permanece `noindex` hasta que
  existan.
- **P9** — Uso del nombre «Sheer Elegance»: es también marca de terceros
  en el mercado de persianas; el cliente debe confirmarlo.

## Notas para el cliente antes de publicar

- El vídeo `sheer-elegance-ventana` muestra carros estacionados fuera de
  la ventana: confirmar que eso es aceptable.
- La frase inicial de la galería de la portada es texto interno de la
  demostración; reemplazarla por el copy del cliente.
- Los chips de «Características» de las fichas son provisionales.
- Si un producto recibe una segunda imagen, revisar sus atributos de
  carga: el héroe usa carga anticipada y prioridad alta (`loading`
  `eager`, `fetchpriority` `high`). La galería solo admite vídeos: si se
  añade un medio que no es vídeo a la galería, el build se detiene con el
  error `product gallery: only video media supported` (comprobación en
  `src/pages/catalogo/[categoria]/[producto].astro`).
- Pulido diferido: enlaces directos en el pie hacia las dos fichas de
  producto, y un fondo azul marino de respaldo detrás de la imagen héroe
  de la portada.

## Publicación

No se ha hecho ningún despliegue. Antes de cualquier publicación hay que
resolver P3, P8 y P2. Nada se publica de forma automática desde este
repositorio: la publicación la realiza el propietario.
