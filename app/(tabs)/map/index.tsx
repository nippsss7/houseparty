import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { eventPhotoUrl, fetchNearbyEvents, type NearbyEvent } from "@/features/events/api";
import { eventCategoryOptions } from "@/features/events/schemas";
import { Mapbox } from "@/services/mapbox";
import { colors, radii, spacing, typography } from "@/lib/theme";

const DEFAULT_CENTER: [number, number] = [151.2093, -33.8688];

/** Straight-line meters between two lng/lat pairs (haversine). */
function metersBetween([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const shapeSourceRef = useRef<Mapbox.ShapeSource>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [searchArea, setSearchArea] = useState<{ center: [number, number]; radius: number }>({
    center: DEFAULT_CENTER,
    radius: 25000,
  });
  const [selected, setSelected] = useState<NearbyEvent | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      setLocationGranted(true);
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      if (position) {
        const center: [number, number] = [position.coords.longitude, position.coords.latitude];
        cameraRef.current?.setCamera({ centerCoordinate: center, zoomLevel: 11, animationDuration: 0 });
        setSearchArea({ center, radius: 25000 });
      }
    })();
  }, []);

  const { data: events = [] } = useQuery({
    queryKey: [
      "nearby-events",
      searchArea.center[0].toFixed(3),
      searchArea.center[1].toFixed(3),
      Math.round(searchArea.radius),
    ],
    queryFn: () =>
      fetchNearbyEvents({
        lat: searchArea.center[1],
        lng: searchArea.center[0],
        radiusMeters: searchArea.radius,
      }),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const geojson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: events.map((event) => ({
        type: "Feature",
        id: event.id,
        geometry: { type: "Point", coordinates: [event.lng, event.lat] },
        properties: { id: event.id },
      })),
    }),
    [events]
  );

  const onMapIdle = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const center = (await map.getCenter()) as [number, number];
      const bounds = await map.getVisibleBounds();
      // Cover the visible viewport (center → NE corner) with margin so pins
      // just off-screen are already loaded when the user pans.
      const radius = Math.max(2000, metersBetween(center, bounds[0] as [number, number]) * 1.2);
      setSearchArea({ center, radius: Math.min(radius, 200000) });
    } catch {
      // map not ready yet
    }
  }, []);

  const onSourcePress = useCallback(
    async (pressed: { features: GeoJSON.Feature[] }) => {
      const feature = pressed.features[0];
      if (!feature) return;

      if (feature.properties?.cluster) {
        const zoom = await shapeSourceRef.current?.getClusterExpansionZoom(feature);
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        cameraRef.current?.setCamera({
          centerCoordinate: coordinates,
          zoomLevel: (zoom ?? 12) + 0.5,
          animationDuration: 350,
        });
        return;
      }

      const event = events.find((candidate) => candidate.id === feature.properties?.id);
      if (event) {
        setSelected(event);
        sheetRef.current?.expand();
        cameraRef.current?.setCamera({
          centerCoordinate: [event.lng, event.lat],
          animationDuration: 350,
        });
      }
    },
    [events]
  );

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Dark}
        logoEnabled={false}
        attributionPosition={{ bottom: 8, left: 8 }}
        scaleBarEnabled={false}
        onMapIdle={onMapIdle}
        onPress={() => {
          setSelected(null);
          sheetRef.current?.close();
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: DEFAULT_CENTER, zoomLevel: 10 }}
        />
        {locationGranted && <Mapbox.UserLocation visible />}

        <Mapbox.ShapeSource
          id="events"
          ref={shapeSourceRef}
          shape={geojson}
          cluster
          clusterRadius={44}
          clusterMaxZoomLevel={14}
          onPress={onSourcePress}
        >
          <Mapbox.CircleLayer
            id="event-clusters"
            filter={["has", "point_count"]}
            style={{
              circleColor: colors.primary,
              circleRadius: ["step", ["get", "point_count"], 16, 10, 20, 25, 24],
              circleStrokeWidth: 2,
              circleStrokeColor: colors.white,
            }}
          />
          <Mapbox.SymbolLayer
            id="event-cluster-counts"
            filter={["has", "point_count"]}
            style={{
              textField: ["get", "point_count_abbreviated"],
              textSize: 13,
              textColor: colors.white,
              textIgnorePlacement: true,
              textAllowOverlap: true,
            }}
          />
          <Mapbox.CircleLayer
            id="event-pins"
            filter={["!", ["has", "point_count"]]}
            style={{
              circleColor: colors.primary,
              circleRadius: 9,
              circleStrokeWidth: 2.5,
              circleStrokeColor: colors.white,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      <SafeAreaView style={styles.overlay} edges={["top"]} pointerEvents="box-none">
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {events.length === 0
              ? "No parties around here yet"
              : `${events.length} ${events.length === 1 ? "party" : "parties"} nearby`}
          </Text>
        </View>
      </SafeAreaView>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={[240]}
        enablePanDownToClose
        onClose={() => setSelected(null)}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          {selected && (
            <EventPreview event={selected} onOpen={() => router.push(`/event/${selected.id}`)} />
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

function EventPreview({ event, onOpen }: { event: NearbyEvent; onOpen: () => void }) {
  const categoryLabel =
    eventCategoryOptions.find((option) => option.value === event.category)?.label ?? event.category;
  const distanceKm = event.distance_meters / 1000;
  const startsAt = new Date(event.start_at);

  return (
    <Pressable style={styles.preview} onPress={onOpen}>
      {event.cover_photo_path ? (
        <Image source={{ uri: eventPhotoUrl(event.cover_photo_path) }} style={styles.previewImage} />
      ) : (
        <View style={[styles.previewImage, styles.previewImageFallback]}>
          <Text style={styles.previewImageEmoji}>🎉</Text>
        </View>
      )}
      <View style={styles.previewBody}>
        <Text style={styles.previewCategory}>
          {categoryLabel.toUpperCase()} · {distanceKm < 1 ? "<1" : distanceKm.toFixed(1)} KM AWAY
        </Text>
        <Text style={typography.heading} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.previewMeta}>
          {startsAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
          {startsAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          {" · "}
          {Number(event.price_per_person) > 0 ? `$${event.price_per_person}/person` : "Free"}
        </Text>
        <Text style={styles.previewMeta}>
          {event.capacity - event.current_rsvp_count} of {event.capacity} spots left
        </Text>
        <Text style={styles.previewLink}>View details →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  badge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { ...typography.caption, color: colors.text, fontWeight: "600" },
  sheetBackground: { backgroundColor: colors.surfaceElevated },
  sheetHandle: { backgroundColor: colors.textFaint },
  sheetContent: { flex: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  preview: { flexDirection: "row", gap: spacing.md },
  previewImage: { width: 110, height: 150, borderRadius: radii.md },
  previewImageFallback: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImageEmoji: { fontSize: 40 },
  previewBody: { flex: 1, gap: spacing.xs, paddingTop: spacing.xs },
  previewCategory: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  previewMeta: { ...typography.caption, color: colors.textMuted },
  previewLink: { ...typography.label, color: colors.primary, marginTop: spacing.xs },
});
