// Shared fetch/match logic for LOGIS-sourced Minnesota cities (Minnetonka,
// Edina, Eden Prairie, St. Louis Park, Maple Grove). Each city's own lib
// file is a thin wrapper that points this at its permit JSON file(s) —
// keeps the address-matching logic in one place instead of duplicated 5x.
//
// Cloudflare Workers Static Assets caps individual files at 25 MiB, so
// larger cities (Minnetonka, St. Louis Park, Maple Grove) are split into
// several shard files by permit type rather than one giant file. Smaller
// cities (Edina, Eden Prairie) fit under the cap as a single file. Either
// way, callers just pass an array of one or more JSON paths.

export interface Permit {
  description: string;
  permit_creation_date: string;
  permit_type: string;
  status: string;
  permit_number: string;
  work_type: string;
  contractor: string;
  address_display: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const memoryCache: Record<string, Record<string, string>[]> = {};

async function loadRawRows(
  jsonPath: string,
  origin: string,
  assetsFetch?: Fetcher
): Promise<Record<string, string>[]> {
  if (memoryCache[jsonPath]) return memoryCache[jsonPath];
  const url = new URL(jsonPath, origin).toString();
  const doFetch = assetsFetch || fetch;
  const response = await doFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load permit data from ${jsonPath}: ${response.status}`);
  }
  const rows = (await response.json()) as Record<string, string>[];
  memoryCache[jsonPath] = rows;
  return rows;
}

export async function getLogisMnData(
  jsonPaths: string[],
  number: string,
  street: string,
  origin: string,
  assetsFetch?: Fetcher
): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();

  const shardResults = await Promise.all(
    jsonPaths.map((p) => loadRawRows(p, origin, assetsFetch))
  );
  const rows = shardResults.flat();

  const normalized: Permit[] = [];
  for (const row of rows) {
    const addr = (row["site_address"] || "").trim();
    const spaceIdx = addr.indexOf(" ");
    const rowNum = spaceIdx === -1 ? addr : addr.slice(0, spaceIdx);
    const rowStreet = spaceIdx === -1 ? "" : addr.slice(spaceIdx + 1);
    if (rowNum !== cleanNum) continue;
    if (cleanStreet && !rowStreet.toUpperCase().includes(cleanStreet)) continue;
    normalized.push({
      description: row["description"] || "",
      permit_creation_date: row["issued_date"] || "",
      permit_type: row["permit_type"] || "",
      status: "",
      permit_number: row["permit_number"] || "",
      work_type: row["work_type"] || "",
      contractor: row["contractor"] || "",
      address_display: addr,
    });
  }
  normalized.sort((a, b) => b.permit_creation_date.localeCompare(a.permit_creation_date));
  return normalized;
}
