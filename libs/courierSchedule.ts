import type { CourierWorkingHour } from '@/types/courier';

export type { CourierWorkingHour } from '@/types/courier';

export const COURIER_SERVICE_START_TIME = '08:00';
export const COURIER_SERVICE_END_TIME = '23:00';
export const COURIER_SERVICE_START_MINUTES = 8 * 60;
export const COURIER_SERVICE_END_MINUTES = 23 * 60;

export const defaultCourierWorkingHours: CourierWorkingHour[] = [
  { day: 'monday', startTime: '09:00', endTime: '17:00', isUnavailable: false },
  { day: 'tuesday', startTime: '09:00', endTime: '17:00', isUnavailable: false },
  { day: 'wednesday', startTime: '09:00', endTime: '17:00', isUnavailable: false },
  { day: 'thursday', startTime: '09:00', endTime: '17:00', isUnavailable: false },
  { day: 'friday', startTime: '09:00', endTime: '17:00', isUnavailable: false },
  { day: 'saturday', startTime: '10:00', endTime: '16:00', isUnavailable: true },
  { day: 'sunday', startTime: '10:00', endTime: '16:00', isUnavailable: true },
];

const validDays = new Set(defaultCourierWorkingHours.map((item) => item.day));
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const parseCourierTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getCourierDayName = (date: Date) =>
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

export const normalizeCourierWorkingHours = (workingHours: unknown): CourierWorkingHour[] => {
  const incoming = Array.isArray(workingHours) ? workingHours : [];

  return defaultCourierWorkingHours.map((defaultHours) => {
    const match = incoming.find((item: any) => item?.day === defaultHours.day);
    const startTime =
      typeof match?.startTime === 'string' && timePattern.test(match.startTime)
        ? match.startTime
        : defaultHours.startTime;
    const endTime =
      typeof match?.endTime === 'string' && timePattern.test(match.endTime)
        ? match.endTime
        : defaultHours.endTime;

    return {
      day: defaultHours.day,
      startTime,
      endTime,
      isUnavailable: Boolean(match?.isUnavailable),
    };
  });
};

export const validateCourierWorkingHours = (workingHours: unknown) => {
  if (!Array.isArray(workingHours)) {
    return 'Courier schedule must be an array.';
  }

  for (const item of workingHours as CourierWorkingHour[]) {
    if (!validDays.has(item?.day)) {
      return 'Courier schedule contains an invalid day.';
    }

    if (!timePattern.test(String(item?.startTime || ''))) {
      return 'Courier schedule contains an invalid start time.';
    }

    if (!timePattern.test(String(item?.endTime || ''))) {
      return 'Courier schedule contains an invalid end time.';
    }

    if (
      !item?.isUnavailable &&
      parseCourierTimeToMinutes(item.startTime) >= parseCourierTimeToMinutes(item.endTime)
    ) {
      return 'Courier schedule start time must be before end time.';
    }

    if (
      !item?.isUnavailable &&
      (parseCourierTimeToMinutes(item.startTime) < COURIER_SERVICE_START_MINUTES ||
        parseCourierTimeToMinutes(item.endTime) > COURIER_SERVICE_END_MINUTES)
    ) {
      return `Courier shifts must stay between ${COURIER_SERVICE_START_TIME} and ${COURIER_SERVICE_END_TIME}.`;
    }
  }

  return null;
};

export const getCourierWorkingHoursForDate = (
  workingHours: unknown,
  targetDate: Date = new Date()
) => {
  const normalizedHours = normalizeCourierWorkingHours(workingHours);
  return normalizedHours.find((item) => item.day === getCourierDayName(targetDate)) || null;
};

export const getCourierShiftDurationMinutesForDate = (
  workingHours: unknown,
  targetDate: Date = new Date()
) => {
  const todayHours = getCourierWorkingHoursForDate(workingHours, targetDate);

  if (!todayHours || todayHours.isUnavailable) {
    return 0;
  }

  return Math.max(
    0,
    parseCourierTimeToMinutes(todayHours.endTime) - parseCourierTimeToMinutes(todayHours.startTime)
  );
};

export const isCourierScheduledNow = (workingHours: unknown, targetDate: Date = new Date()) => {
  const todayHours = getCourierWorkingHoursForDate(workingHours, targetDate);

  if (!todayHours || todayHours.isUnavailable) {
    return false;
  }

  const startMinutes = parseCourierTimeToMinutes(todayHours.startTime);
  const endMinutes = parseCourierTimeToMinutes(todayHours.endTime);
  if (
    startMinutes < COURIER_SERVICE_START_MINUTES ||
    endMinutes > COURIER_SERVICE_END_MINUTES ||
    startMinutes >= endMinutes
  ) {
    return false;
  }

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};
