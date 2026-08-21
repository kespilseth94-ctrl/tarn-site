// Minneapolis permit data — ported from app.py's get_minneapolis_data().
//
// Unlike the Socrata-backed cities (LA/NYC/SF), Minneapolis's public permit
// system is an Esri ArcGIS REST FeatureServer, not a Socrata dataset — the
// query shape (where/outFields/orderByFields/resultRecordCount/f params) and
// the response shape ({ features: [{ attributes: {...} }] }}) are both
// different, and the issue date arrives as a Unix millisecond timestamp
// rather than an ISO date string.

import type { Permit } from "./minnetonka";

const MINNEAPOLIS_ARCGIS_URL =
  "https://services.arcgis.com/afSMGVsC7QlRK1kZ/arcgis/rest/services/CCS_Permits/FeatureServer/0/query";

interface ArcGisFeature {
  attributes: Record<string, unknown>;
}

interface ArcGisResponse {
  features?: ArcGisFeature[];
}

export async function getMinneapolisData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const addressPrefix = `${cleanNum} ${cleanStreet}`;

  try {
    const url = new URL(MINNEAPOLIS_ARCGIS_URL);
    url.searchParams.set("where", `Display LIKE '${addressPrefix}%'`);
    url.searchParams.set(
      "outFields",
      "Display,comments,issueDate,permitType,workType,status,permitNumber,APN"
    );
    url.searchParams.set("orderByFields", "issueDate DESC");
    url.searchParams.set("resultRecordCount", "2000");
    url.searchParams.set("f", "json");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = (await r.json()) as ArcGisResponse;
    const features = Array.isArray(data.features) ? data.features : [];

    return features.map((feat) => {
      const attrs = feat.attributes || {};

      // Convert Unix ms timestamp to a YYYY-MM-DD string.
      const issueMs = attrs["issueDate"];
      let dateStr = "";
      if (typeof issueMs === "number" && issueMs) {
        try {
          dateStr = new Date(issueMs).toISOString().slice(0, 10);
        } catch {
          dateStr = "";
        }
      }

      return {
        description: (attrs["comments"] as string) || "",
        permit_creation_date: dateStr,
        permit_type: (attrs["permitType"] as string) || "",
        status: (attrs["status"] as string) || "",
        permit_number: String(attrs["permitNumber"] || ""),
        work_type: (attrs["workType"] as string) || "",
        contractor: "",
        valuation: "",
        address_display: (attrs["Display"] as string) || "",
      };
    });
  } catch {
    return [];
  }
}
