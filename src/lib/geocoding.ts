import { ALLOWED_CITIES, SEARCH_VIEWBOX } from "@/constants";

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
      limit: "10",
      countrycodes: "il",
      "accept-language": "he",
      viewbox: `${SEARCH_VIEWBOX.minLng},${SEARCH_VIEWBOX.maxLat},${SEARCH_VIEWBOX.maxLng},${SEARCH_VIEWBOX.minLat}`,
      bounded: "0",
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

/** Search for address suggestions limited to allowed cities */
export async function searchAddresses(
  query: string
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 2) return [];

  const viewbox = `${SEARCH_VIEWBOX.minLng},${SEARCH_VIEWBOX.maxLat},${SEARCH_VIEWBOX.maxLng},${SEARCH_VIEWBOX.minLat}`;

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "10",
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

    // Filter to only allowed cities
    return data
      .filter((item: { display_name: string }) =>
        ALLOWED_CITIES.some((city) => item.display_name.includes(city))
      )
      .slice(0, 5)
      .map((item: { display_name: string; lat: string; lon: string }) => ({
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
  } catch {
    return [];
  }
}
