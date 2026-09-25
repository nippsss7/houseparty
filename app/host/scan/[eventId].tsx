import { useMutation } from "@tanstack/react-query";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Stack } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { checkInTicket } from "@/features/tickets/api";
import { colors, radii, spacing, typography } from "@/lib/theme";

type ScanResult = Awaited<ReturnType<typeof checkInTicket>>;

export default function ScanTicketsScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLocked, setIsLocked] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [error, setError] = useState<string | null>(null);

  const checkIn = useMutation({
    mutationFn: (qrToken: string) => checkInTicket(qrToken),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Couldn't check in this ticket");
      setResult(null);
    },
  });

  const onScanned = (scan: BarcodeScanningResult) => {
    if (isLocked) return;
    setIsLocked(true);
    checkIn.mutate(scan.data);
  };

  const reset = () => {
    setIsLocked(false);
    setResult(null);
    setError(null);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <>
        <Stack.Screen options={{ title: "Scan tickets" }} />
        <View style={styles.permissionGate}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={typography.heading}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            HouseParty needs your camera to scan guest QR tickets at the door.
          </Text>
          <Button label="Allow camera access" onPress={requestPermission} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Scan tickets" }} />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={isLocked ? undefined : onScanned}
        />
        <View style={styles.frame} pointerEvents="none" />
        {!isLocked && <Text style={styles.hint}>Point the camera at a guest's ticket QR code</Text>}

        {isLocked && (
          <View style={styles.overlay}>
            <View style={styles.resultCard}>
              {checkIn.isPending && <Text style={typography.heading}>Checking in…</Text>}

              {result && (
                <>
                  {result.guest_avatar_url ? (
                    <Image source={{ uri: result.guest_avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarEmoji}>🎟️</Text>
                    </View>
                  )}
                  <Text style={[styles.resultStatus, !!result.already_checked_in_at && styles.resultStatusWarn]}>
                    {result.already_checked_in_at ? "⚠ Already checked in" : "✓ Checked in"}
                  </Text>
                  <Text style={typography.heading}>{result.guest_name ?? "Guest"}</Text>
                  <Text style={styles.resultMeta}>
                    {result.tier_name} · {result.event_title}
                  </Text>
                </>
              )}

              {error && (
                <>
                  <Text style={styles.resultError}>✕ {error}</Text>
                </>
              )}

              <Button label="Scan next" onPress={reset} />
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  frame: {
    position: "absolute",
    top: "30%",
    left: "12%",
    right: "12%",
    bottom: "42%",
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: radii.lg,
  },
  hint: {
    position: "absolute",
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    textAlign: "center",
    ...typography.body,
    color: colors.white,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  resultCard: {
    width: "100%",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: spacing.xs },
  avatarFallback: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 28 },
  resultStatus: { ...typography.label, color: colors.success, fontWeight: "700" },
  resultStatusWarn: { color: colors.warning },
  resultMeta: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  resultError: { ...typography.heading, color: colors.danger, textAlign: "center" },
  permissionGate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  permissionEmoji: { fontSize: 48 },
  permissionBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
