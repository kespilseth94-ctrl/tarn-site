// Cincinnati permit data — ported from app.py's get_cincinnati_data().
//
// Cincinnati is a Socrata open data portal (data.cincinnati-oh.gov), resource
// uhjb-xac9 ("Building Permits", CONFIRMED via CSV April 2026), using the
// same BLDS-standard field set seen on Seattle/Austin/Kansas City. The query
// is a `$where originaladdress1 LIKE '{number} {street_first_word}%'` clause
// (first-word-only, same pattern as Pittsburgh/Milwaukee) — but as a direct
// Socrata LIKE clause, not a CKAN full-text search, so this carries the
// Gotcha #5 case-sensitivity risk class rather than Gotcha #7's
// false-positive-via-other-fields risk. Live-verified: originaladdress1 is
// stored ALL CAPS (e.g. "3100 VANDERCAR WY"), matching app.py's own
// uppercase-then-LIKE approach with no case fix needed (unlike Kansas City
// and New Orleans, see ./kansas-city.ts).
//
// Description is built the same em-dash-join way as Kansas City/Austin:
// `description` + `workclassmapped`, skipping blanks.

import type { Permit } from "./minnetonka";

const CINCINNATI_BASE = "https://data.cincinnati-oh.gov/resource/uhjb-xac9.json";

interface CincinnatiRecord {
  originaladdress1?: string;
  description?: string;
  workclassmapped?: string;
  issueddate?: string;
  statuscurrent?: string;
  permittypemapped?: string;
  permittype?: string;
  permitnum?: string | number;
}

function normalize(records: CincinnatiRecord[]): Permit[] {
  return records.map((p) => {
    const descParts = [p.description || "", p.workclassmapped || ""];
    const desc = descParts.filter(Boolean).join(" — ");
    return {
      description: desc,
      permit_creation_date: String(p.issueddate || "").slice(0, 10),
      permit_type: p.permittypemapped || p.permittype || "",
      status: p.statuscurrent || "",
      permit_number: String(p.permitnum || ""),
      work_type: "",
      contractor: "",
      valuation: "",
      address_display: p.originaladdress1 || "",
    };
  });
}

export async function getCincinnatiData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const firstWord = cleanStreet ? cleanStreet.split(" ")[0] : "";
  const addressPrefix = cleanStreet ? `${cleanNum} ${firstWord}` : cleanNum;

  try {
    const url = new URL(CINCINNATI_BASE);
    url.searchParams.set("$where", `originaladdress1 LIKE '${addressPrefix}%'`);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "issueddate DESC");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return normalize(data as CincinnatiRecord[]);
  } catch {
    return [];
  }
}
