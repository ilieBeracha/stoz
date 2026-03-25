import { Order, Driver, PlannedRoute, RouteStop } from "./types";
import { haversine } from "./distance";
import {
  RESTAURANT_LOCATION,
  DRIVER_COLORS,
  AVERAGE_SPEED_KMH,
  STOP_TIME_MINUTES,
  MERGE_DISTANCE_KM,
} from "@/constants";

// --- Phase 1: Score each order by urgency ---

function foodTypePenalty(foodType: string): number {
  switch (foodType) {
    case "warm":
      return 1.0;
    case "both":
      return 0.7;
    case "sushi":
      return 0.3;
    default:
      return 0.5;
  }
}

function minutesUntilDeadline(order: Order): number {
  const deadlineTime =
    new Date(order.createdAt).getTime() + order.deadline * 60000;
  const diff = (deadlineTime - Date.now()) / 60000;
  return Math.max(diff, 1); // minimum 1 minute to avoid division by zero
}

function urgencyScore(order: Order): number {
  const mins = minutesUntilDeadline(order);
  const timeWeight = 10;
  const foodWeight = 5;
  let score = timeWeight * (1 / mins) + foodWeight * foodTypePenalty(order.foodType);
  // Boost for very tight deadlines
  if (mins < 20) score += 10;
  if (mins < 10) score += 20;
  return score;
}

// --- Phase 2: Assign orders to drivers (geographic clustering) ---

function createDrivers(count: number): Driver[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `נהג ${i + 1}`,
    color: DRIVER_COLORS[i % DRIVER_COLORS.length],
  }));
}

function centroid(orders: Order[]): { lat: number; lng: number } {
  if (orders.length === 0) return RESTAURANT_LOCATION;
  const lat = orders.reduce((sum, o) => sum + o.lat, 0) / orders.length;
  const lng = orders.reduce((sum, o) => sum + o.lng, 0) / orders.length;
  return { lat, lng };
}

function assignOrdersToDrivers(
  orders: Order[],
  driverCount: number
): Map<number, Order[]> {
  const assignments = new Map<number, Order[]>();
  for (let i = 0; i < driverCount; i++) assignments.set(i, []);

  if (orders.length === 0) return assignments;

  // Sort by urgency descending
  const sorted = [...orders].sort((a, b) => urgencyScore(b) - urgencyScore(a));

  // Seed: assign top-N urgent orders, one per driver
  const seeds = sorted.splice(0, Math.min(driverCount, sorted.length));
  seeds.forEach((order, i) => {
    assignments.get(i % driverCount)!.push(order);
  });

  // Assign remaining orders to nearest cluster centroid
  for (const order of sorted) {
    let bestDriver = 0;
    let bestDist = Infinity;
    for (let d = 0; d < driverCount; d++) {
      const c = centroid(assignments.get(d)!);
      const dist = haversine(order.lat, order.lng, c.lat, c.lng);
      if (dist < bestDist) {
        bestDist = dist;
        bestDriver = d;
      }
    }
    assignments.get(bestDriver)!.push(order);
  }

  // Balance pass: if one driver has 2x average, move lowest-urgency to least-loaded
  const avg = orders.length / driverCount;
  for (let d = 0; d < driverCount; d++) {
    const driverOrders = assignments.get(d)!;
    while (driverOrders.length > avg * 2 && driverOrders.length > 1) {
      // Find least-loaded driver
      let minDriver = -1;
      let minLoad = Infinity;
      for (let other = 0; other < driverCount; other++) {
        if (other === d) continue;
        if (assignments.get(other)!.length < minLoad) {
          minLoad = assignments.get(other)!.length;
          minDriver = other;
        }
      }
      if (minDriver === -1) break;
      // Move least urgent order
      driverOrders.sort((a, b) => urgencyScore(a) - urgencyScore(b));
      const moved = driverOrders.shift()!;
      assignments.get(minDriver)!.push(moved);
    }
  }

  // Merge pass: combine clusters whose centroids are within MERGE_DISTANCE_KM
  // This prevents sending 2 drivers to nearby locations
  for (let d1 = 0; d1 < driverCount; d1++) {
    if (assignments.get(d1)!.length === 0) continue;
    for (let d2 = d1 + 1; d2 < driverCount; d2++) {
      if (assignments.get(d2)!.length === 0) continue;
      const c1 = centroid(assignments.get(d1)!);
      const c2 = centroid(assignments.get(d2)!);
      const dist = haversine(c1.lat, c1.lng, c2.lat, c2.lng);
      if (dist <= MERGE_DISTANCE_KM) {
        // Merge d2 into d1
        assignments.get(d1)!.push(...assignments.get(d2)!);
        assignments.set(d2, []);
      }
    }
  }

  return assignments;
}

// --- Phase 3: Sequence stops per driver ---

function sequenceStops(orders: Order[]): Order[] {
  if (orders.length <= 1) return orders;

  const sequence: Order[] = [];
  const remaining = new Set(orders.map((o) => o.id));
  let currentLat = RESTAURANT_LOCATION.lat;
  let currentLng = RESTAURANT_LOCATION.lng;

  while (remaining.size > 0) {
    let bestOrder: Order | null = null;
    let bestScore = -Infinity;

    for (const order of orders) {
      if (!remaining.has(order.id)) continue;
      const dist = haversine(currentLat, currentLng, order.lat, order.lng);
      const proximity = dist > 0 ? 1 / dist : 100;
      const urg = urgencyScore(order);
      const score = 0.6 * proximity + 0.4 * urg;
      if (score > bestScore) {
        bestScore = score;
        bestOrder = order;
      }
    }

    if (!bestOrder) break;
    sequence.push(bestOrder);
    remaining.delete(bestOrder.id);
    currentLat = bestOrder.lat;
    currentLng = bestOrder.lng;
  }

  // Deadline feasibility: bubble up orders that would miss deadlines
  for (let i = 1; i < sequence.length; i++) {
    const eta = estimateArrivalMinutes(sequence, i);
    const mins = minutesUntilDeadline(sequence[i]);
    if (eta > mins && i > 0) {
      // Swap with previous
      [sequence[i], sequence[i - 1]] = [sequence[i - 1], sequence[i]];
    }
  }

  return sequence;
}

function estimateArrivalMinutes(sequence: Order[], stopIndex: number): number {
  let time = 0;
  let prevLat = RESTAURANT_LOCATION.lat;
  let prevLng = RESTAURANT_LOCATION.lng;

  for (let i = 0; i <= stopIndex; i++) {
    const dist = haversine(prevLat, prevLng, sequence[i].lat, sequence[i].lng);
    time += (dist / AVERAGE_SPEED_KMH) * 60 + STOP_TIME_MINUTES;
    prevLat = sequence[i].lat;
    prevLng = sequence[i].lng;
  }

  return time;
}

// --- Phase 4: Post-optimization inter-route swap ---

function postOptimizeSwap(routes: Map<number, Order[]>, driverCount: number) {
  for (let d1 = 0; d1 < driverCount; d1++) {
    for (let d2 = d1 + 1; d2 < driverCount; d2++) {
      const r1 = routes.get(d1)!;
      const r2 = routes.get(d2)!;

      for (let i = 0; i < r1.length; i++) {
        for (let j = 0; j < r2.length; j++) {
          const currentDist = totalRouteDistance(r1) + totalRouteDistance(r2);

          // Try swapping
          [r1[i], r2[j]] = [r2[j], r1[i]];
          const newDist = totalRouteDistance(r1) + totalRouteDistance(r2);

          if (newDist < currentDist) {
            // Keep any improvement
          } else {
            // Revert
            [r1[i], r2[j]] = [r2[j], r1[i]];
          }
        }
      }
    }
  }
}

function totalRouteDistance(orders: Order[]): number {
  let dist = 0;
  let prevLat = RESTAURANT_LOCATION.lat;
  let prevLng = RESTAURANT_LOCATION.lng;
  for (const order of orders) {
    dist += haversine(prevLat, prevLng, order.lat, order.lng);
    prevLat = order.lat;
    prevLng = order.lng;
  }
  return dist;
}

// --- Main optimizer ---

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function optimizeRoutes(
  orders: Order[],
  driverCount: number
): PlannedRoute[] {
  if (orders.length === 0 || driverCount === 0) return [];

  const effectiveDrivers = Math.min(driverCount, orders.length);
  const drivers = createDrivers(effectiveDrivers);

  // Phase 2: Assign
  const assignments = assignOrdersToDrivers(orders, effectiveDrivers);

  // Phase 4: Post-optimize swaps
  postOptimizeSwap(assignments, effectiveDrivers);

  // Phase 3: Sequence each driver's stops (skip empty drivers from merge pass)
  const activeDriverIds = Array.from({ length: effectiveDrivers }, (_, i) => i).filter(
    (d) => assignments.get(d)!.length > 0
  );

  const sequenced = new Map<number, Order[]>();
  for (const d of activeDriverIds) {
    sequenced.set(d, sequenceStops(assignments.get(d)!));
  }

  // Build planned routes with ETAs
  const routes: PlannedRoute[] = [];

  for (const d of activeDriverIds) {
    const driverOrders = sequenced.get(d)!;
    const stops: RouteStop[] = [];
    let prevLat = RESTAURANT_LOCATION.lat;
    let prevLng = RESTAURANT_LOCATION.lng;
    let cumulativeMinutes = 0;
    let totalDist = 0;

    for (const order of driverOrders) {
      const dist = haversine(prevLat, prevLng, order.lat, order.lng);
      const travelMin = (dist / AVERAGE_SPEED_KMH) * 60;
      cumulativeMinutes += travelMin + STOP_TIME_MINUTES;
      totalDist += dist;

      const arrival = new Date();
      arrival.setMinutes(arrival.getMinutes() + cumulativeMinutes);

      stops.push({
        order,
        estimatedArrival: formatTime(arrival),
        distanceFromPrev: Math.round(dist * 10) / 10,
      });

      prevLat = order.lat;
      prevLng = order.lng;
    }

    routes.push({
      driver: drivers[d],
      stops,
      totalDistance: Math.round(totalDist * 10) / 10,
      totalTime: Math.round(cumulativeMinutes),
    });
  }

  return routes;
}
