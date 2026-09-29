import type { EntityId, ISODateString } from '@/types/common';
import type { UserRole } from '@/types/user';

export type CourierWorkingHour = {
  day: string;
  startTime: string;
  endTime: string;
  isUnavailable?: boolean;
};

export type CourierAvailabilityStatus = 'offline' | 'online' | 'on_break';

export type CourierWorkPeriodSummary = {
  breakMinutes: number;
  grossMinutes: number;
  netWorkMinutes: number;
  sessionCount: number;
};

export type CourierWorkSummary = {
  today: CourierWorkPeriodSummary;
  week: CourierWorkPeriodSummary;
  month: CourierWorkPeriodSummary;
  year: CourierWorkPeriodSummary;
};

export type CourierAvailabilityState = {
  availability: boolean;
  availabilityStatus: CourierAvailabilityStatus;
  breakEndsAt: string | null;
  breakStartedAt: string | null;
  canStartBreak: boolean;
  breakUnavailableReason: string;
  currentSessionStartedAt: string | null;
  minimumBreakWorkMinutes: number;
  breakDurationMinutes: number;
  minimumShiftMinutesForBreak: number;
  workSummary?: CourierWorkSummary;
};

export type CourierReadinessTone = 'healthy' | 'limited' | 'unavailable' | 'unknown';

export type CourierReadinessStatus = {
  availableCouriers: number;
  courierReadinessDelayMinutes: number;
  courierReadinessMessage: string;
  courierReadinessTone: CourierReadinessTone;
  isCourierReady: boolean;
  totalCouriers: number;
};

export type CourierListItem = {
  _id: EntityId;
  name: string;
  email: string;
  image?: string | null;
  availability: boolean;
  courierAvailabilityStatus?: CourierAvailabilityStatus;
  takenOrder?: EntityId | null;
  role: UserRole | string;
  createdAt?: ISODateString;
  distanceToRestaurantKm?: number | null;
  averageRating?: number;
  ratingCount?: number;
  workSummary?: CourierWorkSummary;
};

export type CourierPerformanceSummary = {
  completedDeliveries: number;
  totalAssignments: number;
  acceptedAssignments: number;
  respondedAssignments: number;
  declinedAssignments: number;
  missedAssignments: number;
  lateDeliveries: number;
  totalEarnings: number;
  averageEarning: number;
  averageDeliveryMinutes: number;
  averageResponseMinutes: number;
  assignmentResponseRate: number;
  assignmentAcceptanceRate: number;
  averageRating: number;
  ratingCount: number;
};

export type EarningsChartItem = {
  month: string;
  earnings: number;
  deliveries: number;
};

export type CourierEarningsCourier = {
  _id: EntityId;
  name: string;
  email: string;
  image?: string | null;
  availability: boolean;
  createdAt?: ISODateString;
};

export type CourierEarningsResponse = {
  courier: CourierEarningsCourier;
  earningsChart: EarningsChartItem[];
  summary: CourierPerformanceSummary;
  workSummary?: CourierWorkSummary;
};
