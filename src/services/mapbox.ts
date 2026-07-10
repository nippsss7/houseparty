import Mapbox from "@rnmapbox/maps";

// Import this module (for the side effect) before rendering any Mapbox view.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null);

export { Mapbox };
