import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { readdirSync, readFileSync } from 'node:fs';
import { MIN_ADDRESSES_TO_INDEX } from './src/lib/zip-index-threshold.mjs';

// ZIP pages below the address threshold are noindexed, so keep them out of the sitemap too.
const zipDir = new URL('./src/content/zip-stats/', import.meta.url);
const noindexPaths = new Set(
  readdirSync(zipDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(f, zipDir), 'utf8')))
    .filter((z) => z.distinctAddresses < MIN_ADDRESSES_TO_INDEX)
    .map((z) => `/cities/${z.citySlug}/${z.zip}/`)
);

export default defineConfig({
  site: 'https://tarnhome.com',
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: { enabled: true },
  }),
  integrations: [
    sitemap({
      filter: (page) => !noindexPaths.has(new URL(page).pathname),
    }),
  ],
});
