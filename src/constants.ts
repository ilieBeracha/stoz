export const RESTAURANT_LOCATION = {
  lat: 32.1480855,
  lng: 34.8046248,
  name: "המסעדה",
};

export const DRIVER_COLORS = [
  "#e74c3c", // red
  "#3498db", // blue
  "#2ecc71", // green
  "#f39c12", // orange
  "#9b59b6", // purple
  "#1abc9c", // teal
];

export const AVERAGE_SPEED_KMH = 30;
export const STOP_TIME_MINUTES = 3;
export const MAX_DRIVERS = 6;
export const MERGE_DISTANCE_KM = 3; // Clusters closer than this get merged to one driver

export const FOOD_TYPE_LABELS: Record<string, string> = {
  warm: "חם",
  sushi: "סושי",
  both: "חם + סושי",
};

export const ALLOWED_CITIES = ["הרצליה", "רמת השרון", "כפר שמריהו", "רשפון"];

// Bounding box covering the 4 allowed cities
export const SEARCH_VIEWBOX = {
  minLat: 32.12,
  maxLat: 32.19,
  minLng: 34.77,
  maxLng: 34.84,
};
