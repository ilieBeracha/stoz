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

// Allowed cities and their common spelling variants in Nominatim results
export const ALLOWED_CITIES = [
  "הרצליה",
  "הרצלייה",
  "Herzliya",
  "רמת השרון",
  "רמת-השרון",
  "Ramat HaSharon",
  "Ramat Hasharon",
  "כפר שמריהו",
  "Kfar Shmaryahu",
  "רשפון",
  "Rishpon",
];

// Bounding box covering הרצליה, רמת השרון, כפר שמריהו, רשפון (generous margins)
export const SEARCH_VIEWBOX = {
  minLat: 32.08,
  maxLat: 32.20,
  minLng: 34.75,
  maxLng: 34.87,
};
