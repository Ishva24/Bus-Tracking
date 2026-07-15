import { haversineDistance } from '@bustrack/shared';

describe('Haversine Distance', () => {
  it('calculates distance between two coordinates', () => {
    // Tambaram: 12.9249, 80.1239
    // Chromepet: 12.9516, 80.1430
    const distance = haversineDistance(12.9249, 80.1239, 12.9516, 80.1430);
    expect(distance).toBeCloseTo(3.61, 1); // ~3.6 km
  });

  it('returns 0 for the same coordinates', () => {
    const distance = haversineDistance(12.9249, 80.1239, 12.9249, 80.1239);
    expect(distance).toBe(0);
  });
});
