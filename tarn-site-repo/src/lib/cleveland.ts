// Cleveland permit data — ported from app.py's get_cleveland_data().
//
// Cleveland is an ArcGIS FeatureServer (data.clevelandohio.gov / city GIS),
// using the shared arcgisSelfHeal() field-discovery helper — app.py
// hardcodes zero fields for this city, same as Baltimore and Nashville.
//
// Live schema confirmed directly against the endpoint: OBJECTID, PERMIT_ID,
// PRIMARY_ADDRESS, PERMIT_TYPE, PERMIT_SUBTYPE, PERMIT_CATEGORY,
// JOB_DESCRIPTION, USE_GROUP_1, PLAN_TYPE, WORK_DESCRIPTION,
// CONTRACTOR_NAME, CONTRATOR_BUSINESS_NAME, CONTRATOR_LICENSE_ID,
// PERMIT_SUBMITTED_ONLINE, JOB_VALUE, TOTAL_FEES_PAID, FILE_DATE,
// ISSUE_DATE, CURRENT_TASK, CURRENT_TASK_STATUS, PARCEL_NUMBER, WARD,
// WORK_AREA, SIZE_OF_BUILDING, BLDG_FOOTPRINT, ASSOCIATED_PROJECT,
// PROJECT_FILE_DATE, DW_Form_Based_Code_Area, ACCELA_CITIZEN_ACCESS_URL,
// DW_Parcel, DW_Ward, DW_Ward2026, DW_Ward2014, DW_Tract2020,
// DW_Neighborhood, LON, LAT.
// This is a completely different field set than app.py's own docstring
// claims (PERMIT_NUM, ADDRESS, PERMIT_TYPE, DESCRIPTION, ISSUE_DATE,
// STATUS) — another stale docstring, not to be trusted over runtime
// discovery (same lesson as Nashville).
//
// Self-heal's keyword matcher picks: addrF="PRIMARY_ADDRESS",
// descF="JOB_DESCRIPTION" (first field matching DESC/WORK/SCOPE/JOB/NOTES
// in field order — WORK_DESCRIPTION also matches but comes later),
// dateF="ISSUE_DATE" (Unix-ms, auto-converted), statF="CURRENT_TASK_STATUS",
// typeF="PERMIT_TYPE". numF finds NO match at all: the actual permit
// identifier field is "PERMIT_ID", which does not contain any of the
// numF keywords (CASENUMBER, PERMIT_N, PERMIT_NO, PERMITNO, PERMIT_NUM,
// PROCESS_N, APP_NO, RECORD) — "PERMIT_ID" is one character group away
// from "PERMIT_N" but does not match it. So permit_number renders blank
// even though a perfectly good identifier (e.g. "BCB26-019784") exists in
// the raw data under a field name the generic matcher doesn't recognize.
// This is app.py's own generic algorithm behaving exactly the same way
// against this schema — preserved, not fixed, per the established pattern
// for Baltimore's and Nashville's blank fields.
//
// app.py's own default test address (601 Lakeside Ave) IS live in this
// dataset (5 real permits confirmed directly against the endpoint) — no
// dead-example quirk here, unlike Nashville/Baltimore/Pittsburgh.

import type { Permit } from "./minnetonka";
import { arcgisSelfHeal } from "./arcgis-self-heal";

const CLEVELAND_ENDPOINTS = [
  "https://services3.arcgis.com/dty2kHktVXHrqO8i/arcgis/rest/services/Building_Permits/FeatureServer/0/query",
];

export async function getClevelandData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  return arcgisSelfHeal(CLEVELAND_ENDPOINTS, cleanNum, cleanStreet);
}
