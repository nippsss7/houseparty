import { create } from "zustand";

import type { EventBasics, EventDetails, EventLocationSchedule } from "@/features/events/schemas";

/**
 * Shared state for the multi-step create-event wizard. Each step screen owns
 * its own react-hook-form instance and commits validated values here on
 * "Next"; the final step composes everything into the createEvent call.
 */
interface CreateEventState {
  basics: EventBasics | null;
  details: EventDetails | null;
  locationSchedule: EventLocationSchedule | null;
  photoUris: string[];
  setBasics: (basics: EventBasics) => void;
  setDetails: (details: EventDetails) => void;
  setLocationSchedule: (locationSchedule: EventLocationSchedule) => void;
  setPhotoUris: (photoUris: string[]) => void;
  reset: () => void;
}

export const useCreateEventStore = create<CreateEventState>((set) => ({
  basics: null,
  details: null,
  locationSchedule: null,
  photoUris: [],
  setBasics: (basics) => set({ basics }),
  setDetails: (details) => set({ details }),
  setLocationSchedule: (locationSchedule) => set({ locationSchedule }),
  setPhotoUris: (photoUris) => set({ photoUris }),
  reset: () => set({ basics: null, details: null, locationSchedule: null, photoUris: [] }),
}));
