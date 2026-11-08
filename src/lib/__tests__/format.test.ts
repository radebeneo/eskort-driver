import { formatAddress, formatDistance, formatDuration } from '@/lib/format';
import { haversineDistanceMeters } from '@/lib/geo';

describe('formatDistance', () => {
  it.each([
    [0, '0 m'],
    [742.4, '742 m'],
    [1500, '1.5 km'],
    [12_340, '12 km'],
    [-1, '–'],
    [Number.NaN, '–'],
  ])('formats %p as %p', (meters, expected) => {
    expect(formatDistance(meters)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it.each([
    [20, '< 1 min'],
    [600, '10 min'],
    [3600, '1 h'],
    [5400, '1 h 30 min'],
  ])('formats %p seconds as %p', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('formatAddress', () => {
  it('skips empty parts', () => {
    expect(
      formatAddress({
        line1: '1 Example Street',
        line2: null,
        suburb: ' ',
        city: 'Johannesburg',
        postalCode: '2000',
        location: null,
      }),
    ).toBe('1 Example Street, Johannesburg, 2000');
  });
});

describe('haversineDistanceMeters', () => {
  it('is zero for the same point and roughly correct for a known distance', () => {
    const point = { latitude: -26.2041, longitude: 28.0473 };
    expect(haversineDistanceMeters(point, point)).toBe(0);
    // One degree of latitude is ~111.2 km.
    const distance = haversineDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    );
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(111_400);
  });
});
