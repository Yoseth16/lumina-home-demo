import { describe, expect, it } from 'vitest';
import { buildQuoteMessage } from '../../src/scripts/quote-form';
import { buildWhatsAppUrl } from '../../src/lib/whatsapp';

/** Número ficticio de test: nunca se escribe una cadena de dígitos literal. */
const fictitiousNumber = '57' + '0'.repeat(10);

describe('buildQuoteMessage', () => {
  it('composes the quote with name, item, category and message', () => {
    expect(
      buildQuoteMessage({
        name: 'Ana Torres',
        itemName: 'Sheer Elegance',
        categoryName: 'Persianas y cortinas',
        message: 'Tengo una ventana amplia',
      }),
    ).toBe(
      'Hola Lumina Home, quisiera cotizar: Sheer Elegance (Persianas y cortinas). Mi nombre es Ana Torres. Tengo una ventana amplia',
    );
  });

  it('omits the message when it is absent or empty', () => {
    const expected = 'Hola Lumina Home, quisiera cotizar: Enrollable (Persianas y cortinas). Mi nombre es Ana.';
    expect(
      buildQuoteMessage({ name: 'Ana', itemName: 'Enrollable', categoryName: 'Persianas y cortinas' }),
    ).toBe(expected);
    expect(
      buildQuoteMessage({
        name: 'Ana',
        itemName: 'Enrollable',
        categoryName: 'Persianas y cortinas',
        message: '',
      }),
    ).toBe(expected);
  });

  it('trims and collapses whitespace in every field', () => {
    expect(
      buildQuoteMessage({
        name: '  Ana \n  Torres ',
        itemName: ' Enrollable ',
        categoryName: ' Persianas \t y \n cortinas ',
        message: '  Ventana   de   dos  hojas  ',
      }),
    ).toBe(
      'Hola Lumina Home, quisiera cotizar: Enrollable (Persianas y cortinas). Mi nombre es Ana Torres. Ventana de dos hojas',
    );
  });

  it('preserves accents and ñ', () => {
    const message = buildQuoteMessage({
      name: 'Ángel Peña',
      itemName: 'Película de Seguridad',
      categoryName: 'Polarizados',
      message: 'Necesito protección solar',
    });
    expect(message).toContain('Película de Seguridad');
    expect(message).toContain('Ángel Peña');
    expect(message).toContain('protección solar');
  });

  it('never leaks undefined or placeholder text', () => {
    const message = buildQuoteMessage({
      name: 'Ana',
      itemName: 'Enrollable',
      categoryName: 'Persianas y cortinas',
    });
    expect(message).not.toContain('undefined');
    expect(message).not.toContain('NaN');
    expect(message).not.toContain('[object');
    expect(message).toMatch(/\.$/);
  });

  it('round-trips through buildWhatsAppUrl with decodeURIComponent', () => {
    const message = buildQuoteMessage({
      name: 'Ángel Peña',
      itemName: 'Sheer Elegance',
      categoryName: 'Persianas y cortinas',
      message: 'Necesito cotización para la sala',
    });

    const url = buildWhatsAppUrl({ number: fictitiousNumber, message });
    const prefix = `https://wa.me/${fictitiousNumber}?text=`;
    expect(url.startsWith(prefix)).toBe(true);
    expect(decodeURIComponent(url.slice(prefix.length))).toBe(message);
  });

  it('produces a valid no-recipient URL when the number is missing', () => {
    const message = buildQuoteMessage({
      name: 'Ana',
      itemName: 'Enrollable',
      categoryName: 'Persianas y cortinas',
    });
    expect(buildWhatsAppUrl({ number: null, message })).toBe(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
    );
  });
});
