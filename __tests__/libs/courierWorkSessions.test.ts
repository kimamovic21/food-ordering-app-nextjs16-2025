import { CourierWorkSession } from '@/models/courierWorkSession';

vi.mock('@/models/courierWorkSession', () => ({
  CourierWorkSession: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

const weekdayHours = [
  { day: 'monday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'tuesday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'wednesday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'thursday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'friday', startTime: '08:00', endTime: '17:00', isUnavailable: false },
  { day: 'saturday', startTime: '10:00', endTime: '16:00', isUnavailable: true },
  { day: 'sunday', startTime: '10:00', endTime: '16:00', isUnavailable: true },
];

const loadCourierWorkSessions = async () => await import('@/libs/courierWorkSessions');

describe('courier work sessions', () => {
  it('auto-closes stale active sessions at the saved Sarajevo shift end', async () => {
    const activeSession: any = {
      _id: 'session-1',
      courierId: 'courier-1',
      startedAt: new Date('2026-09-28T06:00:00.000Z'),
      breaks: [],
      save: vi.fn(async function save(this: any) {
        return this;
      }),
    };
    const courier: any = {
      _id: 'courier-1',
      availability: true,
      courierAvailabilityStatus: 'online',
      courierWorkingHours: weekdayHours,
      save: vi.fn(async function save(this: any) {
        return this;
      }),
    };

    vi.mocked(CourierWorkSession.findOne).mockResolvedValueOnce(activeSession as never);

    const { normalizeCourierAvailabilityState } = await loadCourierWorkSessions();
    await normalizeCourierAvailabilityState(courier, new Date('2026-09-28T16:30:00.000Z'));

    expect(activeSession.endedAt.toISOString()).toBe('2026-09-28T15:00:00.000Z');
    expect(activeSession.status).toBe('completed');
    expect(activeSession.grossMinutes).toBe(540);
    expect(activeSession.autoClosedReason).toBe('outside_saved_schedule');
    expect(courier.availability).toBe(false);
    expect(courier.courierAvailabilityStatus).toBe('offline');
    expect(activeSession.save).toHaveBeenCalled();
    expect(courier.save).toHaveBeenCalled();
  });

  it('summarizes today from Sarajevo midnight instead of server midnight', async () => {
    vi.mocked(CourierWorkSession.find).mockReturnValueOnce({
      lean: vi.fn(async () => [
        {
          _id: 'session-1',
          courierId: 'courier-1',
          startedAt: new Date('2026-09-28T22:15:00.000Z'),
          endedAt: new Date('2026-09-28T22:45:00.000Z'),
          breaks: [],
        },
      ]),
    } as never);

    const { getCourierWorkSummary } = await loadCourierWorkSessions();
    const summary = await getCourierWorkSummary('courier-1', new Date('2026-09-29T08:00:00.000Z'));

    expect(summary.today.grossMinutes).toBe(30);
    expect(summary.today.netWorkMinutes).toBe(30);
    expect(summary.week.grossMinutes).toBe(30);
  });
});
