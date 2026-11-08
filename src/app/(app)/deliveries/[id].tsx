import { useLocalSearchParams } from 'expo-router';

import { DeliveryDetailsScreen } from '@/features/deliveries/delivery-details-screen';

export default function DeliveryDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DeliveryDetailsScreen deliveryId={id} />;
}
