import type { APIRoute } from 'astro';
import { getMinnetonkaData } from '../lib/minnetonka';
import { analyzeHistory } from '../lib/risk-engine';
import { getGeocode, getFemaFloodZone, getUsgsSeismicZone, getRadonZone } from '../lib/environmental';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const number = url.searchParams.get('number') || '3030';
  const street = url.searchParams.get('street') || 'St Albans Mill Rd';
  const result: any = { steps: [] };
  try {
    result.steps.push('start origin=' + url.origin);
    const permits = await getMinnetonkaData(number, street, url.origin);
    result.steps.push('permits:' + permits.length);
    const analysis = analyzeHistory(permits, 'Minnetonka, MN', null);
    result.steps.push('analysis:' + analysis.findings.length);
    const fullAddress = number + ' ' + street + ', Minnetonka, MN';
    const geo = await getGeocode(fullAddress);
    result.steps.push('geo:' + JSON.stringify(geo));
    if (geo.lat && geo.lon) {
      const flood = await getFemaFloodZone(geo.lat, geo.lon);
      result.steps.push('flood:' + JSON.stringify(flood));
      const seismic = await getUsgsSeismicZone(geo.lat, geo.lon);
      result.steps.push('seismic:' + JSON.stringify(seismic));
    }
    const radonZone = getRadonZone(geo.countyFips);
    result.steps.push('radon:' + radonZone);
    result.ok = true;
  } catch (e: any) {
    result.ok = false;
    result.error = e instanceof Error ? (e.stack || e.message) : String(e);
  }
  return new Response(JSON.stringify(result, null, 2), { headers: { 'content-type': 'application/json' } });
};
