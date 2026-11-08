import { create } from 'zustand';

/**
 * Client-side operational state: which delivery the driver is working on.
 * It holds only an id. Delivery data always comes from the repository (Supabase).
 * Cleared on sign-out by the auth provider.
 */
type DeliverySelectionState = {
  selectedDeliveryId: string | null;
  selectDelivery: (deliveryId: string) => void;
  clearSelection: () => void;
};

export const useDeliverySelectionStore = create<DeliverySelectionState>()((set) => ({
  selectedDeliveryId: null,
  selectDelivery: (deliveryId) => set({ selectedDeliveryId: deliveryId }),
  clearSelection: () => set({ selectedDeliveryId: null }),
}));
