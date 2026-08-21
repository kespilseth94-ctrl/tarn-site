// New York City permit + violation data — ported from app.py's get_nyc_data(),
// get_nyc_violations(), and _nyc_severity(). All three live Socrata datasets on
// data.cityofnewyork.us — no static asset needed, same reasoning as Los Angeles.

import type { Permit } from "./minnetonka";

const NYC_JOB_FILINGS_URL = "https://data.cityofnewyork.us/resource/w9ak-ipjd.json";
const NYC_BIS_VIOLATIONS_URL = "https://data.cityofnewyork.us/resource/3h2n-5cm9.json";
const NYC_SAFETY_VIOLATIONS_URL = "https://data.cityofnewyork.us/resource/855j-jady.json";

// NYC DOB job filings split work type across separate fields rather than one
// description column; these get combined, same as app.py does.
const WORK_TYPE_FIELDS = [
  "general_construction_work_type_",
  "plumbing_work_type",
  "mechanical_systems_work_type_",
  "structural_work_type_",
  "boiler_equipment_work_type_",
  "earth_work_work_type_",
  "foundation_work_type_",
  "sprinkler_work_type",
];

const JOB_TYPE_LABELS: Record<string, string> = {
  A1: "Major Alteration",
  A2: "Minor Alteration",
  NB: "New Building",
  DM: "Demolition",
  SG: "Sign",
};

export async function getNycData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();

  try {
    const url = new URL(NYC_JOB_FILINGS_URL);
    // house_no is an exact-match filter (plain Socrata query param), not a $where —
    // matches app.py, which passes it the same way.
    url.searchParams.set("house_no", cleanNum);
    url.searchParams.set("$where", `street_name LIKE '${cleanStreet}%'`);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "filing_date DESC");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const data = (await r.json()) as Record<string, string>[];
    if (!Array.isArray(data)) return [];

    return data.map((p) => {
      const workParts = WORK_TYPE_FIELDS.map((f) => String(p[f] || "").trim()).filter((v) => v);
      const jobType = p["job_type"] || "";
      const jobDesc = JOB_TYPE_LABELS[jobType] || jobType;
      const description = [jobDesc, ...workParts].filter((d) => d).join(" | ");

      return {
        description,
        permit_creation_date: (p["filing_date"] || "").slice(0, 10),
        permit_type: jobDesc,
        status: p["filing_status"] || "",
        permit_number: String(p["job_filing_number"] || ""),
        work_type: "",
        contractor: "",
        valuation: "",
        address_display: `${p["house_no"] || ""} ${p["street_name"] || ""} ${p["borough"] || ""}`.trim(),
      };
    });
  } catch {
    return [];
  }
}

export interface NycViolation {
  date: string;
  type: string;
  desc: string;
  status: string;
  source: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

function nycSeverity(vtype: string, desc: string): "HIGH" | "MEDIUM" | "LOW" {
  const t = vtype.toUpperCase();
  const d = desc.toUpperCase();
  if (["UNSAFE", "IMMED", "HAZARD", "EMERG", "STOP WORK"].some((k) => t.includes(k))) return "HIGH";
  if (
    ["IMMEDIATELY HAZARDOUS", "UNSAFE", "FIRE", "STRUCTURAL", "COLLAPSE", "ELECTRICAL HAZARD", "GAS LEAK"].some(
      (k) => d.includes(k)
    )
  )
    return "HIGH";
  if (
    ["BOILER", "ELEVATOR", "SPRINKLER", "STANDPIPE", "FACADE", "ROOF", "PARAPET", "RETAINING WALL"].some((k) =>
      d.includes(k)
    )
  )
    return "MEDIUM";
  if (["LBLVIO", "JVIOL1"].includes(t)) return "MEDIUM";
  return "LOW";
}

export async function getNycViolations(number: string, street: string): Promise<NycViolation[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const streetPrefix = cleanStreet ? cleanStreet.split(" ")[0] : cleanNum;

  const violations: NycViolation[] = [];

  // Dataset 1: older BIS civil-penalty violations.
  try {
    const url = new URL(NYC_BIS_VIOLATIONS_URL);
    url.searchParams.set("$where", `house_number='${cleanNum}' AND street LIKE '${streetPrefix}%'`);
    url.searchParams.set("$limit", "500");
    url.searchParams.set("$order", "issue_date DESC");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data = (await r.json()) as Record<string, string>[];
    if (Array.isArray(data)) {
      for (const v of data) {
        const rawDate = String(v["issue_date"] || "");
        // BIS dates come as YYYYMMDD.
        const dateStr =
          rawDate.length === 8 && /^\d+$/.test(rawDate)
            ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6)}`
            : rawDate.slice(0, 10);
        const vtype = v["violation_type"] || v["violation_type_code"] || "";
        const desc = v["description"] || "";
        const disp = v["disposition_comments"] || "";
        const fullDesc = desc + (disp ? ` | Disposition: ${disp}` : "");
        violations.push({
          date: dateStr,
          type: vtype,
          desc: fullDesc || "Building violation",
          status: v["violation_category"] || "",
          source: "DOB Violations (BIS)",
          severity: nycSeverity(vtype, desc),
        });
      }
    }
  } catch {
    /* ignore — merged with dataset 2 regardless */
  }

  // Dataset 2: newer DOB NOW safety violations.
  try {
    const url = new URL(NYC_SAFETY_VIOLATIONS_URL);
    url.searchParams.set("$where", `house_number='${cleanNum}' AND street LIKE '${streetPrefix}%'`);
    url.searchParams.set("$limit", "500");
    url.searchParams.set("$order", "violation_issue_date DESC");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data = (await r.json()) as Record<string, string>[];
    if (Array.isArray(data)) {
      for (const v of data) {
        const dateStr = (v["violation_issue_date"] || "").slice(0, 10);
        const vtype = v["violation_type"] || "";
        const remarks = v["violation_remarks"] || "";
        const status = v["violation_status"] || "";
        violations.push({
          date: dateStr,
          type: vtype,
          desc: remarks || vtype || "Safety violation",
          status,
          source: "DOB Safety (NOW)",
          severity: nycSeverity(vtype, remarks),
        });
      }
    }
  } catch {
    /* ignore */
  }

  const seen = new Set<string>();
  const out: NycViolation[] = [];
  for (const v of [...violations].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = `${v.date}|${v.type.slice(0, 20)}|${v.desc.slice(0, 40)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}
