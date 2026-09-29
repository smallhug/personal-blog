import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postsCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.string().or(z.date()).transform((val) => new Date(val)),
    tags: z.union([z.string(), z.array(z.string())]).transform((val) => {
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    }).default([]),
    status: z.string().default('PUBLISHED'),
    summary: z.string().optional().default(''),
    excerpt: z.string().optional(),
  }),
});

export const collections = {
  posts: postsCollection,
};
