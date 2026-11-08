import { toTelUrl } from '@/features/deliveries/phone';

describe('toTelUrl', () => {
  it('strips formatting characters', () => {
    expect(toTelUrl('+27 (0)11 000-0000')).toBe('tel:+270110000000');
  });

  it('rejects numbers without enough digits', () => {
    expect(toTelUrl('+ -')).toBeNull();
    expect(toTelUrl('12')).toBeNull();
  });
});
