export function formatOrderNumber(orderId: string): string {
  return `APT-${orderId.slice(0, 8).toUpperCase()}`;
}
