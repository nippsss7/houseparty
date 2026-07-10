// Mapbox Geocoding v6 — forward autocomplete (address suggestions while
// typing) and reverse lookup (pin → address). Uses the same public token as
// the map tiles.

const BASE_URL = "https://api.mapbox.com/search/geocode/v6";

export interface AddressSuggestion {
  id: string;
  /** Full printable address, e.g. "12 Example St, Newtown NSW 2042, Australia" */
  fullAddress: string;
  /** Street part only, for the address field */
  addressLine: string;
  city: string;
  lat: number;
  lng: number;
}

interface GeocodeFeature {
  id: string;
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    full_address?: string;
    place_formatted?: string;
    context?: {
      place?: { name?: string };
      locality?: { name?: string };
      region?: { name?: string };
    };
  };
}

function token() {
  const value = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!value) throw new Error("Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");
  return value;
}

function toSuggestion(feature: GeocodeFeature): AddressSuggestion {
  const context = feature.properties.context;
  return {
    id: feature.id,
    fullAddress: feature.properties.full_address ?? feature.properties.name ?? "",
    addressLine: feature.properties.name ?? feature.properties.full_address ?? "",
    city: context?.place?.name ?? context?.locality?.name ?? context?.region?.name ?? "",
    lng: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1],
  };
}

/** Type-ahead address suggestions, optionally biased towards a map position. */
export async function suggestAddresses(
  query: string,
  proximity?: [number, number] | null
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    access_token: token(),
    autocomplete: "true",
    limit: "5",
    types: "address,street,place",
  });
  if (proximity) params.set("proximity", `${proximity[0]},${proximity[1]}`);

  const response = await fetch(`${BASE_URL}/forward?${params}`);
  if (!response.ok) throw new Error(`Geocoding failed (${response.status})`);
  const body = (await response.json()) as { features?: GeocodeFeature[] };
  return (body.features ?? []).map(toSuggestion).filter((s) => s.fullAddress);
}

/** Nearest address for a dropped/dragged pin. Null when nothing is nearby. */
export async function reverseGeocode(lng: number, lat: number): Promise<AddressSuggestion | null> {
  const params = new URLSearchParams({
    longitude: String(lng),
    latitude: String(lat),
    access_token: token(),
    types: "address,street",
    limit: "1",
  });

  const response = await fetch(`${BASE_URL}/reverse?${params}`);
  if (!response.ok) throw new Error(`Reverse geocoding failed (${response.status})`);
  const body = (await response.json()) as { features?: GeocodeFeature[] };
  const feature = body.features?.[0];
  return feature ? toSuggestion(feature) : null;
}
