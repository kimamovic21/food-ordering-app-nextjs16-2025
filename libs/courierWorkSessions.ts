import 'server-only';

import {
  getCourierShiftDurationMinutesForDate,
  getCourierWorkingHoursForDate,
  isCourierScheduledNow,
  parseCourierTimeToMinutes,
} from '@/libs/courierSchedule';
import { CourierWorkSession } from '@/models/courierWorkSession';
import type {
  CourierAvailabilityState,
  CourierAvailabilityStatus,
  CourierWorkPeriodSummary,
  CourierWorkSummary,
} from '@/types/courier';

export const COURIER_BREAK_DURATION_MINUTES = 30;
export const COURIER_MIN_WORK_BEFORE_BREAK_MINUTES = 60;
export const COURIER_MIN_SHIFT_MINUTES_FOR_BREAK = 5 * 60;

type CourierAvailabilityAction = 'go-online' | 'go-offline' | 'start-break' | 'toggle';

class CourierAvailabilityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CourierAvailabilityError';
    this.status = status;
  }
}

const dateOrNull = (value: unknown) => {
  if (!value) return null;

  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoOrNull = (value: unknown) => dateOrNull(value)?.toISOString() || null;

const getMinutesBetween = (start: Date, end: Date) =>
  Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));

const getStatus = (courier: any): CourierAvailabilityStatus => {
  if (['online', 'on_break', 'offline'].includes(courier?.courierAvailabilityStatus)) {
    return courier.courierAvailabilityStatus;
  }

  return courier?.availability ? 'online' : 'offline';
};

const getActiveSession = async (courierId: unknown) =>
  await CourierWorkSession.findOne({ courierId, status: 'active' });

const getBreakMinutes = (breaks: any[] = [], fallbackEnd: Date) =>
  breaks.reduce((total, breakItem) => {
    const startedAt = dateOrNull(breakItem?.startedAt);
    const endedAt = dateOrNull(breakItem?.endedAt) || fallbackEnd;

    if (!startedAt || endedAt <= startedAt) {
      return total;
    }

    return total + getMinutesBetween(startedAt, endedAt);
  }, 0);

const completeSession = async (session: any, endedAt: Date, autoClosedReason = '') => {
  if (!session) return null;

  const startedAt = dateOrNull(session.startedAt);
  if (!startedAt || endedAt <= startedAt) {
    return session;
  }

  if (Array.isArray(session.breaks)) {
    session.breaks = session.breaks.map((breakItem: any) => {
      if (breakItem?.endedAt) {
        return breakItem;
      }

      const startedBreakAt = dateOrNull(breakItem?.startedAt);
      const breakEndedAt = endedAt;

      return {
        ...breakItem,
        endedAt: breakEndedAt,
        durationMinutes: startedBreakAt ? getMinutesBetween(startedBreakAt, breakEndedAt) : 0,
      };
    });
  }

  const grossMinutes = getMinutesBetween(startedAt, endedAt);
  const breakMinutes = getBreakMinutes(session.breaks, endedAt);

  session.endedAt = endedAt;
  session.status = 'completed';
  session.grossMinutes = grossMinutes;
  session.breakMinutes = breakMinutes;
  session.netWorkMinutes = Math.max(0, grossMinutes - breakMinutes);
  session.autoClosedReason = autoClosedReason;

  await session.save?.();
  return session;
};

const setCourierOffline = (courier: any) => {
  courier.availability = false;
  courier.courierAvailabilityStatus = 'offline';
  courier.courierOnlineSince = null;
  courier.courierBreakStartedAt = null;
  courier.courierBreakEndsAt = null;
  courier.courierCurrentWorkSessionId = null;
};

export const normalizeCourierAvailabilityState = async (courier: any, now = new Date()) => {
  const status = getStatus(courier);
  const breakEndsAt = dateOrNull(courier?.courierBreakEndsAt);

  if (status === 'on_break' && breakEndsAt && breakEndsAt <= now) {
    const activeSession = await getActiveSession(courier._id);
    await completeSession(activeSession, breakEndsAt, 'break_completed');
    setCourierOffline(courier);
    await courier.save?.();
    return courier;
  }

  if (
    status === 'online' &&
    courier?.availability &&
    !isCourierScheduledNow(courier.courierWorkingHours, now)
  ) {
    const activeSession = await getActiveSession(courier._id);
    await completeSession(activeSession, now, 'outside_saved_schedule');
    setCourierOffline(courier);
    await courier.save?.();
  }

  return courier;
};

const getBreakEligibility = (courier: any, activeSession: any, now = new Date()) => {
  const status = getStatus(courier);

  if (status === 'on_break') {
    return { canStartBreak: false, reason: 'Your current break is still active.' };
  }

  if (!courier?.availability || status !== 'online') {
    return { canStartBreak: false, reason: 'Go online before starting a break.' };
  }

  if (courier?.takenOrder) {
    return {
      canStartBreak: false,
      reason: 'Finish or decline your active delivery before starting a break.',
    };
  }

  if (!isCourierScheduledNow(courier.courierWorkingHours, now)) {
    return { canStartBreak: false, reason: 'Breaks are available only during your saved shift.' };
  }

  const shiftDuration = getCourierShiftDurationMinutesForDate(courier.courierWorkingHours, now);
  if (shiftDuration < COURIER_MIN_SHIFT_MINUTES_FOR_BREAK) {
    return {
      canStartBreak: false,
      reason: 'Breaks require a saved shift of at least 5 hours.',
    };
  }

  const todayHours = getCourierWorkingHoursForDate(courier.courierWorkingHours, now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const shiftEndMinutes = todayHours ? parseCourierTimeToMinutes(todayHours.endTime) : 0;
  if (currentMinutes + COURIER_BREAK_DURATION_MINUTES > shiftEndMinutes) {
    return {
      canStartBreak: false,
      reason: 'There is not enough shift time left for a full 30-minute break.',
    };
  }

  if (!activeSession) {
    return { canStartBreak: false, reason: 'Start an online work session before taking a break.' };
  }

  if (Array.isArray(activeSession.breaks) && activeSession.breaks.length > 0) {
    return {
      canStartBreak: false,
      reason: 'A break was already used during this work session.',
    };
  }

  const startedAt = dateOrNull(activeSession.startedAt);
  const workedMinutes = startedAt ? getMinutesBetween(startedAt, now) : 0;
  if (workedMinutes < COURIER_MIN_WORK_BEFORE_BREAK_MINUTES) {
    return {
      canStartBreak: false,
      reason: `You can start a break after ${COURIER_MIN_WORK_BEFORE_BREAK_MINUTES} minutes online.`,
    };
  }

  return { canStartBreak: true, reason: '' };
};

export const getCourierAvailabilityState = async (
  courier: any,
  options: { includeWorkSummary?: boolean; now?: Date } = {}
): Promise<CourierAvailabilityState> => {
  const now = options.now || new Date();
  await normalizeCourierAvailabilityState(courier, now);

  const activeSession = await getActiveSession(courier._id);
  const eligibility = getBreakEligibility(courier, activeSession, now);
  const workSummary = options.includeWorkSummary
    ? await getCourierWorkSummary(courier._id, now)
    : undefined;

  return {
    availability: Boolean(courier.availability),
    availabilityStatus: getStatus(courier),
    breakEndsAt: toIsoOrNull(courier.courierBreakEndsAt),
    breakStartedAt: toIsoOrNull(courier.courierBreakStartedAt),
    canStartBreak: eligibility.canStartBreak,
    breakUnavailableReason: eligibility.reason,
    currentSessionStartedAt: toIsoOrNull(activeSession?.startedAt || courier.courierOnlineSince),
    minimumBreakWorkMinutes: COURIER_MIN_WORK_BEFORE_BREAK_MINUTES,
    breakDurationMinutes: COURIER_BREAK_DURATION_MINUTES,
    minimumShiftMinutesForBreak: COURIER_MIN_SHIFT_MINUTES_FOR_BREAK,
    workSummary,
  };
};

export const updateCourierAvailability = async (
  courier: any,
  action: CourierAvailabilityAction,
  now = new Date()
) => {
  await normalizeCourierAvailabilityState(courier, now);
  const currentStatus = getStatus(courier);
  const resolvedAction =
    action === 'toggle' ? (currentStatus === 'online' ? 'go-offline' : 'go-online') : action;

  if (resolvedAction === 'go-online') {
    const breakEndsAt = dateOrNull(courier.courierBreakEndsAt);
    if (currentStatus === 'on_break' && breakEndsAt && breakEndsAt > now) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((breakEndsAt.getTime() - now.getTime()) / 60000)
      );
      throw new CourierAvailabilityError(
        `Your break is still active. You can go online in ${remainingMinutes} minute${
          remainingMinutes === 1 ? '' : 's'
        }.`
      );
    }

    if (!isCourierScheduledNow(courier.courierWorkingHours, now)) {
      throw new CourierAvailabilityError(
        'You can go online only during your saved courier schedule.'
      );
    }

    const activeSession =
      (await getActiveSession(courier._id)) ||
      (await CourierWorkSession.create({ courierId: courier._id, startedAt: now }));

    courier.availability = true;
    courier.courierAvailabilityStatus = 'online';
    courier.courierOnlineSince = dateOrNull(activeSession.startedAt) || now;
    courier.courierBreakStartedAt = null;
    courier.courierBreakEndsAt = null;
    courier.courierCurrentWorkSessionId = activeSession._id;
    await courier.save?.();

    return {
      message: 'You are now online',
      state: await getCourierAvailabilityState(courier, { includeWorkSummary: true, now }),
    };
  }

  if (resolvedAction === 'go-offline') {
    const breakEndsAt = dateOrNull(courier.courierBreakEndsAt);
    if (currentStatus === 'on_break' && breakEndsAt && breakEndsAt > now) {
      throw new CourierAvailabilityError('Breaks cannot be ended early.');
    }

    const activeSession = await getActiveSession(courier._id);
    await completeSession(activeSession, now, 'manual_offline');
    setCourierOffline(courier);
    await courier.save?.();

    return {
      message: 'You are now offline',
      state: await getCourierAvailabilityState(courier, { includeWorkSummary: true, now }),
    };
  }

  if (resolvedAction === 'start-break') {
    const activeSession = await getActiveSession(courier._id);
    const eligibility = getBreakEligibility(courier, activeSession, now);

    if (!eligibility.canStartBreak) {
      throw new CourierAvailabilityError(eligibility.reason || 'Break is not available yet.');
    }

    const breakEndsAt = new Date(now.getTime() + COURIER_BREAK_DURATION_MINUTES * 60000);
    activeSession.breaks = [
      ...(Array.isArray(activeSession.breaks) ? activeSession.breaks : []),
      {
        startedAt: now,
        endedAt: null,
        durationMinutes: COURIER_BREAK_DURATION_MINUTES,
        reason: 'scheduled_break',
      },
    ];
    await activeSession.save?.();

    courier.availability = false;
    courier.courierAvailabilityStatus = 'on_break';
    courier.courierBreakStartedAt = now;
    courier.courierBreakEndsAt = breakEndsAt;
    courier.courierCurrentWorkSessionId = activeSession._id;
    await courier.save?.();

    return {
      message: 'Break started. You can go online again after 30 minutes.',
      state: await getCourierAvailabilityState(courier, { includeWorkSummary: true, now }),
    };
  }

  throw new CourierAvailabilityError('Unsupported courier availability action.');
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfLocalWeek = (date: Date) => {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
};

const startOfLocalMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfLocalYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const emptyPeriod = (): CourierWorkPeriodSummary => ({
  breakMinutes: 0,
  grossMinutes: 0,
  netWorkMinutes: 0,
  sessionCount: 0,
});

const getOverlapMinutes = (start: Date, end: Date, rangeStart: Date, rangeEnd: Date) => {
  const overlapStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
  const overlapEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));

  return overlapEnd > overlapStart ? getMinutesBetween(overlapStart, overlapEnd) : 0;
};

const addSessionToPeriod = (
  period: CourierWorkPeriodSummary,
  session: any,
  rangeStart: Date,
  rangeEnd: Date
) => {
  const startedAt = dateOrNull(session.startedAt);
  const endedAt = dateOrNull(session.endedAt) || rangeEnd;

  if (!startedAt || endedAt <= rangeStart || startedAt >= rangeEnd) {
    return;
  }

  const grossMinutes = getOverlapMinutes(startedAt, endedAt, rangeStart, rangeEnd);
  const breakMinutes = (session.breaks || []).reduce((total: number, breakItem: any) => {
    const breakStartedAt = dateOrNull(breakItem?.startedAt);
    const breakEndedAt = dateOrNull(breakItem?.endedAt) || endedAt;

    if (!breakStartedAt) return total;
    return total + getOverlapMinutes(breakStartedAt, breakEndedAt, rangeStart, rangeEnd);
  }, 0);

  period.grossMinutes += grossMinutes;
  period.breakMinutes += breakMinutes;
  period.netWorkMinutes += Math.max(0, grossMinutes - breakMinutes);
  period.sessionCount += grossMinutes > 0 ? 1 : 0;
};

export const getCourierWorkSummary = async (
  courierId: unknown,
  now = new Date()
): Promise<CourierWorkSummary> => {
  const yearStart = startOfLocalYear(now);
  const rangeEnd = now;
  const sessions = await CourierWorkSession.find({
    courierId,
    startedAt: { $lt: rangeEnd },
    $or: [{ endedAt: { $gte: yearStart } }, { endedAt: null }],
  }).lean();
  const summary: CourierWorkSummary = {
    today: emptyPeriod(),
    week: emptyPeriod(),
    month: emptyPeriod(),
    year: emptyPeriod(),
  };
  const ranges = [
    ['today', startOfLocalDay(now)] as const,
    ['week', startOfLocalWeek(now)] as const,
    ['month', startOfLocalMonth(now)] as const,
    ['year', yearStart] as const,
  ];

  sessions.forEach((session: any) => {
    ranges.forEach(([key, rangeStart]) => {
      addSessionToPeriod(summary[key], session, rangeStart, rangeEnd);
    });
  });

  return summary;
};

export const isCourierAssignableNow = (courier: any, now = new Date()) =>
  Boolean(courier?.availability) &&
  !courier?.takenOrder &&
  getStatus(courier) === 'online' &&
  isCourierScheduledNow(courier?.courierWorkingHours, now);

export const isCourierAssignableForOrder = (courier: any, orderId: unknown, now = new Date()) => {
  const takenOrderId = courier?.takenOrder?.toString?.() || String(courier?.takenOrder || '');
  const requestedOrderId = orderId?.toString?.() || String(orderId || '');

  return (
    Boolean(courier?.availability) &&
    (!takenOrderId || takenOrderId === requestedOrderId) &&
    getStatus(courier) === 'online' &&
    isCourierScheduledNow(courier?.courierWorkingHours, now)
  );
};

export const getCourierAvailabilityErrorStatus = (error: unknown) =>
  error instanceof CourierAvailabilityError ? error.status : 500;
