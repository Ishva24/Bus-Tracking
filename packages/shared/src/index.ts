export * from './types';

// Utility functions
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatETA(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatMinutes(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min';
  return `${Math.round(minutes)} min`;
}

export function getTrafficLabel(factor: number): string {
  if (factor < 1.1) return 'Light traffic';
  if (factor < 1.4) return 'Moderate traffic';
  return 'Heavy traffic — delays expected';
}

export function getTrafficColor(factor: number): string {
  if (factor < 1.1) return '#22C55E'; // green
  if (factor < 1.4) return '#F59E0B'; // amber
  return '#EF4444'; // red
}