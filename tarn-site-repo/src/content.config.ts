import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const cities = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/cities' }),
  schema: z.object({
    city: z.string(),
    state: z.string(),
    slug: z.string(),
    // Exact key in the app's CITIES config, e.g. "Minnetonka, MN".
    // Used to prefill the city selector / drive server-side lookups.
    appCityKey: z.string(),
    metroArea: z.string().optional(),
    dataDepth: z.enum(['deep', 'standard']),
    dataSource: z.string(),
    permitCount: z.number().optional(),
    coverage: z.array(
      z.object({
        type: z.string(),
        since: z.string(),
      })
    ),
    population: z.string().optional(),
    summary: z.string(),
    notes: z.array(z.string()).optional(),
  }),
});

export const collections = { cities };
