// Austin permit data — ported from app.py's get_austin_data().
//
// Austin is a Socrata dataset (data.austintexas.gov, Building Permits
// 3syk-w9eu) with a single combined address field (original_address1),
// matched with a $where ... LIKE clause — the same simple pattern as
// Seattle/LA/NYC. What's different here is the description: app.py builds
// it by joining permit_type_desc, work_class, and description together
// with an em-dash separator, skipping any that are blank, rather than
// using a single source field.

import type { Permit } from "./minnetonka";

const AUSTIN_URL = "https://data.austintexas.gov/resource/3syk-w9eu.json";

interface AustinRecord {
  original_address1?: string;
  description?: string;
  issue_date?: string;
  permit_type?: string;
  permit_type_desc?: string;
  status_current?: string;
  permit_number?: string;
  work_class?: string;
}

export async function getAustinData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const addressPrefix = `${cleanNum} ${cleanStreet}`;

  try {
    const url = new URL(AUSTIN_URL);
    url.searchParams.set("$where", `original_address1 LIKE '${addressPrefix}%'`);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "issue_date DESC");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = (await r.json()) as AustinRecord[];
    if (!Array.isArray(data)) return [];

    return data.map((p) => {
      const descParts = [p.permit_type_desc || "", p.work_class || "", p.description || ""];
      const desc = descParts.filter((d) => d).join(" — ");
      return {
        description: desc,
        permit_creation_date: (p.issue_date || "").slice(0, 10),
        permit_type: p.permit_type_desc || p.permit_type || "",
        status: p.status_current || "",
        permit_number: String(p.permit_number || ""),
        work_type: "",
        contractor: "",
        valuation: "",
        address_display: p.original_address1 || "",
      };
    });
  } catch {
    return [];
  }
}
