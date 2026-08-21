// San Francisco permit data — ported from app.py's get_sf_data().
//
// Unlike LA/NYC (address matched server-side via a $where LIKE clause), SF's
// Socrata dataset is queried by an exact street_name match only, then the
// street number is filtered client-side afterward against street_number —
// this mirrors app.py exactly, which does the same substring check in
// Python after fetching everything on that street.

import type { Permit } from "./minnetonka";

const SF_SOCRATA_URL = "https://data.sfgov.org/resource/i98e-djp9.json";

// Python's str.title() title-cases each word ("mission" -> "Mission",
// "van ness" -> "Van Ness"); this reproduces that for the common case.
function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getSanFranciscoData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = toTitleCase(String(street).trim());

  try {
    const url = new URL(SF_SOCRATA_URL);
    url.searchParams.set("street_name", cleanStreet);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "permit_creation_date DESC");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = (await r.json()) as Record<string, string>[];
    if (!Array.isArray(data)) return [];

    // Client-side filter: keep only permits whose street_number contains the
    // requested house number as a substring — matches app.py's behavior of
    // fetching everything on the street and filtering in Python afterward.
    const raw = data.filter((p) => String(p["street_number"] || "").includes(cleanNum));

    return raw.map((p) => ({
      description: p["description"] || "",
      permit_creation_date: (p["permit_creation_date"] || "").slice(0, 10),
      permit_type: p["permit_type"] || "",
      status: p["status"] || "",
      permit_number: String(p["permit_number"] || ""),
      work_type: "",
      contractor: "",
      valuation: "",
      address_display: `${p["street_number"] || ""} ${p["street_name"] || ""}`.trim(),
    }));
  } catch {
    return [];
  }
}
