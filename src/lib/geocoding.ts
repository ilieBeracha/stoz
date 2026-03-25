import { RESTAURANT_LOCATION } from "@/constants";

interface GeoResult {
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  address: string;
  lat: number;
  lng: number;
}

const cache = new Map<string, GeoResult>();

export async function geocodeAddress(
  address: string
): Promise<GeoResult | null> {
  const key = address.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { "User-Agent": "Stoz-Delivery-Planner/1.0" },
      }
    );
    const data = await res.json();
    if (data.length === 0) return null;

    const result: GeoResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

/** Search for address suggestions near the restaurant location */
export async function searchAddresses(
  query: string
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 2) return [];

  // Viewbox: ~15km around restaurant to prioritize local results
  const delta = 0.15;
  const viewbox = [
    RESTAURANT_LOCATION.lng - delta,
    RESTAURANT_LOCATION.lat + delta,
    RESTAURANT_LOCATION.lng + delta,
    RESTAURANT_LOCATION.lat - delta,
  ].join(",");

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "5",
      viewbox,
      bounded: "0",
      countrycodes: "il",
      "accept-language": "he",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { "User-Agent": "Stoz-Delivery-Planner/1.0" },
      }
    );
    const data = await res.json();

    return data.map(
      (item: { display_name: string; lat: string; lon: string }) => ({
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      })
    );
  } catch {
    return [];
  }
}
