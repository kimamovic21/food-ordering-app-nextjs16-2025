import { TZDate } from '@date-fns/tz';
import type { CourierWorkingHour } from '@/types/courier';

export type { CourierWorkingHour } from '@/types/courier';

export const COURIER_TIME_ZONE = 'Europe/Sarajevo';
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

export const getCourierZonedDate = (date: Date = new Date()) =>
  TZDate.tz(COURIER_TIME_ZONE, date);

export const getCourierCurrentMinutes = (date: Date = new Date()) => {
  const courierDate = getCourierZonedDate(date);
  return courierDate.getHours() * 60 + courierDate.getMinutes();
};

export const getCourierDayName = (date: Date) =>
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    getCourierZonedDate(date).getDay()
  ];

const createCourierZonedDate = (
  year: number,
  month: number,
  date: number,
  hours = 0,
  minutes = 0
) => new Date(new TZDate(year, month, date, hours, minutes, 0, 0, COURIER_TIME_ZONE).getTime());

export const getCourierStartOfDay = (date: Date = new Date()) => {
  const courierDate = getCourierZonedDate(date);
  return createCourierZonedDate(
    courierDate.getFullYear(),
    courierDate.getMonth(),
    courierDate.getDate()
  );
};

export const getCourierStartOfWeek = (date: Date = new Date()) => {
  const courierDate = getCourierZonedDate(date);
  const mondayOffset = courierDate.getDay() === 0 ? -6 : 1 - courierDate.getDay();

  return createCourierZonedDate(
    courierDate.getFullYear(),
    courierDate.getMonth(),
    courierDate.getDate() + mondayOffset
  );
};

export const getCourierStartOfMonth = (date: Date = new Date()) => {
  const courierDate = getCourierZonedDate(date);
  return createCourierZonedDate(courierDate.getFullYear(), courierDate.getMonth(), 1);
};

export const getCourierStartOfYear = (date: Date = new Date()) => {
  const courierDate = getCourierZonedDate(date);
  return createCourierZonedDate(courierDate.getFullYear(), 0, 1);
};

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

export const getCourierShiftEndForDate = (
  workingHours: unknown,
  targetDate: Date = new Date()
) => {
  const todayHours = getCourierWorkingHoursForDate(workingHours, targetDate);

  if (!todayHours || todayHours.isUnavailable) {
    return null;
  }

  const startMinutes = parseCourierTimeToMinutes(todayHours.startTime);
  const endMinutes = parseCourierTimeToMinutes(todayHours.endTime);

  if (
    startMinutes < COURIER_SERVICE_START_MINUTES ||
    endMinutes > COURIER_SERVICE_END_MINUTES ||
    startMinutes >= endMinutes
  ) {
    return null;
  }

  const courierDate = getCourierZonedDate(targetDate);
  const hours = Math.floor(endMinutes / 60);
  const minutes = endMinutes % 60;

  return createCourierZonedDate(
    courierDate.getFullYear(),
    courierDate.getMonth(),
    courierDate.getDate(),
    hours,
    minutes
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

  const currentMinutes = getCourierCurrentMinutes(targetDate);
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};
