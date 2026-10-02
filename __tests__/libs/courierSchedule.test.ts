import {
  getCourierCurrentMinutes,
  getCourierDayName,
  getCourierScheduleUnavailableMessage,
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

  it('explains when the courier shift starts later today', () => {
    expect(
      getCourierScheduleUnavailableMessage(weekdayHours, new Date('2026-09-28T05:30:00.000Z'))
    ).toBe('Your shift starts today at 08:00.');
  });

  it('explains when the shift ended and the next shift starts tomorrow', () => {
    expect(
      getCourierScheduleUnavailableMessage(weekdayHours, new Date('2026-09-28T16:30:00.000Z'))
    ).toBe('Your shift ended at 17:00. Next shift starts tomorrow at 08:00.');
  });

  it('explains unavailable days with the next scheduled day', () => {
    expect(
      getCourierScheduleUnavailableMessage(weekdayHours, new Date('2026-10-03T10:00:00.000Z'))
    ).toBe('You are not scheduled today. Next shift starts Monday at 08:00.');
  });

  it('explains when no courier shifts are available at all', () => {
    const unavailableHours = weekdayHours.map((hours) => ({ ...hours, isUnavailable: true }));

    expect(
      getCourierScheduleUnavailableMessage(unavailableHours, new Date('2026-09-28T10:00:00.000Z'))
    ).toBe('You do not have any available courier shifts saved.');
  });
});
