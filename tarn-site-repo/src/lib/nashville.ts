// Nashville permit data — ported from app.py's get_nashville_data().
//
// Nashville is an ArcGIS FeatureServer (data.nashville.gov / Metro Codes
// Dept), using the shared arcgisSelfHeal() field-discovery helper — app.py
// hardcodes zero fields for this city, same as Baltimore.
//
// Live schema confirmed directly against the endpoint: Permit__, Permit_Type_Description,
// Permit_Subtype_Description, Parcel, Date_Entered, Date_Issued, Const_Cost,
// Address, City, State, Subdivision_Lot, Contact, Per_Ty, Per_SubTy,
// IVR_Trk_, Purpose, Council_Dist, Census_Tract, Lon, Lat, ObjectId, ZIP.
// This is a completely different field set than app.py's own docstring
// claims (PermitNum, PermitStatus, AppliedDate, IssuedDate, CompletedDate,
// WorkDesc, PermitTypeDesc, SitusAddress, SitusCity, SitusZip) — another
// stale docstring, not to be trusted over runtime discovery.
//
// Self-heal's keyword matcher picks: addrF="Address", dateF="Date_Issued"
// (Unix-ms, auto-converted), descF AND typeF both resolve to the SAME field
// ("Permit_Type_Description" — it's the first field containing "DESC" in
// iteration order, and also the first containing "TYPE"), so the
// Description and Permit Type columns will show identical text (e.g.
// "Building Demolition Permit"). statF and numF find no match at all
// (no field contains STATUS; "Permit__" doesn't match any of the
// CASENUMBER/PERMIT_N/.../RECORD keywords because of its double
// underscore), so status and permit_number render blank. This is
// app.py's own generic algorithm behaving exactly the same way against
// this schema — preserved, not fixed, per the established pattern for
// Baltimore's blank fields.
//
// app.py's own default test address (1100 Broadway) has zero issued
// permits in this dataset — a dead example, same pattern as Pittsburgh
// and Baltimore's own defaults. Verified instead with 1711 Broadway,
// which has multiple real permits live. app.py's second fallback endpoint
// (Building_Permits_Applications) does not actually exist (returns an
// "Invalid URL" ArcGIS error) — but since the primary endpoint has data,
// self-heal never needs to fall through to it in practice.

import type { Permit } from "./minnetonka";
import { arcgisSelfHeal } from "./arcgis-self-heal";

const NASHVILLE_ENDPOINTS = [
  "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Building_Permits_Issued_2/FeatureServer/0/query",
  "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Building_Permits_Applications/FeatureServer/0/query",
];

export async function getNashvilleData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  return arcgisSelfHeal(NASHVILLE_ENDPOINTS, cleanNum, cleanStreet);
}
