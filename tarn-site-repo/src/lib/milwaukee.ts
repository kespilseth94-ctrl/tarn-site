// Milwaukee permit data — ported from app.py's get_milwaukee_data().
//
// Milwaukee is a CKAN open data portal (data.milwaukee.gov), resource
// 828e9630-d7cb-42e4-960e-964eae916397 ("Building Permits", updated
// monthly, CONFIRMED via CSV April 2026). app.py tries two different CKAN
// query shapes in sequence:
//
//   1. PRIMARY: a `datastore_search` full-text search (`q` param) on
//      "{number} {first word of street}" (the same first-word-only pattern
//      already seen on Pittsburgh/Cincinnati), then filters the results
//      client-side to records whose Address starts with "{number} ". This
//      is still a CKAN full-text `q` search under the hood, so it carries
//      the same false-positive risk documented on the Pittsburgh port
//      (see ./pittsburgh.ts) — a search term can match unrelated records
//      through other fields, not just the address.
//   2. FALLBACK (only tried if step 1 throws, or returns zero records
//      after the client-side filter): a `filters` param requesting an
//      EXACT match on the FULL address "{number} {full street, uppercased}"
//      — no LIKE/prefix matching at all here, so this only succeeds if the
//      input's street spelling exactly matches the dataset's stored form
//      (e.g. "AVE" vs the dataset's actual "AV" would NOT match here).
//
// Field names in this dataset are PascalCase-with-spaces (unusual for a
// CKAN portal, confirmed live): Address, Record ID, Permit Type, Status,
// Date Issued, Date Opened, Use of Building (maps to description).

import type { Permit } from "./minnetonka";

const RESOURCE_ID = "828e9630-d7cb-42e4-960e-964eae916397";
const CKAN_BASE = "https://data.milwaukee.gov/api/3/action/datastore_search";

interface MilwaukeeRecord {
  Address?: string;
  "Record ID"?: string | number;
  "Permit Type"?: string;
  Status?: string;
  "Date Issued"?: string;
  "Date Opened"?: string;
  "Use of Building"?: string;
}

function normalize(records: MilwaukeeRecord[]): Permit[] {
  return records.map((p) => {
    const rawDate = p["Date Issued"] || p["Date Opened"] || "";
    return {
      description: p["Use of Building"] || "",
      permit_creation_date: String(rawDate).slice(0, 10),
      permit_type: p["Permit Type"] || "",
      status: p.Status || "",
      permit_number: String(p["Record ID"] || ""),
      work_type: "",
      contractor: "",
      valuation: "",
      address_display: p.Address || "",
    };
  });
}

export async function getMilwaukeeData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const firstWord = cleanStreet ? cleanStreet.split(" ")[0] : "";
  const addressPrefix = cleanStreet ? `${cleanNum} ${firstWord}` : cleanNum;

  try {
    const url = new URL(CKAN_BASE);
    url.searchParams.set("resource_id", RESOURCE_ID);
    url.searchParams.set("q", addressPrefix);
    url.searchParams.set("limit", "500");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    if (data?.success && data?.result?.records?.length) {
      const records: MilwaukeeRecord[] = data.result.records.filter((rec: MilwaukeeRecord) =>
        String(rec.Address || "").toUpperCase().startsWith(`${cleanNum} `)
      );
      const normalized = normalize(records);
      if (normalized.length) return normalized;
    }
  } catch {
    // fall through to the exact-match fallback
  }

  try {
    const url = new URL(CKAN_BASE);
    url.searchParams.set("resource_id", RESOURCE_ID);
    url.searchParams.set("filters", JSON.stringify({ Address: `${cleanNum} ${cleanStreet}` }));
    url.searchParams.set("limit", "500");
    const r2 = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data2 = await r2.json();
    if (data2?.success && data2?.result?.records?.length) {
      return normalize(data2.result.records);
    }
  } catch {
    // both attempts failed
  }

  return [];
}
