/**
 * Animación de aparición con IntersectionObserver: añade `is-visible` a
 * los elementos `[data-reveal]` una sola vez, tan pronto como cualquier
 * parte del elemento entra en el viewport (T11a/B1).
 * Con `prefers-reduced-motion` o sin soporte de IntersectionObserver,
 * todo queda visible de inmediato.
 */

function setUpReveal(): void {
  document.documentElement.classList.add('js');

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsObserver = 'IntersectionObserver' in window;

  if (reducedMotion || !supportsObserver) {
    for (const element of targets) {
      element.classList.add('is-visible');
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    /* T11a/B1: un umbral fraccional nunca se disparaba en secciones
       más altas que ~6.7x el viewport; se revela al entrar cualquier
       parte en pantalla, dejando un 10% inferior sin contar. */
    { threshold: 0, rootMargin: '0px 0px -10% 0px' },
  );

  for (const element of targets) {
    observer.observe(element);
  }
}

setUpReveal();
