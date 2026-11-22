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

const zipStats = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/zip-stats' }),
  schema: z.object({
    citySlug: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    permitCount: z.number(),
    distinctAddresses: z.number(),
    earliestPermitYear: z.number().nullable(),
    latestPermitYear: z.number().nullable(),
    pctSinceYear: z.number(),
    sinceYear: z.number(),
    topWorkTypes: z.array(
      z.object({
        workType: z.string(),
        count: z.number(),
      })
    ),
    // Residential parcels with a recorded year built, bucketed by construction era.
    eraMix: z
      .object({
        knownParcels: z.number(),
        pre1950: z.number(),
        y1950_64: z.number(),
        y1965_73: z.number(),
        y1974_77: z.number(),
        y1978_95: z.number(),
        y1996plus: z.number(),
      })
      .optional(),
  }),
});

export const collections = { cities, zipStats };
