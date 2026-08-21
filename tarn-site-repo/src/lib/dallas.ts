// Dallas permit data — ported from app.py's get_dallas_data().
//
// Dallas is a Socrata dataset (dallasopendata.com, Building Permits
// e7gq-4sah) matched with a $where ... LIKE clause against a single
// combined address field (street_address) — the same LIKE-clause shape
// as Seattle/LA/NYC. What's different here is the date format: Dallas
// returns issued_date as "MM/DD/YY" (two-digit year), which needs
// conversion to YYYY-MM-DD before use, mirroring app.py's own parsing.

import type { Permit } from "./minnetonka";

const DALLAS_URL = "https://www.dallasopendata.com/resource/e7gq-4sah.json";

interface DallasRecord {
  street_address?: string;
  work_description?: string;
  issued_date?: string;
  permit_type?: string;
  permit_number?: string;
  status_current?: string;
}

function parseDallasDate(raw: string): string {
  if (raw && raw.length === 8 && raw.includes("/")) {
    const parts = raw.split("/");
    if (parts.length === 3) {
      let yr = parseInt(parts[2], 10);
      if (!isNaN(yr)) {
        yr = yr < 100 ? 2000 + yr : yr;
        const mm = parts[0].padStart(2, "0");
        const dd = parts[1].padStart(2, "0");
        return `${yr}-${mm}-${dd}`;
      }
    }
  }
  return raw.slice(0, 10);
}

export async function getDallasData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const addressPrefix = `${cleanNum} ${cleanStreet}`;

  try {
    const url = new URL(DALLAS_URL);
    url.searchParams.set("$where", `street_address LIKE '${addressPrefix}%'`);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "issued_date DESC");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = (await r.json()) as DallasRecord[];
    if (!Array.isArray(data)) return [];

    return data.map((p) => ({
      description: p.work_description || "",
      permit_creation_date: parseDallasDate(p.issued_date || ""),
      permit_type: p.permit_type || "",
      status: p.status_current || "",
      permit_number: String(p.permit_number || ""),
      work_type: "",
      contractor: "",
      valuation: "",
      address_display: p.street_address || "",
    }));
  } catch {
    return [];
  }
}
