// Denver permit data — ported from app.py's get_denver_data().
//
// Denver is an ArcGIS FeatureServer, using the shared arcgisSelfHeal()
// field-discovery helper — app.py hardcodes zero fields for this city,
// same as Baltimore, Nashville, and Cleveland.
//
// IMPORTANT DISCOVERY — app.py's hardcoded endpoints do NOT point to
// Denver's data. All three of app.py's hardcoded URLs live under ArcGIS
// org "j80Jz20at6Bi0thr":
//   - Commercial_Permits_since_2010: responds with a VALID-LOOKING but
//     WRONG-CITY dataset — every sampled record is Montgomery County, MD
//     (Germantown, MD addresses/ZIPs, confirmed directly against the live
//     endpoint), not Denver, CO. Because arcgisSelfHeal() returns as soon
//     as it finds an endpoint with a usable address field — regardless of
//     how many (or how few) records the subsequent address query actually
//     returns — this endpoint would ALWAYS be used and would ALWAYS
//     silently serve Maryland permit data mislabeled as "Denver, CO" to
//     every user, for every address. This is not a preservable quirk like
//     Nashville's field collision or Cleveland's blank permit number —
//     serving the wrong city's real data as if it were Denver's would be
//     actively misleading on a tool people use for real estate decisions.
//   - Residential_Construction_Permits and Building_Permits: both return
//     `{"error":{"code":400,"message":"Invalid URL"}}` — dead, like
//     Nashville's dead second endpoint.
//
// Fix: found Denver's real, current ArcGIS endpoints directly on the
// City and County of Denver's own open data catalog
// (opendata-geospatialdenver.hub.arcgis.com), owned by
// "The_City_and_County_of_Denver" under ArcGIS org "zdB7qR0BtYrg0Xpl" —
// a completely different org than app.py's hardcoded one. Live schema
// confirmed directly against both endpoints (identical field sets):
// OBJECTID, DATE_ISSUED, PERMIT_NUM, ADDRESS, LOCATION, CLASS, UNITS,
// VALUATION, PERMIT_FEE, CONTRACTOR_NAME, FINAL_DATE, CANCEL,
// DATE_RECEIVED, BID_AUTHNAME, LOG_NUM, EXEMPT, CO_REQUIRED,
// DATE_CO_ISSUED, ADDRESS_NUMBER, ADDRESS_STREETDIR, ADDRESS_STREETNAME,
// ADDRESS_STREETTYPE, ADDRESS_UNITTYPE, ADDRESS_UNIT, GLOBALID, SCHEDNUM,
// STAT_CODE_3, STAT_CODE_2, STAT_CODE_1, NEIGHBORHOOD.
// This is also completely different from app.py's docstring claims
// (street_num, street_nam, address, issue_date, status, descriptio,
// permit_num, work_type, applicatio) — yet another stale docstring, on
// top of the wrong-endpoint problem.
//
// Self-heal's keyword matcher against this real schema resolves:
//   addrF = "ADDRESS", dateF = "DATE_ISSUED" (Unix-ms, auto-converted),
//   numF = "PERMIT_NUM" — all three correct and populated.
//   descF = no match at all (no field contains DESC/WORK/SCOPE/JOB/NOTES;
//     the field that actually holds a human-readable category, CLASS —
//     e.g. "Alteration/Tenant Finish", "New Building", "Special Event" —
//     is invisible to the matcher's keyword list and is never surfaced).
//   statF = no match at all (STAT_CODE_1/2/3 exist but don't contain the
//     substring "STATUS").
//   typeF = "ADDRESS_STREETTYPE" — a real field, but the WRONG one: it
//     resolves because "ADDRESS_STREETTYPE" contains the substring
//     "TYPE", not because it has anything to do with permit type. It
//     holds a street-suffix abbreviation (e.g. "ST", "AVE") when
//     populated, but is null on every sampled record in this dataset, so
//     it renders blank in practice rather than showing garbled data.
// Net effect: only permit_creation_date and permit_number ever populate;
// permit_type, status, and description all render blank. This is app.py's
// own generic algorithm behaving this way against Denver's real schema —
// preserved, not fixed, per the established Baltimore/Nashville/Cleveland
// precedent for blank-field quirks (the wrong-endpoint issue above is the
// one thing that WAS fixed, because it wasn't a data quirk — it was
// serving a different city's data entirely).
//
// Third architectural quirk, specific to Denver: arcgisSelfHeal() returns
// immediately once an endpoint resolves a usable address field, regardless
// of how many results the address query returns. Since the Commercial
// endpoint below always has a valid ADDRESS field, it is the ONLY endpoint
// that will ever actually run — the Residential endpoint is kept in the
// array for fidelity to app.py's intent (commercial first, residential as
// fallback) but is effectively dead code, the same practical effect as
// Nashville's dead second endpoint, just for a different underlying
// reason (endpoint lock-in rather than a broken URL).
//
// app.py's own default test address (1437 Bannock St) is ANOTHER dead
// example, for the same directional-prefix reason as Baltimore's and
// Pittsburgh's (Gotchas #7/#8): the live record is "1437 N BANNOCK ST" —
// self-heal's `{number} {firstWordOfStreet}%` LIKE clause needs the "N"
// to be the first word of the street input to match. Verified instead
// with number=1437, street="N Bannock St": 5 real commercial permits at
// the Denver City & County Building (Civic Center neighborhood).

import type { Permit } from "./minnetonka";
import { arcgisSelfHeal } from "./arcgis-self-heal";

const DENVER_ENDPOINTS = [
  "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_DEV_COMMERCIALCONSTPERMIT_P/FeatureServer/317/query",
  "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_DEV_RESIDENTIALCONSTPERMIT_P/FeatureServer/316/query",
];

export async function getDenverData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  return arcgisSelfHeal(DENVER_ENDPOINTS, cleanNum, cleanStreet);
}
