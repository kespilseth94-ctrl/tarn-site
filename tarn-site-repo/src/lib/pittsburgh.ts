// Pittsburgh permit data — ported from app.py's get_pittsburgh_data().
//
// Pittsburgh is a WPRDC CKAN API (data.wprdc.org), dataset "PLI Permits",
// resource f4d1177a-f597-4c32-8cbf-7885f56253f6. Unlike every prior city's
// Socrata-style exact/LIKE match, this is a CKAN full-text search: the
// `q` param does a free-text search across ALL fields in the dataset (not
// just the address), then app.py filters the results down client-side to
// only records whose address starts with the house number.
//
// IMPORTANT DEVIATION FROM NOTHING — this quirk is preserved exactly, not
// fixed, per app.py fidelity (it degrades match quality in edge cases but
// doesn't make the feature completely non-functional like the Kansas City/
// New Orleans casing bugs did):
//   1. app.py only sends the FIRST WORD of the street name as the search
//      term (`clean_street.split()[0]`), not the full street name. For an
//      input like "North Highland Ave" that's just "NORTH".
//   2. The dataset stores directionals abbreviated (e.g. "N HIGHLAND AVE",
//      never "NORTH HIGHLAND AVE") — confirmed live. So a spelled-out
//      "North ..." input can literally never text-match the abbreviated
//      "N ..." dataset value, even though the address exists.
//   3. Because CKAN's `q` searches every field, a spelled-out directional
//      word can also incidentally match unrelated records via OTHER
//      fields (e.g. "1222 NORTH" spuriously matched a record in the
//      "Homewood North" neighborhood on an entirely different street) —
//      confirmed live. The only client-side filter app.py applies is
//      "does the address start with this house number", which does NOT
//      catch this class of false positive.
// Net effect: this search is weaker than every other ported city's, especially
// for addresses whose street name starts with a spelled-out directional
// word the dataset abbreviates. This mirrors app.py's actual behavior
// exactly (including its false-positive risk) rather than redesigning the
// matching logic beyond what the original app does.
//
// Also per app.py's note: since June 2024 building permits are recorded as
// "Building & Development Application" rather than "BUILDING", and
// plumbing permits are not included (Allegheny County Health Dept handles
// those separately, not the city).

import type { Permit } from "./minnetonka";

const PITTSBURGH_RESOURCE_ID = "f4d1177a-f597-4c32-8cbf-7885f56253f6";
const CKAN_BASE = "https://data.wprdc.org/api/3/action/datastore_search";

interface PittsburghRecord {
  address?: string;
  work_description?: string;
  work_type?: string;
  permit_type?: string;
  issue_date?: string;
  status?: string;
  permit_id?: string | number;
  neighborhood?: string;
}

export async function getPittsburghData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const firstWord = cleanStreet ? cleanStreet.split(" ")[0] : "";
  const searchTerm = cleanStreet ? `${cleanNum} ${firstWord}` : cleanNum;

  try {
    const url = new URL(CKAN_BASE);
    url.searchParams.set("resource_id", PITTSBURGH_RESOURCE_ID);
    url.searchParams.set("q", searchTerm);
    url.searchParams.set("limit", "500");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = await r.json();
    if (!data?.success || !data?.result?.records) return [];

    const records: PittsburghRecord[] = data.result.records;
    const filtered = records.filter((rec) =>
      String(rec.address || "").toUpperCase().startsWith(cleanNum + " ")
    );

    return filtered.map((p) => {
      const desc = p.work_description || p.work_type || "";
      return {
        description: desc,
        permit_creation_date: String(p.issue_date || "").slice(0, 10),
        permit_type: p.permit_type || "",
        status: p.status || "",
        permit_number: String(p.permit_id || ""),
        work_type: "",
        contractor: "",
        valuation: "",
        address_display: p.address || "",
      };
    });
  } catch {
    return [];
  }
}
