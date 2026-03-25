export interface RouteResult {
  geometry: [number, number][]; // [lat, lng][] for Leaflet polyline
  distance: number; // km (real road distance)
  duration: number; // minutes (real driving time)
}

/**
 * Fetch real road route geometry from OSRM.
 * Waypoints: array of {lat, lng} in visit order.
 * Returns road geometry + real distance/duration, or null if OSRM fails.
 */
export async function fetchRouteGeometry(
  waypoints: { lat: number; lng: number }[]
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  // OSRM uses lng,lat order (not lat,lng)
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];

    // GeoJSON coordinates are [lng, lat] — flip to [lat, lng] for Leaflet
    const geometry: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    return {
      geometry,
      distance: Math.round((route.distance / 1000) * 10) / 10, // meters → km
      duration: Math.round(route.duration / 60), // seconds → minutes
    };
  } catch {
    return null;
  }
}
