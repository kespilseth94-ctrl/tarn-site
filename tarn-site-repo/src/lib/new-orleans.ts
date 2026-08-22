// New Orleans permit data — ported from app.py's get_new_orleans_data().
//
// New Orleans is a Socrata dataset (data.nola.gov, Permits rcm3-fn58),
// 2012-present with nightly updates. app.py's docstring lists PascalCase
// field names (Address, Description, Type, IssueDate, CurrentStatus,
// NumString, LandUse), but the live API actually returns all-lowercase
// field names (address, description, type, issuedate, currentstatus,
// numstring, landuse) — app.py's code already falls back to the lowercase
// names via `p.get("IssueDate") or p.get("issuedate")`, so this port just
// reads the lowercase names directly.
//
// IMPORTANT DEVIATION FROM app.py (same class of bug as Kansas City): this
// dataset stores `address` in Title Case (e.g. "2338 Constance St"), not
// ALL CAPS. app.py uppercases the search street and does a plain LIKE
// match, which — since SoQL's LIKE is case-sensitive — silently returns
// zero results for every real New Orleans address (verified directly
// against the live dataset: a plain uppercase LIKE returned [], while the
// same query wrapped in upper(address) LIKE returned real records). Fixed
// here the same way as Kansas City: wrap the field in upper(...).
//
// Date quirk mirrored from app.py: issuedate arrives as "MM/DD/YYYY
// HH:MM:SS AM/PM" (not ISO), so it needs the same split-and-reassemble
// parsing app.py does rather than a plain slice(0, 10).
//
// Description quirk mirrored from app.py: when landuse is present, it's
// appended to the description in brackets, e.g. "<desc> [Single Family]".

import type { Permit } from "./minnetonka";

const NEW_ORLEANS_URL = "https://data.nola.gov/resource/rcm3-fn58.json";

interface NewOrleansRecord {
  address?: string;
  description?: string;
  type?: string;
  issuedate?: string;
  currentstatus?: string;
  numstring?: string;
  landuse?: string;
}

// Mirrors Python's str.strip(chars): strips leading/trailing characters
// that are IN the given character set, one edge character at a time,
// stopping at the first character (from each end) not in the set. This is
// NOT a substring trim — app.py's `f"{desc} [{land_use}]".strip(" []")`
// only cleans up the brackets when desc is empty (producing a bare
// "Single Family"); when desc is non-empty, the leading "[" and its
// preceding space are NOT at the string's edge, so they survive, leaving
// a stray unclosed bracket, e.g. "Gunite pool [Single Family" (no closing
// "]"). Reproduced here exactly rather than "fixed," per app.py fidelity.
function pythonStrip(s: string, chars: string): string {
  const set = new Set(chars.split(""));
  let start = 0;
  let end = s.length;
  while (start < end && set.has(s[start])) start++;
  while (end > start && set.has(s[end - 1])) end--;
  return s.slice(start, end);
}

function parseNewOrleansDate(raw: string): string {
  if (!raw) return "";
  try {
    if (raw.includes("/")) {
      const datePart = raw.split(" ")[0];
      const parts = datePart.split("/");
      if (parts.length === 3) {
        const [mm, dd, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
    }
    return raw.slice(0, 10);
  } catch {
    return raw.slice(0, 10);
  }
}

export async function getNewOrleansData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const addressPrefix = `${cleanNum} ${cleanStreet}`;

  try {
    const url = new URL(NEW_ORLEANS_URL);
    url.searchParams.set("$where", `upper(address) LIKE '${addressPrefix}%'`);
    url.searchParams.set("$limit", "2000");
    url.searchParams.set("$order", "issuedate DESC");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];

    const data = (await r.json()) as NewOrleansRecord[];
    if (!Array.isArray(data)) return [];

    return data.map((p) => {
      let desc = p.description || "";
      const landUse = p.landuse || "";
      if (landUse) {
        desc = pythonStrip(`${desc} [${landUse}]`, " []");
      }
      return {
        description: desc,
        permit_creation_date: parseNewOrleansDate(p.issuedate || ""),
        permit_type: p.type || "",
        status: p.currentstatus || "",
        permit_number: String(p.numstring || ""),
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
