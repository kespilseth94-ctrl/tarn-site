// Environmental & hazard data layer — ported from app.py.
// All sources: US federal government public domain data, no API key required.

export interface FloodData {
  zone: string;
  sfha: boolean;
  description: string;
  bfeFt: number | null;
  firmCitation: string;
}

export interface Geocode {
  lat: number | null;
  lon: number | null;
  countyFips: string | null;
}

// EPA Map of Radon Zones (epa.gov/radon), public domain federal data.
// Zone 1 = highest potential (>4 pCi/L), Zone 2 = moderate, Zone 3 = low.
// Only the Tarn launch-market counties are hardcoded; matches app.py.
const EPA_RADON_ZONES: Record<string, number> = {
  // Minnesota — Twin Cities metro (all Zone 1)
  "27003": 1, "27019": 1, "27025": 1, "27037": 1, "27053": 1,
  "27059": 1, "27079": 1, "27123": 1, "27139": 1, "27163": 1,
  "27171": 1,
  // Illinois — Cook County (Chicago)
  "17031": 2,
  // Texas — Travis County (Austin), Dallas County
  "48453": 2, "48113": 2,
  // Washington — King County (Seattle)
  "53033": 2,
  // California — LA County, SF County
  "06037": 3, "06075": 3,
  // Pennsylvania — Philadelphia, Allegheny (Pittsburgh)
  "42101": 2, "42003": 2,
  // Maryland — Baltimore City/County
  "24510": 2, "24005": 2,
  // Missouri — Jackson County (Kansas City)
  "29095": 2,
  // Louisiana — Orleans Parish (New Orleans)
  "22071": 3,
  // Wisconsin — Milwaukee County
  "55079": 2,
  // New York — NYC boroughs (all Zone 2)
  "36005": 2, "36047": 2, "36061": 2, "36081": 2, "36085": 2,
};

export const RADON_ZONE_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: "HIGH", desc: "EPA Zone 1 — High radon potential (>4 pCi/L likely). Testing strongly recommended." },
  2: { label: "MEDIUM", desc: "EPA Zone 2 — Moderate radon potential. Testing recommended." },
  3: { label: "LOW", desc: "EPA Zone 3 — Low radon potential. Testing still advisable." },
};

export async function getGeocode(addressStr: string): Promise<Geocode> {
  try {
    const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
    url.searchParams.set("address", addressStr);
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("format", "json");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data: any = await r.json();
    const matches = data?.result?.addressMatches || [];
    if (!matches.length) return { lat: null, lon: null, countyFips: null };
    const coords = matches[0].coordinates;
    let fips: string | null = null;
    try {
      const counties = matches[0]?.geographies?.Counties || [];
      if (counties.length) fips = counties[0].GEOID ?? null;
    } catch {
      /* ignore */
    }
    return { lat: parseFloat(coords.y), lon: parseFloat(coords.x), countyFips: fips };
  } catch {
    return { lat: null, lon: null, countyFips: null };
  }
}

const FLOOD_ZONE_DESCRIPTIONS: Record<string, string> = {
  AE: "High Risk — 1% annual flood chance, base flood elevations determined",
  A: "High Risk — 1% annual flood chance, no base flood elevations",
  AO: "High Risk — shallow flooding (1–3 ft), sheet-flow areas",
  AH: "High Risk — shallow flooding with base flood elevations",
  VE: "High Risk Coastal — 1% annual chance with wave action",
  V: "High Risk Coastal — wave action, no base flood elevations",
  X: "Minimal/Moderate Risk — outside 1% annual chance flood area",
  D: "Undetermined Risk — area not studied",
};

export async function getFemaFloodZone(lat: number, lon: number): Promise<FloodData | null> {
  try {
    const url = new URL(
      "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"
    );
    url.searchParams.set("geometry", `${lon},${lat}`);
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("outFields", "FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,SOURCE_CIT");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data: any = await r.json();
    const features = data?.features || [];
    if (!features.length) return null;
    const attrs = features[0].attributes;
    const zone = String(attrs.FLD_ZONE || "").trim();
    const sfha = String(attrs.SFHA_TF || "").toUpperCase() === "T";
    const subtype = String(attrs.ZONE_SUBTY || "").trim();
    const bfe = attrs.STATIC_BFE;

    let desc = FLOOD_ZONE_DESCRIPTIONS[zone] || `Zone ${zone}`;
    if (subtype) desc += ` (${subtype})`;

    return {
      zone,
      sfha,
      description: desc,
      bfeFt: bfe && bfe !== -9999 ? parseFloat(bfe) : null,
      firmCitation: String(attrs.SOURCE_CIT || ""),
    };
  } catch {
    return null;
  }
}

export async function getUsgsSeismicZone(lat: number, lon: number): Promise<string | null> {
  try {
    const url = new URL("https://earthquake.usgs.gov/ws/designmaps/asce7-22.json");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("riskCategory", "II");
    url.searchParams.set("siteClass", "D");
    url.searchParams.set("title", "Tarn");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data: any = await r.json();
    const sdc = data?.response?.data?.sdc;
    return sdc ? String(sdc).toUpperCase() : null;
  } catch {
    return null;
  }
}

export function getRadonZone(countyFips: string | null): number | null {
  if (!countyFips) return null;
  const fips = String(countyFips).padStart(5, "0").slice(0, 5);
  return EPA_RADON_ZONES[fips] ?? null;
}
