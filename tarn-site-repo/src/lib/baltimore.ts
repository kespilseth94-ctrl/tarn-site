// Baltimore permit data — ported from app.py's get_baltimore_data().
//
// Baltimore is an ArcGIS FeatureServer (egisdata.baltimorecity.gov, with
// geodata.baltimorecity.gov as a fallback host), Layer 3 of the "DHCD Open
// Baltimore Datasets" service. app.py doesn't hardcode field names for this
// city at all — it delegates entirely to the shared field-discovery helper.
// See ./arcgis-self-heal.ts for the full ported logic and its documented
// quirks, most notably: only the first word of the street name is used in
// the address match (same pattern as Pittsburgh/Cincinnati/Milwaukee).

import type { Permit } from "./minnetonka";
import { arcgisSelfHeal } from "./arcgis-self-heal";

const ENDPOINTS = [
  "https://egisdata.baltimorecity.gov/egis/rest/services/Housing/DHCD_Open_Baltimore_Datasets/FeatureServer/3/query",
  "https://geodata.baltimorecity.gov/egis/rest/services/Housing/DHCD_Open_Baltimore_Datasets/FeatureServer/3/query",
];

export async function getBaltimoreData(number: string, street: string): Promise<Permit[]> {
  const cleanNum = String(number).trim();
  const cleanStreet = String(street).trim().toUpperCase();
  return arcgisSelfHeal(ENDPOINTS, cleanNum, cleanStreet);
}
