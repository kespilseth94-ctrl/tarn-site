import { getLogisMnData, type Permit } from "./logis-mn";
export type { Permit };

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const SHARDS = [
  "/data/maple-grove-plumbing.json",
  "/data/maple-grove-mechanical.json",
  "/data/maple-grove-electrical.json",
  "/data/maple-grove-building.json",
  "/data/maple-grove-other.json",
];

export async function getMapleGroveData(
  number: string,
  street: string,
  origin: string,
  assetsFetch?: Fetcher
): Promise<Permit[]> {
  return getLogisMnData(SHARDS, number, street, origin, assetsFetch);
}
