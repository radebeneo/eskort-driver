import { buildDirectionsUrl } from '@/features/navigation/directions';

describe('buildDirectionsUrl', () => {
  it('uses coordinates when available', () => {
    expect(buildDirectionsUrl({ latitude: -26.1076, longitude: 28.0567 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-26.1076%2C28.0567&travelmode=driving',
    );
  });

  it('encodes a free-text address', () => {
    expect(buildDirectionsUrl(' 1 Mock Street, Sandton ')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=1%20Mock%20Street%2C%20Sandton&travelmode=driving',
    );
  });
});
