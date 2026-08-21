// Los Angeles permit data — ported from app.py's get_los_angeles_data().
//
// Unlike Minnetonka (a pre-ingested static extract served as a JSON asset),
// LA permit data is fetched live from the city's public Socrata API on every
// request — data.lacity.org, LADBS Permits dataset (9k3p-zrda). This mirrors
// what app.py already does, so no static asset or env.ASSETS.fetch binding
// is needed here; a plain fetch() to the external API works fine in the
// Worker (this isn't a self-fetch to the Worker's own origin).

import type { Permit } from "./minnetonka";

const LA_SOCRATA_URL = "https://data.lacity.org/resource/9k3p-zrda.json";

export async function getLosAngelesData(
  number: string,
  street: string
): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const firstWord = cleanStreet ? cleanStreet.split(" ")[0] : "";

  // Same two-tier fallback as app.py: try the full street name first, then
  // just the first word of the street (LA addresses often carry a direction
  // prefix, e.g. "13692 W ERWIN ST").
  const whereClauses = [
    `primary_address LIKE '${cleanNum}%${cleanStreet}%'`,
    `primary_address LIKE '${cleanNum} %${firstWord}%'`,
  ];

  for (const where of whereClauses) {
    try {
      const url = new URL(LA_SOCRATA_URL);
      url.searchParams.set("$where", where);
      url.searchParams.set("$limit", "2000");
      url.searchParams.set("$order", "issue_date DESC");

      const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;

      const data = (await r.json()) as Record<string, string>[];
      if (!Array.isArray(data) || data.length === 0) continue;

      const normalized: Permit[] = data.map((p) => {
        const rawDate = p["issue_date"] || p["submitted_date"] || "";
        const dateStr = rawDate ? String(rawDate).slice(0, 10) : "";
        const permitType = p["permit_type"] || "";
        const subType = p["permit_sub_type"] || "";
        const typeStr = subType ? `${permitType} — ${subType}` : permitType;

        return {
          description: p["work_desc"] || "",
          permit_creation_date: dateStr,
          permit_type: typeStr,
          status: p["status_desc"] || "",
          permit_number: String(p["permit_nbr"] || ""),
          work_type: "",
          contractor: "",
          valuation: "",
          address_display: p["primary_address"] || "",
        };
      });

      normalized.sort((a, b) => b.permit_creation_date.localeCompare(a.permit_creation_date));
      return normalized;
    } catch {
      continue;
    }
  }

  return [];
}
