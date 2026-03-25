"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useDelivery } from "@/context/DeliveryContext";
import { RESTAURANT_LOCATION, FOOD_TYPE_LABELS } from "@/constants";

// Fix default marker icons in webpack/next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createColoredIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

const restaurantIcon = L.divIcon({
  className: "restaurant-marker",
  html: `<div style="background:#1a1a2e;width:32px;height:32px;border-radius:50%;border:3px solid #e74c3c;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:16px;">🏠</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

function MapBoundsUpdater() {
  const map = useMap();
  const { orders } = useDelivery();

  useEffect(() => {
    const points: L.LatLngTuple[] = [
      [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
      ...orders.map((o) => [o.lat, o.lng] as L.LatLngTuple),
    ];
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [orders, map]);

  return null;
}

export default function RouteMap() {
  const { orders, routes } = useDelivery();

  // Map order id -> driver color when routes are computed
  const orderDriverColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const route of routes) {
      for (const stop of route.stops) {
        map.set(stop.order.id, route.driver.color);
      }
    }
    return map;
  }, [routes]);

  // Build polyline points per route — use real road geometry when available
  const polylines = useMemo(() => {
    return routes.map((route) => ({
      color: route.driver.color,
      positions: route.routeGeometry
        ? route.routeGeometry.map(([lat, lng]) => [lat, lng] as L.LatLngTuple)
        : [
            [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng] as L.LatLngTuple,
            ...route.stops.map(
              (s) => [s.order.lat, s.order.lng] as L.LatLngTuple
            ),
          ],
    }));
  }, [routes]);

  return (
    <MapContainer
      center={[RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]}
      zoom={13}
      className="w-full h-full rounded-lg"
      style={{ minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapBoundsUpdater />

      {/* Restaurant marker */}
      <Marker
        position={[RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]}
        icon={restaurantIcon}
      >
        <Popup>{RESTAURANT_LOCATION.name}</Popup>
      </Marker>

      {/* Order markers */}
      {orders.map((order) => {
        const color = orderDriverColor.get(order.id);
        const icon = color
          ? createColoredIcon(color)
          : createColoredIcon("#6b7280");
        return (
          <Marker
            key={order.id}
            position={[order.lat, order.lng]}
            icon={icon}
          >
            <Popup>
              <div className="text-sm" dir="rtl">
                <strong>{order.address}</strong>
                <br />
                {FOOD_TYPE_LABELS[order.foodType]} · דדליין: {order.deadline}
                {order.notes && (
                  <>
                    <br />
                    {order.notes}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Route polylines */}
      {polylines.map((pl, i) => (
        <Polyline
          key={i}
          positions={pl.positions}
          pathOptions={{
            color: pl.color,
            weight: 4,
            opacity: 0.8,
          }}
        />
      ))}
    </MapContainer>
  );
}
