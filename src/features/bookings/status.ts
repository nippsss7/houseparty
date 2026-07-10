import { colors } from "@/lib/theme";
import type { BookingStatus } from "@/types/domain";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: colors.warning },
  accepted: { label: "Accepted", color: colors.success },
  declined: { label: "Declined", color: colors.danger },
  cancelled: { label: "Cancelled", color: colors.textFaint },
};
