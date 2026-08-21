export interface Permit {
  description: string;
  permit_creation_date: string;
  permit_type: string;
  status: string;
  permit_number: string;
  work_type: string;
  contractor: string;
  valuation: string;
  address_display: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let memoryCache: Record<string, string>[] | null = null;

async function loadRawRows(origin: string, assetsFetch?: Fetcher): Promise<Record<string, string>[]> {
  if (memoryCache) return memoryCache;
  const url = new URL("/data/minnetonka-permits.json", origin).toString();
  const doFetch = assetsFetch || fetch;
  const response = await doFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load Minnetonka permit data: ${response.status}`);
  }
  memoryCache = (await response.json()) as Record<string, string>[];
  return memoryCache;
}

export async function getMinnetonkaData(
  number: string,
  street: string,
  origin: string,
  assetsFetch?: Fetcher
): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const rows = await loadRawRows(origin, assetsFetch);
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
      permit_type: row["sub_type"] || "",
      status: "",
      permit_number: row["permit_number"] || "",
      work_type: row["work_type"] || "",
      contractor: row["contractor"] || "",
      valuation: row["valuation"] || "",
      address_display: addr,
    });
  }
  normalized.sort((a, b) => b.permit_creation_date.localeCompare(a.permit_creation_date));
  return normalized;
}
