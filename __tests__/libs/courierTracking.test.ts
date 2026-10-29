import { getCourierLocationFreshness, normalizeCourierLocation } from '@/libs/courierTracking';

describe('courier tracking readings', () => {
  const checkedAt = '2026-10-28T10:00:00.000Z';

  it('preserves zero coordinates and normalizes timestamps', () => {
    expect(
      normalizeCourierLocation({
        latitude: 0,
        longitude: 0,
        lastLocationUpdate: new Date(checkedAt),
      })
    ).toEqual({ latitude: 0, longitude: 0, lastLocationUpdate: checkedAt });
  });

  it.each([
    { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity },
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: -181 },
    { latitude: '10', longitude: 20 },
    null,
  ])('rejects invalid coordinates %j', (value) => {
    expect(normalizeCourierLocation(value)).toBeNull();
  });

  it('does not label missing, invalid or future timestamps as fresh', () => {
    for (const value of [null, 'invalid', '2026-10-28T11:00:00.000Z']) {
      expect(getCourierLocationFreshness(value, checkedAt)).toBe('unknown');
    }
  });

  it('ages a reading between polls and treats two minutes as stale', () => {
    expect(getCourierLocationFreshness('2026-10-28T09:59:00.000Z', checkedAt, 59_999)).toBe(
      'fresh'
    );
    expect(getCourierLocationFreshness('2026-10-28T09:59:00.000Z', checkedAt, 60_000)).toBe(
      'stale'
    );
  });

  it('tolerates small clock skew without extending the freshness window', () => {
    expect(getCourierLocationFreshness('2026-10-28T10:00:10.000Z', checkedAt, 120_000)).toBe(
      'stale'
    );
    expect(
      normalizeCourierLocation({ latitude: 1, longitude: 2, lastLocationUpdate: 'invalid' })
        ?.lastLocationUpdate
    ).toBeNull();
  });
});
