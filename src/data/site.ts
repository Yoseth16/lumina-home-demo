import { normalizeWhatsAppNumber } from '../lib/whatsapp';
import { normalizeSiteUrl } from '../lib/paths';

/**
 * Datos del sitio (demo comercial estática de Lumina Home).
 * El número de WhatsApp nunca vive en el código: llega por la variable de
 * entorno `PUBLIC_WHATSAPP_NUMBER` y se normaliza aquí. Los campos sin
 * confirmar (`email`, `address`, `siteUrl`) quedan sin definir y se ocultan
 * en la interfaz; nunca se inventa contenido. El sitio confirmado
 * (`siteUrl`, para el canonical y Open Graph absolutos) llega por
 * `PUBLIC_SITE_URL` y se normaliza con el mismo criterio.
 */
export interface Site {
  name: string;
  slogan: string;
  city: string;
  whatsappNumber: string | null;
  email?: string;
  address?: string;
  indexable: false;
  siteUrl?: string;
}

const rawNumber: unknown = import.meta.env.PUBLIC_WHATSAPP_NUMBER;

export const site: Site = {
  name: 'Lumina Home',
  slogan: 'El arte de transformar tus espacios',
  city: 'Cali, Colombia',
  whatsappNumber: normalizeWhatsAppNumber(typeof rawNumber === 'string' ? rawNumber : null),
  indexable: false,
  siteUrl: normalizeSiteUrl(import.meta.env.PUBLIC_SITE_URL),
};
