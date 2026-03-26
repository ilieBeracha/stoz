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

// --- Bottom-up clustering: start with 1 group, split only when needed ---

/** Find the max distance between any two orders in a group */
function clusterSpread(orders: Order[]): number {
  if (orders.length <= 1) return 0;
  let maxDist = 0;
  for (let i = 0; i < orders.length; i++) {
    for (let j = i + 1; j < orders.length; j++) {
      const d = haversine(
        orders[i].lat,
        orders[i].lng,
        orders[j].lat,
        orders[j].lng
      );
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

/** Find the two most distant orders in a group (for splitting) */
function findMostDistantPair(
  orders: Order[]
): [Order, Order] {
  let maxDist = 0;
  let a = orders[0];
  let b = orders[1];
  for (let i = 0; i < orders.length; i++) {
    for (let j = i + 1; j < orders.length; j++) {
      const d = haversine(
        orders[i].lat,
        orders[i].lng,
        orders[j].lat,
        orders[j].lng
      );
      if (d > maxDist) {
        maxDist = d;
        a = orders[i];
        b = orders[j];
      }
    }
  }
  return [a, b];
}

/** Split a group of orders into 2 clusters around the two most distant orders */
function splitCluster(orders: Order[]): [Order[], Order[]] {
  const [seedA, seedB] = findMostDistantPair(orders);
  const clusterA: Order[] = [seedA];
  const clusterB: Order[] = [seedB];

  for (const order of orders) {
    if (order.id === seedA.id || order.id === seedB.id) continue;
    const distA = haversine(order.lat, order.lng, seedA.lat, seedA.lng);
    const distB = haversine(order.lat, order.lng, seedB.lat, seedB.lng);
    if (distA <= distB) {
      clusterA.push(order);
    } else {
      clusterB.push(order);
    }
  }

  return [clusterA, clusterB];
}

/**
 * Bottom-up clustering: start with all orders in 1 group.
 * Only split a group when its spread exceeds MERGE_DISTANCE_KM.
 * Never exceed maxDrivers.
 */
function clusterOrders(
  orders: Order[],
  maxDrivers: number
): Order[][] {
  if (orders.length === 0) return [];
  if (orders.length === 1 || maxDrivers === 1) return [orders];

  // Start with all orders in one cluster
  let clusters: Order[][] = [orders];

  // Keep splitting the widest cluster until we can't or shouldn't
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

    // If the worst spread is within threshold, stop splitting — one driver can handle it
    if (worstIdx === -1 || worstSpread <= MERGE_DISTANCE_KM) break;

    // Split that cluster
    const [a, b] = splitCluster(clusters[worstIdx]);
    clusters.splice(worstIdx, 1, a, b);
  }

  return clusters;
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

// --- Post-optimization: try moving orders between drivers ---

function postOptimize(clusters: Order[][]): void {
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      if (clusters[i].length === 0 || clusters[j].length === 0) continue;

      // Try swapping each pair
      for (let a = 0; a < clusters[i].length; a++) {
        for (let b = 0; b < clusters[j].length; b++) {
          const currentDist =
            totalRouteDistance(clusters[i]) + totalRouteDistance(clusters[j]);

          [clusters[i][a], clusters[j][b]] = [clusters[j][b], clusters[i][a]];
          const newDist =
            totalRouteDistance(clusters[i]) + totalRouteDistance(clusters[j]);

          if (newDist >= currentDist) {
            // Revert
            [clusters[i][a], clusters[j][b]] = [clusters[j][b], clusters[i][a]];
          }
        }
      }

      // Try moving an order from i to j or j to i if it reduces total distance
      for (let a = clusters[i].length - 1; a >= 0; a--) {
        if (clusters[i].length <= 1) break;
        const order = clusters[i][a];
        const currentDist =
          totalRouteDistance(clusters[i]) + totalRouteDistance(clusters[j]);

        clusters[i].splice(a, 1);
        clusters[j].push(order);
        const newDist =
          totalRouteDistance(clusters[i]) + totalRouteDistance(clusters[j]);

        if (newDist >= currentDist) {
          // Revert
          clusters[j].pop();
          clusters[i].splice(a, 0, order);
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

  // Bottom-up: cluster by distance, only use multiple drivers when justified
  const clusters = clusterOrders(orders, driverCount);

  // Post-optimize: try swaps/moves between clusters
  postOptimize(clusters);

  // Filter out empty clusters
  const activeClusters = clusters.filter((c) => c.length > 0);

  // Create drivers for the number of clusters actually needed
  const drivers = createDrivers(activeClusters.length);

  // Sequence each cluster and build routes
  const routes: PlannedRoute[] = [];

  for (let i = 0; i < activeClusters.length; i++) {
    const sequenced = sequenceStops(activeClusters[i]);
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
