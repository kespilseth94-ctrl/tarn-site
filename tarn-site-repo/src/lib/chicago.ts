// Chicago permit data — ported from app.py's get_chicago_data().
//
// Chicago (like LA and NYC) is a Socrata dataset (data.cityofchicago.org,
// Building Permits ydr8-5enu), but its address field is split into three
// separate columns rather than one combined string: street_number,
// street_direction (N/S/E/W, sometimes empty), and street_name. app.py tries
// three query shapes in order and uses whichever first returns results —
// with direction parsed out of the search street, without direction, and a
// looser $where LIKE match as a last resort — so this port mirrors that
// same fallback chain rather than assuming the first query always works.

import type { Permit } from "./minnetonka";

const CHICAGO_URL = "https://data.cityofchicago.org/resource/ydr8-5enu.json";

interface ChicagoRecord {
  permit_?: string;
  permit_type?: string;
  work_description?: string;
  issue_date?: string;
  permit_status?: string;
  statuscurrent?: string;
  street_number?: string;
  street_direction?: string;
  street_name?: string;
}

function normalize(records: ChicagoRecord[]): Permit[] {
  return records.map((p) => ({
    description: p.work_description || "",
    permit_creation_date: (p.issue_date || "").slice(0, 10),
    permit_type: p.permit_type || "",
    status: p.permit_status || p.statuscurrent || "",
    permit_number: String(p.permit_ || ""),
    work_type: "",
    contractor: "",
    valuation: "",
    address_display: `${p.street_number || ""} ${p.street_direction || ""} ${p.street_name || ""}`
      .replace(/\s+/g, " ")
      .trim(),
  }));
}

export async function getChicagoData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();

  // Parse a leading direction token (N/S/E/W) off the street, same as app.py.
  let direction = "";
  const parts = cleanStreet.split(/\s+/).filter(Boolean);
  let cleanStreetName = cleanStreet;
  if (parts.length && ["N", "S", "E", "W"].includes(parts[0])) {
    direction = parts[0];
    cleanStreetName = parts.slice(1).join(" ");
  }

  const queries: Record<string, string>[] = [
    {
      street_number: cleanNum,
      street_direction: direction,
      street_name: cleanStreetName,
      $limit: "2000",
      $order: "issue_date DESC",
    },
    {
      street_number: cleanNum,
      street_name: cleanStreetName,
      $limit: "2000",
      $order: "issue_date DESC",
    },
    {
      $where: `street_number='${cleanNum}' AND street_name LIKE '${cleanStreetName}%'`,
      $limit: "2000",
      $order: "issue_date DESC",
    },
  ];

  for (const params of queries) {
    try {
      const url = new URL(CHICAGO_URL);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

      const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;

      const data = (await r.json()) as ChicagoRecord[];
      if (Array.isArray(data) && data.length > 0) {
        return normalize(data);
      }
    } catch {
      continue;
    }
  }

  return [];
}
