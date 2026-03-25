interface GeoResult {
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
