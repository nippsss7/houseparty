import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { TextField } from "@/components/TextField";
import {
  reverseGeocode,
  suggestAddresses,
  type AddressSuggestion,
} from "@/features/events/geocoding";
import { eventLocationScheduleSchema } from "@/features/events/schemas";
import { Mapbox } from "@/services/mapbox";
import { useCreateEventStore } from "@/stores/createEventStore";
import { colors, radii, spacing, typography } from "@/lib/theme";

const DEFAULT_CENTER: [number, number] = [151.2093, -33.8688]; // Sydney; replaced by user location when granted

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d;
}

export default function CreateEventWhereWhenScreen() {
  const router = useRouter();
  const saved = useCreateEventStore((s) => s.locationSchedule);
  const setLocationSchedule = useCreateEventStore((s) => s.setLocationSchedule);

  const [pin, setPin] = useState<[number, number] | null>(saved ? [saved.lng, saved.lat] : null);
  const [address, setAddress] = useState(saved?.address ?? "");
  const [city, setCity] = useState(saved?.city ?? "");
  const [startAt, setStartAt] = useState<Date>(saved?.startAt ?? defaultStart());
  const [endAt, setEndAt] = useState<Date>(
    saved?.endAt ?? new Date(defaultStart().getTime() + 4 * 60 * 60 * 1000)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  // While true the user is actively typing, so the suggestions dropdown may
  // show; programmatic fills (suggestion tap, pin drag) turn it off.
  const [isTypingAddress, setIsTypingAddress] = useState(false);
  const [debouncedAddress, setDebouncedAddress] = useState("");
  const cameraRef = useRef<Mapbox.Camera>(null);
  const userLocation = useRef<[number, number] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAddress(address.trim()), 350);
    return () => clearTimeout(timer);
  }, [address]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const position = await Location.getLastKnownPositionAsync();
      if (position) {
        userLocation.current = [position.coords.longitude, position.coords.latitude];
        if (!pin) {
          cameraRef.current?.setCamera({
            centerCoordinate: userLocation.current,
            zoomLevel: 12,
            animationDuration: 0,
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: suggestions = [], isFetching: isSuggesting } = useQuery({
    queryKey: ["address-suggest", debouncedAddress],
    queryFn: () => suggestAddresses(debouncedAddress, pin ?? userLocation.current),
    enabled: isTypingAddress && debouncedAddress.length >= 4,
    staleTime: 60_000,
  });

  const applySuggestion = (suggestion: AddressSuggestion) => {
    setIsTypingAddress(false);
    setAddress(suggestion.addressLine);
    if (suggestion.city) setCity(suggestion.city);
    const coordinates: [number, number] = [suggestion.lng, suggestion.lat];
    setPin(coordinates);
    cameraRef.current?.setCamera({
      centerCoordinate: coordinates,
      zoomLevel: 15,
      animationDuration: 400,
    });
  };

  const onPinMoved = async (coordinates: [number, number]) => {
    setIsTypingAddress(false);
    setPin(coordinates);
    setIsReverseGeocoding(true);
    try {
      const nearest = await reverseGeocode(coordinates[0], coordinates[1]);
      if (nearest) {
        setAddress(nearest.addressLine);
        if (nearest.city) setCity(nearest.city);
      }
    } catch (err) {
      console.error("Reverse geocode failed:", err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const onNext = () => {
    const parsed = eventLocationScheduleSchema.safeParse({
      lat: pin?.[1],
      lng: pin?.[0],
      address,
      city,
      startAt,
      endAt,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLocationSchedule(parsed.data);
    router.push("/(tabs)/create/photos");
  };

  return (
    <Screen scroll>
      <StepHeader step={3} total={4} title="Where & when" />

      <View style={styles.addressWrap}>
        <TextField
          label="Street address"
          placeholder="Start typing to search…"
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            setIsTypingAddress(true);
          }}
          error={fieldErrors.address}
          autoCorrect={false}
        />
        {isTypingAddress && debouncedAddress.length >= 4 && (
          <View style={styles.suggestions}>
            {isSuggesting && suggestions.length === 0 ? (
              <View style={styles.suggestionRow}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.id}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionPressed]}
                  onPress={() => applySuggestion(suggestion)}
                >
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {suggestion.fullAddress}
                  </Text>
                </Pressable>
              ))
            )}
            {!isSuggesting && suggestions.length === 0 && (
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionEmpty}>No matches — keep typing or drop a pin</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TextField
        label="City"
        placeholder="Sydney"
        value={city}
        onChangeText={setCity}
        error={fieldErrors.city}
      />

      <View style={styles.mapLabelRow}>
        <Text style={typography.label}>Pin the exact spot</Text>
        {isReverseGeocoding && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      <View style={styles.mapWrap}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={Mapbox.StyleURL.Dark}
          logoEnabled={false}
          attributionPosition={{ bottom: 4, right: 4 }}
          onPress={(feature) => {
            const geometry = feature.geometry as GeoJSON.Point;
            onPinMoved([geometry.coordinates[0], geometry.coordinates[1]]);
          }}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{ centerCoordinate: pin ?? DEFAULT_CENTER, zoomLevel: pin ? 14 : 10 }}
          />
          {pin && (
            <Mapbox.PointAnnotation
              id="event-pin"
              coordinate={pin}
              draggable
              onDragEnd={(feature) => {
                const geometry = feature.geometry as GeoJSON.Point;
                onPinMoved([geometry.coordinates[0], geometry.coordinates[1]]);
              }}
            >
              <View style={styles.pin} />
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      </View>
      {!!(fieldErrors.lat || fieldErrors.lng) && (
        <Text style={styles.error}>{fieldErrors.lat ?? fieldErrors.lng}</Text>
      )}
      <Text style={styles.mapHint}>
        Search an address or tap the map — drag the pin to fine-tune. Only accepted guests see the
        exact spot.
      </Text>

      <View style={styles.pickerRow}>
        <Text style={typography.label}>Starts</Text>
        <DateTimePicker
          value={startAt}
          mode="datetime"
          minimumDate={new Date()}
          themeVariant="dark"
          accentColor={colors.primary}
          onChange={(_e, date) => {
            if (!date) return;
            setStartAt(date);
            if (endAt <= date) setEndAt(new Date(date.getTime() + 4 * 60 * 60 * 1000));
          }}
        />
      </View>
      {!!fieldErrors.startAt && <Text style={styles.error}>{fieldErrors.startAt}</Text>}

      <View style={styles.pickerRow}>
        <Text style={typography.label}>Ends</Text>
        <DateTimePicker
          value={endAt}
          mode="datetime"
          minimumDate={startAt}
          themeVariant="dark"
          accentColor={colors.primary}
          onChange={(_e, date) => date && setEndAt(date)}
        />
      </View>
      {!!fieldErrors.endAt && <Text style={styles.error}>{fieldErrors.endAt}</Text>}

      <View style={styles.spacer} />
      <Button label="Next: Photos" onPress={onNext} />
      <View style={styles.bottomPad} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addressWrap: { position: "relative", zIndex: 10 },
  suggestions: {
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionPressed: { backgroundColor: colors.surface },
  suggestionText: { ...typography.body, fontSize: 14 },
  suggestionEmpty: { ...typography.caption, color: colors.textFaint },
  mapLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  mapWrap: {
    height: 220,
    borderRadius: radii.md,
    overflow: "hidden",
    marginTop: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
  },
  mapHint: { ...typography.caption, color: colors.textFaint, marginTop: spacing.xs, marginBottom: spacing.md },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  error: { fontSize: 13, color: colors.danger, marginBottom: spacing.sm },
  spacer: { flex: 1, minHeight: spacing.lg },
  bottomPad: { height: spacing.md },
});
