// Kansas City permit data — ported from app.py's get_kansas_city_data().
//
// Kansas City is a Socrata dataset (data.kcmo.org, Permits - CPD Dataset
// ntw8-aacc) with a single combined address field (originaladdress1),
// matched with a $where ... LIKE clause — the same simple pattern as
// Seattle/LA/NYC/Dallas/Austin. Its description is built by joining
// description and workclassmapped with an em-dash separator, skipping
// blanks (similar idea to Austin's three-field join, just with two
// fields here). Note: per app.py's docstring, KCMO paused new permit
// data in March 2024 for server updates, but historic records
// (2010-2024) are still fully queryable through this same endpoint.

import type { Permit } from "./minnetonka";

const KANSAS_CITY_URL = "https://data.kcmo.org/resource/ntw8-aacc.json";

interface KansasCityRecord {
  originaladdress1?: string;
  description?: string;
  workclassmapped?: string;
  issueddate?: string;
  statuscurrent?: string;
  permitnum?: string;
  permittypedesc?: string;
  permittype?: string;
}

export async function getKansasCityData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const addressPrefix = `${cleanNum} ${cleanStreet}`;

  try {
    const url = new URL(KANSAS_CITY_URL);
    url.searchParams.set("$where", `originaladdress1 LIKE '${addressPrefix}%'`);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "issueddate DESC");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = (await r.json()) as KansasCityRecord[];
    if (!Array.isArray(data)) return [];

    return data.map((p) => {
      const descParts = [p.description || "", p.workclassmapped || ""];
      const desc = descParts.filter((d) => d).join(" — ");
      return {
        description: desc,
        permit_creation_date: (p.issueddate || "").slice(0, 10),
        permit_type: p.permittypedesc || p.permittype || "",
        status: p.statuscurrent || "",
        permit_number: String(p.permitnum || ""),
        work_type: "",
        contractor: "",
        valuation: "",
        address_display: p.originaladdress1 || "",
      };
    });
  } catch {
    return [];
  }
}
