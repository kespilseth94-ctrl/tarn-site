// Seattle permit data — ported from app.py's get_seattle_data().
//
// Seattle (like LA and NYC) is a Socrata dataset (data.seattle.gov, Building
// Permits 76t5-zqzr) with a single combined address field, matched with a
// $where ... LIKE clause against the house-number + street prefix — the
// simplest of the address-matching patterns seen so far, closer to LA/NYC
// than to Chicago's split fields or San Francisco's street-only match.

import type { Permit } from "./minnetonka";

const SEATTLE_URL = "https://data.seattle.gov/resource/76t5-zqzr.json";

interface SeattleRecord {
  description?: string;
  issueddate?: string;
  permittypemapped?: string;
  statuscurrent?: string;
  permitnum?: string;
  permitclassmapped?: string;
  originaladdress1?: string;
}

export async function getSeattleData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const addressPrefix = `${cleanNum} ${cleanStreet}`;

  try {
    const url = new URL(SEATTLE_URL);
    url.searchParams.set("$where", `originaladdress1 LIKE '${addressPrefix}%'`);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "issueddate DESC");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = (await r.json()) as SeattleRecord[];
    if (!Array.isArray(data)) return [];

    return data.map((p) => ({
      description: p.description || "",
      permit_creation_date: (p.issueddate || "").slice(0, 10),
      permit_type: p.permittypemapped || "",
      status: p.statuscurrent || "",
      permit_number: String(p.permitnum || ""),
      work_type: p.permitclassmapped || "",
      contractor: "",
      valuation: "",
      address_display: p.originaladdress1 || "",
    }));
  } catch {
    return [];
  }
}
