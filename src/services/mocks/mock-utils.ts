/**
 * ⚠️ MOCK SUPPORT CODE. Used only by the in-memory mock services.
 */
export function simulateLatency(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
