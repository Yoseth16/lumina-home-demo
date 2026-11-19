import { z } from 'zod';

/** Slug válido para URLs: minúsculas, dígitos y guiones; sin guiones al inicio, al final ni repetidos. */
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const ItemSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  status: z.enum(['ficha', 'pendiente']),
  group: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  media: z.array(z.string()).optional(),
  copyStatus: z.enum(['provisional', 'confirmado']),
});

export const CategorySchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().min(1),
  summary: z.string().optional(),
  heroMedia: z.string().optional(),
  items: z.array(ItemSchema).min(1),
});

export const MediaEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['image', 'video']),
  file: z.string().optional(),
  poster: z.string().optional(),
  alt: z.string().min(1),
  license: z.enum(['propio-autorizado', 'licencia-comercial', 'provisional']),
  source: z.string().optional(),
  credit: z.string().optional(),
  publishAuthorized: z.boolean(),
});

export type Slug = z.infer<typeof slugSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type MediaEntry = z.infer<typeof MediaEntrySchema>;
