import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { fetchPendingVerifications, reviewIdVerification } from "@/features/verification/api";
import { useAuth } from "@/hooks/useAuth";
import { getSignedUrl } from "@/services/storage";
import { colors, radii, spacing, typography } from "@/lib/theme";

type PendingVerification = Awaited<ReturnType<typeof fetchPendingVerifications>>[number];

export default function AdminVerificationsScreen() {
  const { isAdmin, isInitializing } = useAuth();

  if (isInitializing) return null;
  if (!isAdmin) return <Redirect href="/(tabs)/profile" />;

  return (
    <Screen>
      <Text style={styles.heading}>Pending verifications</Text>
      <VerificationList />
    </Screen>
  );
}

function VerificationList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: fetchPendingVerifications,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <Text style={styles.muted}>Loading…</Text>;
  if (error) return <Text style={styles.errorText}>Failed to load verifications.</Text>;
  if (!data || data.length === 0) {
    return <Text style={styles.muted}>No pending verifications right now.</Text>;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
      renderItem={({ item }) => (
        <VerificationCard
          item={item}
          expanded={expandedId === item.id}
          onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          onReviewed={() => {
            setExpandedId(null);
            queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
          }}
        />
      )}
    />
  );
}

function VerificationCard({
  item,
  expanded,
  onToggle,
  onReviewed,
}: {
  item: PendingVerification;
  expanded: boolean;
  onToggle: () => void;
  onReviewed: () => void;
}) {
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileName =
    (item as { profile?: { full_name?: string | null; username?: string | null } }).profile
      ?.full_name ?? "Unknown user";

  const handleToggle = async () => {
    onToggle();
    if (!expanded && !frontUrl) {
      getSignedUrl("id-documents", item.front_image_path).then(setFrontUrl).catch(() => {});
      if (item.back_image_path) {
        getSignedUrl("id-documents", item.back_image_path).then(setBackUrl).catch(() => {});
      }
    }
  };

  const approve = async () => {
    setIsSubmitting(true);
    try {
      await reviewIdVerification({ verificationId: item.id, approve: true });
      onReviewed();
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReject = async () => {
    setIsSubmitting(true);
    try {
      await reviewIdVerification({
        verificationId: item.id,
        approve: false,
        rejectionReason: rejectionReason.trim() || "Document unclear or invalid",
      });
      onReviewed();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={handleToggle} style={styles.cardHeader}>
        <View>
          <Text style={styles.cardName}>{profileName}</Text>
          <Text style={styles.cardMeta}>
            {item.document_type} · submitted {new Date(item.submitted_at).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.cardBody}>
          <View style={styles.imagesRow}>
            {frontUrl ? (
              <Image source={{ uri: frontUrl }} style={styles.docImage} />
            ) : (
              <View style={styles.docImagePlaceholder} />
            )}
            {item.back_image_path &&
              (backUrl ? (
                <Image source={{ uri: backUrl }} style={styles.docImage} />
              ) : (
                <View style={styles.docImagePlaceholder} />
              ))}
          </View>

          {isRejecting ? (
            <View style={styles.rejectForm}>
              <TextField
                label="Rejection reason"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="e.g. Photo is blurry"
              />
              <View style={styles.actionsRow}>
                <View style={styles.actionButton}>
                  <Button label="Cancel" variant="secondary" onPress={() => setIsRejecting(false)} />
                </View>
                <View style={styles.actionButton}>
                  <Button label="Confirm reject" onPress={confirmReject} loading={isSubmitting} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <View style={styles.actionButton}>
                <Button
                  label="Reject"
                  variant="secondary"
                  onPress={() => setIsRejecting(true)}
                  disabled={isSubmitting}
                />
              </View>
              <View style={styles.actionButton}>
                <Button label="Approve" onPress={approve} loading={isSubmitting} />
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.lg },
  muted: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  errorText: { color: colors.danger, textAlign: "center", marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  cardName: { ...typography.body, fontWeight: "700" },
  cardMeta: { ...typography.caption, marginTop: 2 },
  chevron: { color: colors.textMuted },
  cardBody: { padding: spacing.md, paddingTop: 0, gap: spacing.md },
  imagesRow: { flexDirection: "row", gap: spacing.sm },
  docImage: { flex: 1, height: 160, borderRadius: radii.sm },
  docImagePlaceholder: {
    flex: 1,
    height: 160,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
  },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 },
  rejectForm: { gap: spacing.xs },
});
