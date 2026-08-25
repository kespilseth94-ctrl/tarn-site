import { getLogisMnData, type Permit } from "./logis-mn";
export type { Permit };

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function getEdinaData(
  number: string,
  street: string,
  origin: string,
  assetsFetch?: Fetcher
): Promise<Permit[]> {
  return getLogisMnData(["/data/edina-permits.json"], number, street, origin, assetsFetch);
}
