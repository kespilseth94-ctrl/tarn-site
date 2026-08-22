// Shared ArcGIS FeatureServer field-discovery helper — ported from app.py's
// _arcgis_self_heal(). Used by every ArcGIS-backed city that doesn't hardcode
// its own field names: Baltimore, Nashville, Cleveland, Denver, Detroit, and
// Miami. Each of those is a thin wrapper that just supplies its own list of
// candidate endpoints (tried in order until one produces usable fields).
//
// Strategy (mirrors app.py exactly):
//   1. For each endpoint, fetch ONE sample record (where=1=1, outFields=*)
//      and inspect its attribute keys.
//   2. Guess which field is address / description / date / status /
//      permit-type / permit-number by case-insensitive keyword matching,
//      with exclusion keywords to dodge false positives (e.g. a field
//      containing "NUMBER" should not be picked as the address field).
//   3. If no address field is found, skip this endpoint and try the next.
//   4. Build a `where` clause against the discovered address field using
//      the house number plus ONLY THE FIRST WORD of the street name —
//      the same pattern already seen in Pittsburgh/Cincinnati/Milwaukee.
//      This can under-match on multi-word street names, but it's exactly
//      what app.py does, so it's preserved here rather than "fixed".
//   5. Fetch up to 2000 matching records and normalize them.
//   6. If a date value looks like a Unix-millisecond timestamp (a number
//      greater than 1e10), convert it to YYYY-MM-DD (UTC); otherwise the
//      raw value is just string-sliced to its first 10 characters (which is
//      already YYYY-MM-DD for a typical ArcGIS ISO date string).
//   7. Any network/parse error on an endpoint moves on to the next one; if
//      every endpoint fails, [] is returned (matching app.py's behavior of
//      showing a "could not be reached" info message and no results).
//
// One deliberate, documented divergence from app.py: when a date field is
// present in the schema but its value is JSON null, Python's
// `str(a.get(date_f, "") if date_f else "")` degrades to the literal text
// "None" (since dict.get returns None for a present-but-null key, and
// str(None) == "None"). That's an incidental bug in app.py, not a
// meaningful data-shape quirk worth reproducing — this port simply falls
// back to an empty string in that case, so a null date renders as blank
// rather than the word "None".

import type { Permit } from "./minnetonka";

function findField(fields: string[], keywords: string[], exclude: string[] = []): string | null {
  const kws = keywords.map((k) => k.toUpperCase());
  const exc = exclude.map((e) => e.toUpperCase());
  for (const f of fields) {
    const upper = f.toUpperCase();
    if (kws.some((k) => upper.includes(k)) && !exc.some((e) => upper.includes(e))) {
      return f;
    }
  }
  return null;
}

export async function arcgisSelfHeal(
  endpoints: string[],
  cleanNum: string,
  cleanStreet: string
): Promise<Permit[]> {
  for (const endpoint of endpoints) {
    try {
      const testUrl = new URL(endpoint);
      testUrl.searchParams.set("where", "1=1");
      testUrl.searchParams.set("outFields", "*");
      testUrl.searchParams.set("resultRecordCount", "1");
      testUrl.searchParams.set("f", "json");
      const testRes = await fetch(testUrl.toString(), { signal: AbortSignal.timeout(8000) });
      const sample = await testRes.json();
      if (!sample?.features || sample?.error) continue;

      const attrs: Record<string, unknown> = sample.features[0]?.attributes || {};
      const fields = Object.keys(attrs);
      if (fields.length === 0) continue;

      const addrF = findField(fields, ["ADDRESS", "ADDR", "LOCATION", "SITE"], ["NUMBER", "NUM", "URL"]);
      const descF = findField(fields, ["DESC", "WORK", "SCOPE", "JOB", "NOTES"]);
      const dateF = findField(fields, ["ISSUE", "ISSUED"], ["EXPIRE"]) || findField(fields, ["DATE"]);
      const statF = findField(fields, ["STATUS"]);
      const numF = findField(fields, ["CASENUMBER", "PERMIT_N", "PERMIT_NO", "PERMITNO", "PERMIT_NUM", "PROCESS_N", "APP_NO", "RECORD"]);
      const typeF = findField(fields, ["PERMIT_TYPE", "PERMITTYPE", "TYPE", "CATEGORY"], ["SUBTYPE", "SUB_TYPE"]);

      if (!addrF) continue;

      const firstWord = cleanStreet ? cleanStreet.split(" ")[0] : "";
      const where = cleanStreet
        ? `${addrF} LIKE '${cleanNum} ${firstWord}%'`
        : `${addrF} LIKE '${cleanNum}%'`;

      const queryUrl = new URL(endpoint);
      queryUrl.searchParams.set("where", where);
      queryUrl.searchParams.set("outFields", "*");
      queryUrl.searchParams.set("resultRecordCount", "2000");
      if (dateF) queryUrl.searchParams.set("orderByFields", `${dateF} DESC`);
      queryUrl.searchParams.set("f", "json");

      const r = await fetch(queryUrl.toString(), { signal: AbortSignal.timeout(10000) });
      const data = await r.json();
      const features: Array<{ attributes?: Record<string, unknown> }> = data?.features || [];

      return features.map((feat) => {
        const a = feat.attributes || {};
        let dv: unknown = dateF ? a[dateF] : "";
        if (typeof dv === "number" && dv > 1e10) {
          try {
            dv = new Date(dv).toISOString().slice(0, 10);
          } catch {
            dv = "";
          }
        }
        const dateOut = dv === null || dv === undefined ? "" : String(dv).slice(0, 10);
        return {
          description: descF ? String(a[descF] || "") : "",
          permit_creation_date: dateOut,
          permit_type: typeF ? String(a[typeF] || "") : "",
          status: statF ? String(a[statF] || "") : "",
          permit_number: numF ? String(a[numF] || "") : "",
          work_type: "",
          contractor: "",
          valuation: "",
          address_display: addrF ? String(a[addrF] || "") : "",
        };
      });
    } catch {
      continue;
    }
  }
  return [];
}
