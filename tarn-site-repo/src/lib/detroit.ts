// Detroit permit data — ported from app.py's get_detroit_data().
//
// Detroit is an ArcGIS FeatureServer, using the shared arcgisSelfHeal()
// field-discovery helper — app.py hardcodes zero fields for this city,
// same as Baltimore, Nashville, Cleveland, and Denver.
//
// Unlike Nashville, Cleveland, and Denver, Detroit's endpoint IS genuinely
// Detroit data and app.py's own docstring field list is essentially
// accurate — confirmed live against the primary endpoint (org
// qvkbeam7Wirps6zC, owned by the City of Detroit's BSEED — Buildings,
// Safety, Engineering & Environmental Dept). Live schema: record_id,
// address, submitted_date, issued_date, work_description, permit_type,
// construction_type, current_use_type, proposed_use_type, use_group,
// zoning_designation, num_stories, num_units, amt_permit_cost,
// amt_estimated_contractor_cost, amt_estimated_department_cost, pmr_id,
// is_open_to_elements, is_missing_portions_of_building,
// is_purchased_from_dlba, is_in_dlba_compliance, has_change_in_units,
// is_vacant, neighborhood, council_district, zip_code, street_number,
// street_prefix, street_name, street_type, parcel_id, address_id,
// longitude, latitude, ObjectId. Sample record confirmed genuinely Detroit
// (real street "1729 Wabash St", a real Detroit Historic District
// Commission case reference in the work description) — this is the first
// ArcGIS city ported where the endpoint didn't need to be second-guessed
// per the Denver lesson (see arcgis-self-heal.ts / TARNHOME_REBUILD_STATUS
// Gotcha #11), though it was still spot-checked before writing this file.
//
// Self-heal's keyword matcher against this real schema resolves cleanly:
//   addrF = "address", descF = "work_description" (matches both DESC and
//     WORK keywords), dateF = "issued_date" (ISO date string already,
//     no Unix-ms conversion needed), numF = "record_id" (matches the
//     RECORD keyword — and is the first field in the schema, so it wins
//     over any later false match), typeF = "permit_type" (an exact,
//     unambiguous match, resolved before the later, coincidentally
//     TYPE-containing street_type/construction_type/current_use_type/
//     proposed_use_type fields).
//   statF = no match at all — but unlike Nashville/Cleveland/Denver this
//     is not a matcher failure against an existing field, there simply is
//     no status field in this schema at all (only boolean condition flags
//     like is_vacant, is_open_to_elements). Status renders blank because
//     the data itself has no status concept, not because of a keyword
//     mismatch.
// Net effect: this is the cleanest ArcGIS self-heal port so far — every
// field except status (which doesn't exist in the source data) resolves
// to the correct, distinct source field and renders correctly.
//
// app.py's own default test address (2875 W Grand Blvd) is NOT a dead
// example, unlike Denver/Nashville/Baltimore — live-verified with 2 real
// permits ("Alter Revision", record IDs BLD2019-01059 / BLD2019-00069)
// before writing this file.
//
// app.py's second endpoint (building_permits_2023) requires an ArcGIS
// auth token ("Token Required" / GWM_0003) and is unreachable without
// credentials — dead, same practical effect as Nashville's and Denver's
// dead/unreachable secondary endpoints. Since the primary endpoint always
// has a valid address field for real Detroit addresses, arcgisSelfHeal()
// never needs to fall through to it in practice; preserved unchanged in
// the endpoints array for fidelity to app.py's intent.

import type { Permit } from "./minnetonka";
import { arcgisSelfHeal } from "./arcgis-self-heal";

const DETROIT_ENDPOINTS = [
  "https://services2.arcgis.com/qvkbeam7Wirps6zC/arcgis/rest/services/bseed_building_permits/FeatureServer/0/query",
  "https://services2.arcgis.com/qvkbeam7Wirps6zC/arcgis/rest/services/building_permits_2023/FeatureServer/0/query",
];

export async function getDetroitData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  return arcgisSelfHeal(DETROIT_ENDPOINTS, cleanNum, cleanStreet);
}
