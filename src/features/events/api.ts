import { compressImage, uploadImageToBucket } from "@/services/storage";
import { supabase } from "@/services/supabase";
import type { Database } from "@/types/database.types";
import type { CancellationPolicy, EventCategory } from "@/types/domain";

const EVENT_PHOTOS_BUCKET = "event-photos";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type NearbyEvent = Database["public"]["Functions"]["nearby_events"]["Returns"][number];

export function eventPhotoUrl(storagePath: string) {
  return supabase.storage.from(EVENT_PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function createEvent(params: {
  hostId: string;
  title: string;
  description: string;
  category: EventCategory;
  capacity: number;
  pricePerPerson: number;
  ageRestriction?: number;
  houseRules?: string;
  cancellationPolicy: CancellationPolicy;
  lat: number;
  lng: number;
  address: string;
  city: string;
  startAt: Date;
  endAt: Date;
  photoUris: string[];
}) {
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      host_id: params.hostId,
      title: params.title,
      description: params.description,
      category: params.category,
      capacity: params.capacity,
      price_per_person: params.pricePerPerson,
      age_restriction: params.ageRestriction ?? null,
      house_rules: params.houseRules || null,
      cancellation_policy: params.cancellationPolicy,
      // PostGIS geography accepts EWKT through PostgREST; lat/lng generated
      // columns are derived from it server-side.
      location: `SRID=4326;POINT(${params.lng} ${params.lat})` as unknown as EventRow["location"],
      address: params.address,
      city: params.city,
      start_at: params.startAt.toISOString(),
      end_at: params.endAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  // Photos are best-effort after the event row exists; a failed upload
  // shouldn't orphan the whole event.
  const failures: unknown[] = [];
  await Promise.all(
    params.photoUris.map(async (uri, index) => {
      try {
        const compressed = await compressImage(uri);
        const path = `${params.hostId}/${event.id}/photo-${index}-${Date.now()}.jpg`;
        await uploadImageToBucket(EVENT_PHOTOS_BUCKET, path, compressed);
        const { error: photoError } = await supabase
          .from("event_photos")
          .insert({ event_id: event.id, storage_path: path, position: index });
        if (photoError) throw photoError;
      } catch (err) {
        failures.push(err);
      }
    })
  );
  if (failures.length > 0) console.error(`${failures.length} event photo(s) failed to upload`, failures[0]);

  return event;
}

export async function fetchNearbyEvents(params: {
  lat: number;
  lng: number;
  radiusMeters?: number;
  category?: EventCategory | null;
  maxPrice?: number | null;
}) {
  const { data, error } = await supabase.rpc("nearby_events", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_meters: params.radiusMeters ?? 25000,
    p_category: params.category ?? undefined,
    p_max_price: params.maxPrice ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function fetchEvent(eventId: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      "*, photos:event_photos(id, storage_path, position), host:profiles!events_host_id_fkey(id, full_name, username, avatar_url, host_rating_avg, host_rating_count)"
    )
    .eq("id", eventId)
    .single();
  if (error) throw error;
  return data;
}

export type EventWithRelations = Awaited<ReturnType<typeof fetchEvent>>;
