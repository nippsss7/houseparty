import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { TextField } from "@/components/TextField";
import { useCreateEventStore, type DraftTicketTier } from "@/stores/createEventStore";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function CreateEventTicketsScreen() {
  const router = useRouter();
  const ticketTiers = useCreateEventStore((s) => s.ticketTiers);
  const setTicketTiers = useCreateEventStore((s) => s.setTicketTiers);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addTier = () => {
    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    if (name.trim().length < 2) {
      setError("Give this ticket a name, like General or VIP");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Enter a valid price");
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("Enter how many of this ticket are available");
      return;
    }
    setError(null);
    setTicketTiers([...ticketTiers, { name: name.trim(), price: parsedPrice, quantityTotal: parsedQuantity }]);
    setName("");
    setPrice("");
    setQuantity("");
  };

  const removeTier = (index: number) => setTicketTiers(ticketTiers.filter((_, i) => i !== index));

  const onNext = () => router.push("/(tabs)/create/photos");

  return (
    <Screen scroll>
      <StepHeader step={4} total={5} title="Tickets" />
      <Text style={styles.subheading}>
        Sell paid tickets with tiers like General and VIP — each gets a scannable QR ticket. Skip
        this to keep your event free with request-to-join instead.
      </Text>

      {ticketTiers.length > 0 && (
        <View style={styles.tierList}>
          {ticketTiers.map((tier: DraftTicketTier, index: number) => (
            <View key={`${tier.name}-${index}`} style={styles.tierRow}>
              <View style={styles.tierInfo}>
                <Text style={typography.body}>{tier.name}</Text>
                <Text style={styles.tierMeta}>
                  ${tier.price.toFixed(2)} · {tier.quantityTotal} available
                </Text>
              </View>
              <Pressable onPress={() => removeTier(index)} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.form}>
        <TextField label="Tier name" placeholder="General admission" value={name} onChangeText={setName} />
        <View style={styles.row}>
          <View style={styles.rowField}>
            <TextField label="Price ($)" placeholder="25" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={styles.rowField}>
            <TextField label="Quantity" placeholder="100" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
          </View>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label="Add ticket tier" variant="secondary" onPress={addTier} />
      </View>

      <View style={styles.spacer} />
      <Button label={ticketTiers.length > 0 ? "Next: Photos" : "Skip — keep it free"} onPress={onNext} />
      <View style={styles.bottomPad} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subheading: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  tierList: { gap: spacing.sm, marginBottom: spacing.lg },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tierInfo: { gap: 2 },
  tierMeta: { ...typography.caption, color: colors.textMuted },
  remove: { ...typography.label, color: colors.danger },
  form: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  rowField: { flex: 1 },
  error: { fontSize: 13, color: colors.danger },
  spacer: { flex: 1, minHeight: spacing.lg },
  bottomPad: { height: spacing.md },
});
