/**
 * Normaliza un número de WhatsApp: conserva solo los dígitos.
 * Devuelve los dígitos si su longitud está entre 8 y 15; en caso
 * contrario devuelve null. El número real nunca vive en el código:
 * llega por `PUBLIC_WHATSAPP_NUMBER` (consumido por `site.ts` en T2).
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const digits = raw.replace(/\D+/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export interface WhatsAppUrlOptions {
  number?: string | null;
  message: string;
}

/**
 * Construye la URL de WhatsApp: `https://wa.me/<dígitos>?text=<mensaje codificado>`.
 * Sin número válido devuelve la URL sin destinatario: `https://wa.me/?text=<codificado>`.
 */
export function buildWhatsAppUrl({ number, message }: WhatsAppUrlOptions): string {
  const encodedMessage = encodeURIComponent(message);
  const digits = normalizeWhatsAppNumber(number);
  if (digits === null) {
    return `https://wa.me/?text=${encodedMessage}`;
  }
  return `https://wa.me/${digits}?text=${encodedMessage}`;
}

export interface QuoteMessageOptions {
  item?: { name: string } | null;
  category?: { name: string } | null;
}

/** Mensaje de cotización para WhatsApp a partir del ítem y/o la categoría. */
export function quoteMessage({ item, category }: QuoteMessageOptions): string {
  if (item && category) {
    return `Hola Lumina Home, quisiera cotizar: ${item.name} (${category.name}).`;
  }
  if (item) {
    return `Hola Lumina Home, quisiera cotizar: ${item.name}.`;
  }
  if (category) {
    return `Hola Lumina Home, quisiera cotizar: ${category.name}.`;
  }
  return 'Hola Lumina Home, quisiera solicitar una cotización.';
}
