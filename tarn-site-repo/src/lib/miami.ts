// Miami, FL permit data — live ArcGIS FeatureServer via the shared
// arcgis-self-heal.ts helper.
//
// app.py hardcodes two endpoints for this city:
//   https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/BuildingPermit_gdb/FeatureServer/0/query
//   https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/Building_Permit/FeatureServer/0/query
// Both are dead: the first requires an ArcGIS auth token the anonymous
// query doesn't have ({"error":{"code":499,"message":"Token Required"}}),
// and the second returns {"error":{"code":400,"message":"Invalid URL"}}.
// Per the Gotcha #11 discipline established during the Denver port (never
// trust a hardcoded ArcGIS endpoint without spot-checking it first), the
// real, current, city-owned endpoint was found via the City of Miami's own
// open data portal (datahub-miamigis.opendata.arcgis.com, dataset
// "Building Permits Since 2014", item 1d6fc60b087c4bcaa22345f429a2ec5a),
// whose ArcGIS item metadata confirms ownership by `CityMiamiFL`:
//
//   https://services1.arcgis.com/CvuPhqcTQpZPT9qY/arcgis/rest/services/Building_Permits_Since_2014/FeatureServer/0/query
//
// Unlike Denver's case, this isn't a wrong-city substitution -- app.py's
// endpoints are simply gone/broken, not silently serving someone else's
// data -- but the same "don't trust it, verify it" discipline applies
// equally to a dead endpoint as to a wrong one.
//
// Live schema (confirmed via a sample record before writing this file):
//   ID, AdditionSQFT, ApplicationNumber, BuildingFinalLastInspDate,
//   BuildingFinalLastInspResult, BuildingPermitStatusDescription,
//   BuildingPermitStatusReasonDescription, Certificatecode, Certificatedate,
//   CompanyAddress, CompanyCity, CompanyName, CompanyZip, DaysInCity,
//   DaysInCityNumeric, DeliveryAddress, FirstSubmissionDate, FolioNumber,
//   IsPermitFinal, IsPrivateProvider, IssuedDate, Latitude, Longitude,
//   Miami21Zone, NewAdditionCost, PermitNumber, PlanAcceptedDate,
//   PlanCreatedDate, ProcessNumber, PropertyType, RemodelingCost, RemSQFT,
//   RequiredCertificate, ScopeofWork, Statusdate, TotalCost,
//   TotalDaysInPlanReview, TotalDaysInPlanReviewNumeric, TotalSQFT,
//   WorkItems, ObjectId
// -- completely different from app.py's docstring claims (FOLIO, ADDRESS,
// PERMIT_NUM, PERMIT_STATUS, ISSUED_DATE, PERMIT_TYPE, DESCRIPTION,
// CONTRACTOR), consistent with the stale-docstring precedent from
// Nashville/Cleveland/Denver.
//
// A NEW quirk shape, distinct from every prior ArcGIS city: the address
// field itself is ambiguous, not just a downstream description/type/number
// field. `CompanyAddress` (the contractor's own business mailing address,
// e.g. a Weston, FL company address wholly unrelated to the permitted
// property) appears earlier in field order than `DeliveryAddress` (the
// actual site address, e.g. "3837 N MOORINGS CT", a real Miami street).
// app.py's own `find()` -- and this port's faithful `findField()` -- always
// returns the FIRST matching field, so reproducing that behavior exactly
// would resolve the address field to `CompanyAddress` for every query,
// which would silently search the wrong field and return zero or spurious
// results for essentially every real property address. Unlike Nashville's
// description/type collision or Denver's wrong-but-plausible permit-type
// value -- both of which still return correct, useful permit data on a
// correctly-matched address -- this would make the entire feature
// non-functional for every user, the same severity class as Kansas
// City/New Orleans's title-case bug (Gotcha #5), which was also fixed
// rather than preserved. Fix: `arcgis-self-heal.ts` now accepts an
// optional `preferredAddressField` override (opt-in, defaults to
// undefined, so every previously-verified city is unaffected); Miami's
// wrapper passes "DeliveryAddress" explicitly instead of relying on
// keyword auto-discovery for this one field.
//
// Every other field-resolution quirk here IS preserved, not fixed, per the
// established Nashville/Cleveland/Denver precedent -- these all degrade
// data quality on already-correctly-matched rows rather than breaking the
// feature outright:
//   - descF and statF both resolve to the SAME field,
//     `BuildingPermitStatusDescription` (values like "Revoked", "Expired",
//     "Final"), because it contains both "DESC" and "STATUS" and appears
//     before the real work-description field. This is a Nashville-style
//     collision: the Description and Status columns will show identical
//     status text, and the real scope-of-work field, `ScopeofWork`
//     (values like "REMODELING/REPAIRS", "ELECTRICAL", "ANNUAL FACILITY"),
//     is never surfaced.
//   - typeF resolves to `PropertyType` (values like "Commercial"), a
//     Denver-`ADDRESS_STREETTYPE`-style wrong-but-plausible value -- it's
//     the property's use classification, not the permit type, but renders
//     as a real, non-blank string rather than an error.
//   - numF resolves to nothing: none of the numF keywords
//     (CASENUMBER/PERMIT_N/PERMIT_NO/PERMITNO/PERMIT_NUM/PROCESS_N/APP_NO/
//     RECORD) match `PermitNumber` or `ProcessNumber`, both of which lack
//     the underscore the keyword list expects -- a Cleveland/Nashville-
//     style total non-match, so permit_number renders blank despite good
//     identifier data existing.
//   - dateF resolves cleanly to `IssuedDate` (Unix-millisecond timestamp,
//     converted the same way as every other self-heal city).
//
// Default test address per app.py's CITIES dict: number="111",
// street="NW 1st St". NOT a dead example (unlike Denver/Nashville/
// Baltimore) -- confirmed live before writing this file: querying
// `DeliveryAddress LIKE '111 NW%'` (the production where-clause shape,
// using only the first word of the street per the shared helper's
// preserved first-word-only matching) returns real permits including
// several at "111 NW 1 ST" specifically (e.g. permit BD16011932001AF001).

import { arcgisSelfHeal } from "./arcgis-self-heal";
import type { Permit } from "./minnetonka";

export async function getMiamiData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  const endpoints = [
    "https://services1.arcgis.com/CvuPhqcTQpZPT9qY/arcgis/rest/services/Building_Permits_Since_2014/FeatureServer/0/query",
  ];
  return arcgisSelfHeal(endpoints, cleanNum, cleanStreet, "DeliveryAddress");
}
