/**
 * Menú de navegación móvil: script autónomo, sin frameworks.
 * Añade la clase `js` a <html>, alterna `aria-expanded` en el botón y el
 * estado abierto del menú; `Escape` cierra y devuelve el foco al botón.
 */

function setUpMenu(): void {
  document.documentElement.classList.add('js');

  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const nav = document.getElementById('nav-principal');

  if (toggle === null || nav === null) {
    return;
  }

  const isOpen = (): boolean => nav.classList.contains('is-open');

  const openMenu = (): void => {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  };

  const closeMenu = (returnFocus: boolean): void => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    if (isOpen()) {
      closeMenu(false);
    } else {
      openMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      closeMenu(true);
    }
  });

  nav.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a') !== null) {
      closeMenu(false);
    }
  });
}

setUpMenu();
