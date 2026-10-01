import {
  getCourierCurrentMinutes,
  getCourierDayName,
  getCourierStartOfDay,
  getCourierStartOfWeek,
  isCourierScheduledNow,
} from '@/libs/courierSchedule';

const weekdayHours = [
  { day: 'monday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'tuesday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'wednesday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'thursday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'friday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'saturday', startTime: '10:00', endTime: '16:00', isUnavailable: true },
  { day: 'sunday', startTime: '10:00', endTime: '16:00', isUnavailable: true },
];

describe('courier schedule timezone helpers', () => {
  it('evaluates courier shifts in Europe/Sarajevo time instead of server time', () => {
    expect(isCourierScheduledNow(weekdayHours, new Date('2026-09-28T06:30:00.000Z'))).toBe(
      true
    );
    expect(isCourierScheduledNow(weekdayHours, new Date('2026-09-28T15:30:00.000Z'))).toBe(
      false
    );
  });

  it('uses the Sarajevo weekday when UTC is still the previous day', () => {
    const sarajevoMondayAfterMidnight = new Date('2026-09-27T22:30:00.000Z');

    expect(getCourierDayName(sarajevoMondayAfterMidnight)).toBe('monday');
    expect(getCourierCurrentMinutes(sarajevoMondayAfterMidnight)).toBe(30);
  });

  it('builds report boundaries from Sarajevo local dates', () => {
    const sarajevoMondayAfterMidnight = new Date('2026-09-27T22:30:00.000Z');

    expect(getCourierStartOfDay(sarajevoMondayAfterMidnight).toISOString()).toBe(
      '2026-09-27T22:00:00.000Z'
    );
    expect(getCourierStartOfWeek(sarajevoMondayAfterMidnight).toISOString()).toBe(
      '2026-09-27T22:00:00.000Z'
    );
  });
});
