import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { TextField } from "@/components/TextField";
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

  const [pin, setPin] = useState<[number, number] | null>(
    saved ? [saved.lng, saved.lat] : null
  );
  const [address, setAddress] = useState(saved?.address ?? "");
  const [city, setCity] = useState(saved?.city ?? "");
  const [startAt, setStartAt] = useState<Date>(saved?.startAt ?? defaultStart());
  const [endAt, setEndAt] = useState<Date>(
    saved?.endAt ?? new Date(defaultStart().getTime() + 4 * 60 * 60 * 1000)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const cameraRef = useRef<Mapbox.Camera>(null);

  useEffect(() => {
    if (pin) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const position = await Location.getLastKnownPositionAsync();
      if (position) {
        cameraRef.current?.setCamera({
          centerCoordinate: [position.coords.longitude, position.coords.latitude],
          zoomLevel: 12,
          animationDuration: 0,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <Text style={typography.label}>Drop a pin on your place</Text>
      <View style={styles.mapWrap}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={Mapbox.StyleURL.Dark}
          logoEnabled={false}
          attributionPosition={{ bottom: 4, right: 4 }}
          onPress={(feature) => {
            const geometry = feature.geometry as GeoJSON.Point;
            setPin([geometry.coordinates[0], geometry.coordinates[1]]);
          }}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{ centerCoordinate: pin ?? DEFAULT_CENTER, zoomLevel: pin ? 14 : 10 }}
          />
          {pin && (
            <Mapbox.PointAnnotation id="event-pin" coordinate={pin}>
              <View style={styles.pin} />
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      </View>
      {!!(fieldErrors.lat || fieldErrors.lng) && (
        <Text style={styles.error}>{fieldErrors.lat ?? fieldErrors.lng}</Text>
      )}
      <Text style={styles.mapHint}>
        The exact pin is only shared with accepted guests; others see the area.
      </Text>

      <TextField
        label="Street address"
        placeholder="12 Example St"
        value={address}
        onChangeText={setAddress}
        error={fieldErrors.address}
      />
      <TextField
        label="City"
        placeholder="Sydney"
        value={city}
        onChangeText={setCity}
        error={fieldErrors.city}
      />

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
