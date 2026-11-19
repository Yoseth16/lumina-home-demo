/**
 * Animación de aparición con IntersectionObserver: añade `is-visible` a
 * los elementos `[data-reveal]` una sola vez al entrar en pantalla.
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
    { threshold: 0.15 },
  );

  for (const element of targets) {
    observer.observe(element);
  }
}

setUpReveal();
