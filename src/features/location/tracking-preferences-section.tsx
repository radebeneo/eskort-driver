import { Card, SwitchRow, Text } from '@/components/ui';
import { useTrackingPreferencesStore } from '@/stores/tracking-preferences-store';

export function TrackingPreferencesSection() {
  const highAccuracy = useTrackingPreferencesStore((state) => state.highAccuracy);
  const setHighAccuracy = useTrackingPreferencesStore((state) => state.setHighAccuracy);

  return (
    <Card>
      <Text variant="heading">Location</Text>
      <SwitchRow
        label="High-accuracy GPS"
        description="More precise route estimates. Uses more battery."
        value={highAccuracy}
        onValueChange={setHighAccuracy}
      />
    </Card>
  );
}
