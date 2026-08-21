// Philadelphia permit data — ported from app.py's get_philadelphia_data().
//
// Philadelphia is a Carto SQL API (phl.carto.com), NOT Socrata — queries are
// literal SQL strings posted as a `q` query param, matched with a
// `WHERE address LIKE '{prefix}%'` clause against the combined address
// field. The address-matching shape is close to Seattle/LA's LIKE clause;
// what's different here is the transport (Carto SQL over `/api/v2/sql`
// rather than Socrata's `$where`/`$select` params).

import type { Permit } from "./minnetonka";

const PHILADELPHIA_URL = "https://phl.carto.com/api/v2/sql";

interface PhiladelphiaRecord {
  permitnumber?: string;
  permittype?: string;
  approvedscopeofwork?: string;
  permitissuedate?: string;
  status?: string;
  address?: string;
  typeofwork?: string;
  commercialorresidential?: string;
}

export async function getPhiladelphiaData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const addressLike = `${cleanNum} ${cleanStreet}%`;

  const query =
    `SELECT permitnumber, permittype, approvedscopeofwork, ` +
    `permitissuedate, status, address, typeofwork, commercialorresidential ` +
    `FROM permits ` +
    `WHERE address LIKE '${addressLike}' ` +
    `ORDER BY permitissuedate DESC ` +
    `LIMIT 200`;

  try {
    const url = new URL(PHILADELPHIA_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return [];

    const data = (await r.json()) as { rows?: PhiladelphiaRecord[] };
    const rows = data.rows;
    if (!Array.isArray(rows)) return [];

    return rows.map((p) => {
      // approvedscopeofwork is the richest description field; typeofwork
      // is the fallback when it's blank.
      const desc = p.approvedscopeofwork || p.typeofwork || "";
      return {
        description: desc,
        permit_creation_date: (p.permitissuedate || "").slice(0, 10),
        permit_type: p.permittype || "",
        status: p.status || "",
        permit_number: String(p.permitnumber || ""),
        work_type: p.typeofwork || "",
        contractor: "",
        valuation: "",
        address_display: p.address || "",
      };
    });
  } catch {
    return [];
  }
}
