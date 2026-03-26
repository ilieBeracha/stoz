import { Order, Driver, PlannedRoute, RouteStop } from "./types";
import { haversine } from "./distance";
import {
  RESTAURANT_LOCATION,
  DRIVER_COLORS,
  AVERAGE_SPEED_KMH,
  STOP_TIME_MINUTES,
} from "@/constants";

// --- Urgency scoring ---

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
  return Math.max(diff, 1);
}

function urgencyScore(order: Order): number {
  const mins = minutesUntilDeadline(order);
  const timeWeight = 10;
  const foodWeight = 5;
  let score =
    timeWeight * (1 / mins) + foodWeight * foodTypePenalty(order.foodType);
  if (mins < 20) score += 10;
  if (mins < 10) score += 20;
  return score;
}

// --- Helpers ---

function centroid(orders: Order[]): { lat: number; lng: number } {
  if (orders.length === 0) return RESTAURANT_LOCATION;
  const lat = orders.reduce((sum, o) => sum + o.lat, 0) / orders.length;
  const lng = orders.reduce((sum, o) => sum + o.lng, 0) / orders.length;
  return { lat, lng };
}

function clusterSpread(orders: Order[]): number {
  if (orders.length <= 1) return 0;
  let maxDist = 0;
  for (let i = 0; i < orders.length; i++) {
    for (let j = i + 1; j < orders.length; j++) {
      const d = haversine(
        orders[i].lat, orders[i].lng,
        orders[j].lat, orders[j].lng
      );
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

/** Greedy nearest-neighbor route from restaurant */
function greedySequence(orders: Order[]): Order[] {
  if (orders.length <= 1) return [...orders];
  const sequence: Order[] = [];
  const remaining = new Set(orders.map((o) => o.id));
  let curLat = RESTAURANT_LOCATION.lat;
  let curLng = RESTAURANT_LOCATION.lng;

  while (remaining.size > 0) {
    let bestDist = Infinity;
    let bestOrder: Order | null = null;
    for (const order of orders) {
      if (!remaining.has(order.id)) continue;
      const d = haversine(curLat, curLng, order.lat, order.lng);
      if (d < bestDist) {
        bestDist = d;
        bestOrder = order;
      }
    }
    if (!bestOrder) break;
    sequence.push(bestOrder);
    remaining.delete(bestOrder.id);
    curLat = bestOrder.lat;
    curLng = bestOrder.lng;
  }
  return sequence;
}

/** Estimate total route time in minutes for a sequenced list */
function routeTimeMinutes(sequence: Order[]): number {
  let time = 0;
  let prevLat = RESTAURANT_LOCATION.lat;
  let prevLng = RESTAURANT_LOCATION.lng;
  for (const order of sequence) {
    const dist = haversine(prevLat, prevLng, order.lat, order.lng);
    time += (dist / AVERAGE_SPEED_KMH) * 60 + STOP_TIME_MINUTES;
    prevLat = order.lat;
    prevLng = order.lng;
  }
  return time;
}

/** Check if any order would miss its deadline with this single-driver route */
function wouldMissDeadline(orders: Order[]): boolean {
  if (orders.length === 0) return false;
  const seq = greedySequence(orders);
  let time = 0;
  let prevLat = RESTAURANT_LOCATION.lat;
  let prevLng = RESTAURANT_LOCATION.lng;
  let hasActiveFutureDeadline = false;

  for (const order of seq) {
    const dist = haversine(prevLat, prevLng, order.lat, order.lng);
    time += (dist / AVERAGE_SPEED_KMH) * 60 + STOP_TIME_MINUTES;
    const deadline = minutesUntilDeadline(order);

    // Only consider deadlines that are still in the future (> 5 min remaining)
    // Expired deadlines should not trigger splitting — the food is already late
    if (deadline > 5) {
      hasActiveFutureDeadline = true;
      if (time > deadline * 0.9) return true;
    }

    prevLat = order.lat;
    prevLng = order.lng;
  }

  // If no active future deadlines, don't split based on time
  if (!hasActiveFutureDeadline) return false;

  return false;
}

// --- Clustering ---

/**
 * Determine if a cluster needs splitting.
 * Split only when:
 * 1. A single driver would miss deadlines, OR
 * 2. The cluster spans genuinely separate areas (spread > 8km)
 *
 * Returns a priority score (0 = don't split, higher = more urgent).
 */
function splitPriority(orders: Order[]): number {
  if (orders.length < 2) return 0;

  // Check deadline risk — highest priority to split
  if (wouldMissDeadline(orders)) {
    return 100 + routeTimeMinutes(greedySequence(orders));
  }

  // Check if genuinely separate areas (e.g., different cities)
  const spread = clusterSpread(orders);
  if (spread > 8) return spread;

  return 0; // Don't split — one driver can handle it
}

/** K-means reassignment until stable */
function reassignToCentroids(
  allOrders: Order[],
  clusters: Order[][]
): Order[][] {
  for (let iter = 0; iter < 20; iter++) {
    const centroids = clusters.map((c) => centroid(c));
    const newClusters: Order[][] = clusters.map(() => []);

    for (const order of allOrders) {
      let bestCluster = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = haversine(
          order.lat, order.lng,
          centroids[c].lat, centroids[c].lng
        );
        if (d < bestDist) {
          bestDist = d;
          bestCluster = c;
        }
      }
      newClusters[bestCluster].push(order);
    }

    // Handle empty clusters — remove them
    const nonEmpty = newClusters.filter((c) => c.length > 0);
    if (nonEmpty.length < clusters.length) {
      clusters = nonEmpty;
      continue;
    }

    let changed = false;
    for (let c = 0; c < clusters.length; c++) {
      if (clusters[c].length !== newClusters[c].length) {
        changed = true;
        break;
      }
      const ids1 = new Set(clusters[c].map((o) => o.id));
      for (const o of newClusters[c]) {
        if (!ids1.has(o.id)) { changed = true; break; }
      }
      if (changed) break;
    }

    clusters = newClusters;
    if (!changed) break;
  }

  return clusters;
}

/**
 * Bottom-up clustering with time-based splitting.
 * Only splits when a single driver would miss deadlines or
 * when orders are in genuinely separate areas (>8km spread).
 */
function clusterOrders(orders: Order[], maxDrivers: number): Order[][] {
  if (orders.length === 0) return [];
  if (orders.length === 1 || maxDrivers === 1) return [orders];

  let clusters: Order[][] = [orders];

  while (clusters.length < maxDrivers) {
    // Find cluster that most needs splitting
    let worstIdx = -1;
    let worstPriority = 0;
    for (let i = 0; i < clusters.length; i++) {
      const priority = splitPriority(clusters[i]);
      if (priority > worstPriority) {
        worstPriority = priority;
        worstIdx = i;
      }
    }

    // Nothing needs splitting
    if (worstIdx === -1) break;

    // Split by most distant pair
    const toSplit = clusters[worstIdx];
    let maxDist = 0;
    let seedA = toSplit[0];
    let seedB = toSplit[1];
    for (let i = 0; i < toSplit.length; i++) {
      for (let j = i + 1; j < toSplit.length; j++) {
        const d = haversine(
          toSplit[i].lat, toSplit[i].lng,
          toSplit[j].lat, toSplit[j].lng
        );
        if (d > maxDist) {
          maxDist = d;
          seedA = toSplit[i];
          seedB = toSplit[j];
        }
      }
    }

    // Create two clusters with seeds
    clusters[worstIdx] = [seedA];
    const newCluster: Order[] = [seedB];
    const unassigned = toSplit.filter(
      (o) => o.id !== seedA.id && o.id !== seedB.id
    );
    clusters[worstIdx].push(...unassigned);
    clusters.push(newCluster);

    // Reassign all orders by nearest centroid
    const allOrders = clusters.flat();
    clusters = reassignToCentroids(allOrders, clusters);
    clusters = clusters.filter((c) => c.length > 0);
  }

  return clusters;
}

// --- Post-optimization ---

function postOptimize(clusters: Order[][]): void {
  for (let round = 0; round < 3; round++) {
    let improved = false;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = 0; j < clusters.length; j++) {
        if (i === j || clusters[i].length === 0) continue;

        // Try moving each order from cluster i to cluster j
        for (let a = clusters[i].length - 1; a >= 0; a--) {
          if (clusters[i].length <= 1) break;

          const order = clusters[i][a];
          const seqI = greedySequence(clusters[i]);
          const seqJ = greedySequence(clusters[j]);
          const currentTotal = routeTimeMinutes(seqI) + routeTimeMinutes(seqJ);

          const newI = clusters[i].filter((_, idx) => idx !== a);
          const newJ = [...clusters[j], order];
          const newTotal =
            routeTimeMinutes(greedySequence(newI)) +
            routeTimeMinutes(greedySequence(newJ));

          if (newTotal < currentTotal - 0.5) {
            clusters[i] = newI;
            clusters[j] = newJ;
            improved = true;
          }
        }
      }
    }

    if (!improved) break;
  }

  // Remove empty clusters
  for (let i = clusters.length - 1; i >= 0; i--) {
    if (clusters[i].length === 0) clusters.splice(i, 1);
  }
}

// --- Sequence stops per driver (with urgency weighting) ---

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

// --- Main optimizer ---

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function createDrivers(count: number): Driver[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `נהג ${i + 1}`,
    color: DRIVER_COLORS[i % DRIVER_COLORS.length],
  }));
}

export function optimizeRoutes(
  orders: Order[],
  driverCount: number
): PlannedRoute[] {
  if (orders.length === 0 || driverCount === 0) return [];

  let clusters = clusterOrders(orders, driverCount);
  postOptimize(clusters);
  clusters = clusters.filter((c) => c.length > 0);

  const drivers = createDrivers(clusters.length);
  const routes: PlannedRoute[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const sequenced = sequenceStops(clusters[i]);
    const stops: RouteStop[] = [];
    let prevLat = RESTAURANT_LOCATION.lat;
    let prevLng = RESTAURANT_LOCATION.lng;
    let cumulativeMinutes = 0;
    let totalDist = 0;

    for (const order of sequenced) {
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
      driver: drivers[i],
      stops,
      totalDistance: Math.round(totalDist * 10) / 10,
      totalTime: Math.round(cumulativeMinutes),
    });
  }

  return routes;
}
