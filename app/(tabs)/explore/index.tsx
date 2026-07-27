import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Animated, { FadeInDown } from "react-native-reanimated";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { eventPhotoUrl, fetchNearbyEvents, type NearbyEvent } from "@/features/events/api";
import { eventCategoryOptions } from "@/features/events/schemas";
import { colors, radii, shadows, spacing, TAB_BAR_CLEARANCE, typography } from "@/lib/theme";
import type { EventCategory } from "@/types/domain";

const DEFAULT_CENTER: [number, number] = [151.2093, -33.8688];

const PRICE_FILTERS = [
  { label: "Any price", value: null },
  { label: "Free", value: 0 },
  { label: "Under $20", value: 20 },
  { label: "Under $50", value: 50 },
] as const;

export default function ExploreScreen() {
  const router = useRouter();
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const position = await Location.getLastKnownPositionAsync();
      if (position) setCenter([position.coords.longitude, position.coords.latitude]);
    })();
  }, []);

  const {
    data: events = [],
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["nearby-events", "explore", center[0].toFixed(2), center[1].toFixed(2), debouncedSearch, category, maxPrice],
    queryFn: () =>
      fetchNearbyEvents({
        lat: center[1],
        lng: center[0],
        radiusMeters: 100000,
        search: debouncedSearch || null,
        category,
        maxPrice,
      }),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={typography.title}>Explore</Text>
        <TextInput
          placeholder="Search parties, vibes, cities…"
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {PRICE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.label}
              label={filter.label}
              active={maxPrice === filter.value}
              onPress={() => setMaxPrice(filter.value)}
            />
          ))}
          <View style={styles.filterDivider} />
          <FilterChip label="All types" active={category === null} onPress={() => setCategory(null)} />
          {eventCategoryOptions.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={category === option.value}
              onPress={() => setCategory(category === option.value ? null : option.value)}
            />
          ))}
        </ScrollView>
      </View>

      {isFetching && events.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={typography.heading}>Couldn't load events</Text>
          <Text style={styles.emptyBody}>Check your connection and try again.</Text>
          <Button label="Retry" variant="secondary" onPress={() => refetch()} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={typography.heading}>Nothing found</Text>
          <Text style={styles.emptyBody}>
            {debouncedSearch
              ? "Try a different search or clear the filters."
              : "No upcoming parties in your area yet — start one from the Create tab!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }: { item: NearbyEvent; index: number }) => (
            <ExploreCard
              event={item}
              index={index}
              onOpen={() => router.push(`/event/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ExploreCard({
  event,
  index,
  onOpen,
}: {
  event: NearbyEvent;
  index: number;
  onOpen: () => void;
}) {
  const categoryLabel =
    eventCategoryOptions.find((option) => option.value === event.category)?.label ?? event.category;
  const startAt = new Date(event.start_at);
  const distanceKm = event.distance_meters / 1000;
  const spotsLeft = event.capacity - event.current_rsvp_count;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(16)}>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onOpen}>
      {event.cover_photo_path ? (
        <Image source={{ uri: eventPhotoUrl(event.cover_photo_path) }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Text style={styles.cardImageEmoji}>🎉</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>
          {categoryLabel.toUpperCase()} · {distanceKm < 1 ? "<1" : distanceKm.toFixed(1)} KM
        </Text>
        <Text style={typography.heading} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.cardMeta}>
          {event.city} ·{" "}
          {startAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
          {startAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </Text>
        <Text style={styles.cardMeta}>
          {Number(event.price_per_person) > 0 ? `$${event.price_per_person}/person` : "Free"} ·{" "}
          {spotsLeft > 0 ? `${spotsLeft} spots left` : "Sold out"}
        </Text>
      </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  search: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  filterDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.text },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE, gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    ...shadows.card,
  },
  cardPressed: { opacity: 0.85 },
  cardImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  cardImageFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageEmoji: { fontSize: 44 },
  cardBody: { padding: spacing.md, gap: spacing.xs },
  cardCategory: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
