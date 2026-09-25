import type { EntityId, ISODateString } from '@/types/common';

export type WeekdayKey =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type RestaurantWorkingHour = {
  day: WeekdayKey | string;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
};

export type RestaurantBlockedDate = {
  date: string | Date;
  reason?: string;
};

export type RestaurantListItem = {
  _id: EntityId;
  name: string;
  city: string;
  country: string;
  street: string;
  description: string;
  image: string | null;
  isOpen: boolean;
  isPaused: boolean;
  isAcceptingOrders: boolean;
  distanceKm: number | null;
  deliveryRadiusKm: number;
  minimumOrderAmount: number;
  averagePreparationMinutes: number;
  averageDeliveryMinutes: number;
  averageRating: number;
  ratingCount: number;
};

export type RestaurantFilterOptions = {
  cities: string[];
  countries: string[];
};

export type RestaurantListResponse = {
  restaurants: RestaurantListItem[];
  filterOptions: RestaurantFilterOptions;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type RestaurantMapPin = {
  _id: EntityId;
  name: string;
  street: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  isPaused: boolean;
  isAcceptingOrders: boolean;
};

export type RestaurantMapResponse = {
  restaurants: RestaurantMapPin[];
};

export type RestaurantSummary = {
  _id: EntityId;
  name: string;
};

export type RestaurantDetails = RestaurantSummary & {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  contact: string;
  email: string;
  webAddress?: string;
  description: string;
  images: string[];
  tax: number;
  courierFee: number;
  totalEmployees: number;
  workingHours: RestaurantWorkingHour[];
  blockedDates: RestaurantBlockedDate[];
  isOpen: boolean;
  isAcceptingOrders?: boolean;
  orderingUnavailableReason?: string | null;
  isBusy?: boolean;
  isNearCapacity?: boolean;
  activeKitchenOrders?: number;
  activeOrderLimit?: number;
  availableCouriers?: number;
  capacityMessage?: string | null;
  capacitySlotsRemaining?: number;
  courierReadinessDelayMinutes?: number;
  courierReadinessMessage?: string;
  courierReadinessTone?: 'healthy' | 'limited' | 'unavailable' | 'unknown';
  estimatedPreparationMinutes?: number;
  estimatedDeliveryMinutes?: number;
  estimatedTotalMinutes?: number;
  etaDelayMinutes?: number;
  etaMessage?: string;
  etaTone?: 'normal' | 'moderate' | 'busy' | 'at_capacity';
  isCourierReady?: boolean;
  orderingMessage?: string;
  totalCouriers?: number;
  averageRating: number;
  ratingCount: number;
};

export type RestaurantPublicDetails = Partial<RestaurantDetails> &
  Pick<RestaurantDetails, '_id' | 'name'>;

export type RestaurantFormData = {
  _id?: EntityId;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  contact: string;
  email: string;
  webAddress: string;
  description: string;
  tax: number;
  courierFee: number;
  minimumOrderAmount: number;
  averagePreparationMinutes: number;
  averageDeliveryMinutes: number;
  activeOrderLimit: number;
  maxItemsPerOrder: number;
  deliveryRadiusKm: number;
  isPaused: boolean;
  pauseReason: string;
  workingHours: RestaurantWorkingHour[];
  blockedDates: RestaurantBlockedDate[];
  totalEmployees: number;
  images: string[];
};

export type RestaurantAdminDetails = RestaurantFormData & {
  _id: EntityId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type AdminRestaurantListItem = RestaurantAdminDetails & {
  owner: {
    _id: EntityId;
    name: string;
    email: string;
  } | null;
  imageCount: number;
  primaryImage: string | null;
  isOpen: boolean;
  isAcceptingOrders: boolean;
  averageRating: number;
  ratingCount: number;
};

export type AdminRestaurantsListResponse = {
  restaurants: AdminRestaurantListItem[];
  filterOptions: RestaurantFilterOptions;
  pagination: RestaurantListResponse['pagination'];
};

export type AdminRestaurantOwnerSummary = {
  _id: EntityId;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  role?: string;
  city?: string;
  country?: string;
  createdAt?: ISODateString;
};

export type AdminRestaurantOperationalSummary = {
  activeKitchenOrders: number;
  activeOrderLimit: number;
  availableCouriers: number;
  capacitySlotsRemaining: number;
  courierReadinessDelayMinutes: number;
  courierReadinessMessage: string;
  courierReadinessTone: 'healthy' | 'limited' | 'unavailable' | 'unknown';
  isAtCapacity: boolean;
  isBusy: boolean;
  isCourierReady: boolean;
  isNearCapacity: boolean;
  shouldSuggestPause: boolean;
  capacityMessage: string;
  estimatedPreparationMinutes: number;
  estimatedDeliveryMinutes: number;
  estimatedTotalMinutes: number;
  etaDelayMinutes: number;
  etaMessage: string;
  etaTone: 'normal' | 'moderate' | 'busy' | 'at_capacity';
  orderingMessage: string;
  orderingUnavailableReason: string | null;
  totalCouriers: number;
};

export type AdminRestaurantMenuSummary = {
  total: number;
  available: number;
  unavailable: number;
};

export type AdminRestaurantOrderSummary = {
  total: number;
  active: number;
  completed: number;
  canceled: number;
  unpaid: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  lastOrderAt: ISODateString | null;
};

export type AdminRestaurantCouponSummary = {
  total: number;
  active: number;
  public: number;
};

export type AdminRestaurantDetailsResponse = {
  restaurant: RestaurantAdminDetails & {
    owner: AdminRestaurantOwnerSummary | null;
    isOpen: boolean;
    isAcceptingOrders: boolean;
    averageRating: number;
    ratingCount: number;
    imageCount: number;
    primaryImage: string | null;
  };
  operationalSummary: AdminRestaurantOperationalSummary;
  menuSummary: AdminRestaurantMenuSummary;
  orderSummary: AdminRestaurantOrderSummary;
  couponSummary: AdminRestaurantCouponSummary;
};
