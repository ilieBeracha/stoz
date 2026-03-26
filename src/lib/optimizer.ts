import { Order, Driver, PlannedRoute, RouteStop } from "./types";
import { haversine } from "./distance";
import {
  RESTAURANT_LOCATION,
  DRIVER_COLORS,
  AVERAGE_SPEED_KMH,
  STOP_TIME_MINUTES,
  MERGE_DISTANCE_KM,
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

/** Max distance between any two orders in a group */
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

/** Optimal route distance: sequence by nearest-neighbor from restaurant */
function optimalRouteDistance(orders: Order[]): number {
  if (orders.length === 0) return 0;
  const visited: Order[] = [];
  const remaining = new Set(orders.map((o) => o.id));
  let curLat = RESTAURANT_LOCATION.lat;
  let curLng = RESTAURANT_LOCATION.lng;
  let totalDist = 0;

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
    totalDist += bestDist;
    remaining.delete(bestOrder.id);
    visited.push(bestOrder);
    curLat = bestOrder.lat;
    curLng = bestOrder.lng;
  }

  return totalDist;
}

// --- Clustering ---

/**
 * K-means style reassignment: given cluster centroids, reassign every order
 * to its nearest centroid. Repeat until stable.
 */
function reassignToCentroids(
  allOrders: Order[],
  clusters: Order[][]
): Order[][] {
  for (let iter = 0; iter < 20; iter++) {
    // Compute centroids
    const centroids = clusters.map((c) => centroid(c));

    // Reassign each order to nearest centroid
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

    // Check if anything changed
    let changed = false;
    for (let c = 0; c < clusters.length; c++) {
      if (clusters[c].length !== newClusters[c].length) {
        changed = true;
        break;
      }
      const ids1 = new Set(clusters[c].map((o) => o.id));
      const ids2 = new Set(newClusters[c].map((o) => o.id));
      for (const id of ids1) {
        if (!ids2.has(id)) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }

    clusters = newClusters;
    if (!changed) break;
  }

  return clusters;
}

/**
 * Bottom-up clustering with centroid reassignment.
 * 1. Start with all orders in 1 group
 * 2. Split widest cluster if spread > MERGE_DISTANCE_KM
 * 3. After each split, reassign ALL orders to nearest centroid (k-means)
 * 4. Stop when no cluster needs splitting or max drivers reached
 */
function clusterOrders(
  orders: Order[],
  maxDrivers: number
): Order[][] {
  if (orders.length === 0) return [];
  if (orders.length === 1 || maxDrivers === 1) return [orders];

  let clusters: Order[][] = [orders];

  while (clusters.length < maxDrivers) {
    // Find the cluster with the largest spread
    let worstIdx = -1;
    let worstSpread = 0;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].length < 2) continue;
      const spread = clusterSpread(clusters[i]);
      if (spread > worstSpread) {
        worstSpread = spread;
        worstIdx = i;
      }
    }

    // Stop if no cluster exceeds the threshold
    if (worstIdx === -1 || worstSpread <= MERGE_DISTANCE_KM) break;

    // Find the two most distant orders in that cluster as new seeds
    const clusterToSplit = clusters[worstIdx];
    let maxDist = 0;
    let seedA = clusterToSplit[0];
    let seedB = clusterToSplit[1];
    for (let i = 0; i < clusterToSplit.length; i++) {
      for (let j = i + 1; j < clusterToSplit.length; j++) {
        const d = haversine(
          clusterToSplit[i].lat, clusterToSplit[i].lng,
          clusterToSplit[j].lat, clusterToSplit[j].lng
        );
        if (d > maxDist) {
          maxDist = d;
          seedA = clusterToSplit[i];
          seedB = clusterToSplit[j];
        }
      }
    }

    // Create new cluster with seedB, keep seedA in existing
    const newCluster: Order[] = [seedB];
    clusters[worstIdx] = [seedA];
    // Temporarily add unassigned orders back
    const unassigned = clusterToSplit.filter(
      (o) => o.id !== seedA.id && o.id !== seedB.id
    );
    // Put them all in the first cluster temporarily
    clusters[worstIdx].push(...unassigned);
    clusters.push(newCluster);

    // Reassign ALL orders across ALL clusters by nearest centroid
    const allOrders = clusters.flat();
    clusters = reassignToCentroids(allOrders, clusters);

    // Remove any empty clusters
    clusters = clusters.filter((c) => c.length > 0);
  }

  return clusters;
}

// --- Post-optimization: move orders between clusters if it reduces total ---

function postOptimize(clusters: Order[][]): void {
  // Multiple rounds — one move can enable further improvements
  for (let round = 0; round < 3; round++) {
    let improved = false;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = 0; j < clusters.length; j++) {
        if (i === j) continue;
        if (clusters[i].length === 0) continue;

        // Try moving each order from cluster i to cluster j
        for (let a = clusters[i].length - 1; a >= 0; a--) {
          if (clusters[i].length <= 1) break;

          const order = clusters[i][a];

          // Use optimal (nearest-neighbor sequenced) route distance
          const currentTotal =
            optimalRouteDistance(clusters[i]) +
            optimalRouteDistance(clusters[j]);

          const newI = clusters[i].filter((_, idx) => idx !== a);
          const newJ = [...clusters[j], order];
          const newTotal =
            optimalRouteDistance(newI) + optimalRouteDistance(newJ);

          if (newTotal < currentTotal - 0.1) {
            // Keep the move (0.1km threshold to avoid floating point noise)
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

// --- Sequence stops per driver ---

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

  // Cluster by distance — only split when distance justifies it
  let clusters = clusterOrders(orders, driverCount);

  // Post-optimize: move orders between clusters using optimal route distances
  postOptimize(clusters);

  // Filter empty clusters
  clusters = clusters.filter((c) => c.length > 0);

  // Create drivers for clusters actually used
  const drivers = createDrivers(clusters.length);

  // Sequence each cluster and build routes
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
