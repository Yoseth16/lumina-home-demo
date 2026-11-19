import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl, normalizeWhatsAppNumber, quoteMessage } from '../../src/lib/whatsapp';

/** Número ficticio de test: nunca se escribe una cadena de dígitos literal. */
const fictitiousNumber = '57' + '0'.repeat(10);

describe('normalizeWhatsAppNumber', () => {
  it('returns null for null, undefined and empty input', () => {
    expect(normalizeWhatsAppNumber(null)).toBeNull();
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
    expect(normalizeWhatsAppNumber('')).toBeNull();
  });

  it('accepts a valid fictitious number', () => {
    expect(normalizeWhatsAppNumber(fictitiousNumber)).toBe(fictitiousNumber);
  });

  it('strips plus signs, spaces, parentheses and hyphens', () => {
    const formatted = `+${fictitiousNumber.slice(0, 2)} (${fictitiousNumber.slice(2, 5)}) ${fictitiousNumber.slice(5, 8)}-${fictitiousNumber.slice(8)}`;
    expect(normalizeWhatsAppNumber(formatted)).toBe(fictitiousNumber);
  });

  it('rejects numbers outside the 8–15 digit range and accepts the boundaries', () => {
    expect(normalizeWhatsAppNumber('0'.repeat(7))).toBeNull();
    expect(normalizeWhatsAppNumber('0'.repeat(16))).toBeNull();
    expect(normalizeWhatsAppNumber('0'.repeat(8))).toBe('0'.repeat(8));
    expect(normalizeWhatsAppNumber('0'.repeat(15))).toBe('0'.repeat(15));
  });
});

describe('buildWhatsAppUrl', () => {
  it('returns a no-recipient URL for null, undefined and empty numbers', () => {
    expect(buildWhatsAppUrl({ number: null, message: 'Hola' })).toBe('https://wa.me/?text=Hola');
    expect(buildWhatsAppUrl({ number: undefined, message: 'Hola' })).toBe('https://wa.me/?text=Hola');
    expect(buildWhatsAppUrl({ number: '', message: 'Hola' })).toBe('https://wa.me/?text=Hola');
  });

  it('returns a recipient URL for a valid fictitious number', () => {
    expect(buildWhatsAppUrl({ number: fictitiousNumber, message: 'Hola' })).toBe(
      `https://wa.me/${fictitiousNumber}?text=Hola`,
    );
  });

  it('normalises formatted numbers into the URL', () => {
    const formatted = `+${fictitiousNumber.slice(0, 2)} ${fictitiousNumber.slice(2)}`;
    expect(buildWhatsAppUrl({ number: formatted, message: 'Hola' })).toBe(
      `https://wa.me/${fictitiousNumber}?text=Hola`,
    );
  });

  it('encodes accents, ñ, ampersand, question mark, hash and spaces, and round-trips', () => {
    const message = 'Cotización de Película de Seguridad & Cortina Hannas — ¿diseño? #persianas';
    const url = buildWhatsAppUrl({ number: fictitiousNumber, message });

    const prefix = `https://wa.me/${fictitiousNumber}?text=`;
    expect(url.startsWith(prefix)).toBe(true);

    const rawParam = url.slice(prefix.length);
    expect(rawParam).not.toMatch(/[\s&#?]/);
    expect(rawParam).not.toMatch(/[áéíóúñ]/);
    expect(decodeURIComponent(rawParam)).toBe(message);
  });
});

describe('quoteMessage', () => {
  it('quotes an item within its category', () => {
    expect(quoteMessage({ item: { name: 'Sheer Elegance' }, category: { name: 'Persianas y cortinas' } })).toBe(
      'Hola Lumina Home, quisiera cotizar: Sheer Elegance (Persianas y cortinas).',
    );
  });

  it('quotes a category on its own', () => {
    expect(quoteMessage({ category: { name: 'Polarizados' } })).toBe(
      'Hola Lumina Home, quisiera cotizar: Polarizados.',
    );
  });

  it('falls back to a generic quote request', () => {
    expect(quoteMessage({})).toBe('Hola Lumina Home, quisiera solicitar una cotización.');
  });
});
