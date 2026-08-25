import { getLogisMnData, type Permit } from "./logis-mn";
export type { Permit };

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const SHARDS = [
  "/data/st-louis-park-plumbing.json",
  "/data/st-louis-park-mechanical.json",
  "/data/st-louis-park-electrical.json",
  "/data/st-louis-park-building.json",
  "/data/st-louis-park-other.json",
];

export async function getStLouisParkData(
  number: string,
  street: string,
  origin: string,
  assetsFetch?: Fetcher
): Promise<Permit[]> {
  return getLogisMnData(SHARDS, number, street, origin, assetsFetch);
}
