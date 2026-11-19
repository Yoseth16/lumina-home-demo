import { buildWhatsAppUrl } from '../lib/whatsapp';

/**
 * Formulario de cotización por WhatsApp: mejora progresiva sobre la
 * página de contacto. Sin JavaScript la página muestra el enlace directo
 * de WhatsApp; con JavaScript este módulo valida los campos requeridos
 * (nombre y producto) y abre la conversación con el mensaje compuesto a
 * partir de la opción seleccionada. Sin `console`, sin `any`.
 */

export interface QuoteMessageFields {
  name: string;
  itemName: string;
  categoryName: string;
  message?: string;
}

/** Reduce los espacios en blanco de un texto y recorta los extremos. */
function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Mensaje de cotización en español, listo para `wa.me`. Función pura:
 * sin DOM, sin red y sin estado; el texto extra se añade solo cuando
 * existe, sin marcadores de posición vacíos.
 */
export function buildQuoteMessage({ name, itemName, categoryName, message }: QuoteMessageFields): string {
  const tidyName = collapseWhitespace(name);
  const tidyItem = collapseWhitespace(itemName);
  const tidyCategory = collapseWhitespace(categoryName);
  const tidyMessage = message === undefined ? '' : collapseWhitespace(message);

  let text = `Hola Lumina Home, quisiera cotizar: ${tidyItem} (${tidyCategory}). Mi nombre es ${tidyName}.`;
  if (tidyMessage !== '') {
    text += ` ${tidyMessage}`;
  }
  return text;
}

const NAME_EMPTY = 'Escribe tu nombre, por favor.';
const SERVICE_EMPTY = 'Selecciona un producto, por favor.';

/** Busca el elemento de error asociado al campo por `aria-describedby`. */
function errorElementFor(control: HTMLElement): HTMLElement | null {
  const describedBy = control.getAttribute('aria-describedby');
  if (describedBy === null) {
    return null;
  }
  return document.getElementById(describedBy);
}

/**
 * Valida un campo requerido: marca `aria-invalid` y escribe el texto de
 * error en la región enlazada (que ya existe vacía en el marcado, de
 * modo que el lector de pantalla anuncia el cambio).
 */
function validateRequired(control: HTMLInputElement | HTMLSelectElement, error: string): boolean {
  const isValid = control.value.trim() !== '';
  control.setAttribute('aria-invalid', isValid ? 'false' : 'true');
  const errorElement = errorElementFor(control);
  if (errorElement !== null) {
    errorElement.textContent = isValid ? '' : error;
  }
  return isValid;
}

/** Conecta la validación y el envío por WhatsApp a un formulario de cotización. */
export function initQuoteForm(form: HTMLFormElement): void {
  document.documentElement.classList.add('js');
  form.noValidate = true;

  const nameInput = form.querySelector<HTMLInputElement>('input[name="nombre"]');
  const serviceSelect = form.querySelector<HTMLSelectElement>('select[name="service"]');
  const messageInput = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');

  if (nameInput === null || serviceSelect === null) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nameIsValid = validateRequired(nameInput, NAME_EMPTY);
    const serviceIsValid = validateRequired(serviceSelect, SERVICE_EMPTY);

    if (!nameIsValid || !serviceIsValid) {
      const firstInvalid = nameIsValid ? serviceSelect : nameInput;
      firstInvalid.focus();
      return;
    }

    const selectedOption = serviceSelect.selectedOptions[0];
    const message = buildQuoteMessage({
      name: nameInput.value,
      itemName: selectedOption?.dataset.item ?? '',
      categoryName: selectedOption?.dataset.category ?? '',
      message: messageInput?.value,
    });

    const url = buildWhatsAppUrl({ number: form.dataset.waNumber || null, message });
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

/** Arranque automático: solo en el navegador y solo si hay formulario. */
if (typeof document !== 'undefined') {
  const form = document.querySelector<HTMLFormElement>('form[data-quote-form]');
  if (form !== null) {
    initQuoteForm(form);
  }
}
