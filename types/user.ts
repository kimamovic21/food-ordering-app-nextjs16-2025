export type UserRole = 'user' | 'admin' | 'courier';

export interface UserSummary {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: UserRole | string | null;
}

export interface DeliveryAddress {
  _id: string;
  label: string;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type UserCourierWorkingHour = {
  day: string;
  startTime: string;
  endTime: string;
  isUnavailable?: boolean;
};

export type DeliveryAddressInput = Omit<DeliveryAddress, '_id' | 'createdAt' | 'updatedAt'>;

export type UserActivitySummary = {
  totalOrders: number;
  completedOrders: number;
  canceledOrders: number;
  activeOrders: number;
  unpaidOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export interface ExtendedUser {
  _id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  provider?: string | null;
  phone?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  role?: UserRole | string | null;
  availability?: boolean;
  loyaltyTier?: string | null;
  restaurantId?: string | null;
  deliveryAddresses?: DeliveryAddress[];
}

export type ProfileData = ExtendedUser;

export type AdminUserListItem = UserSummary & {
  image?: string | null;
  provider?: string | null;
  city?: string;
  country?: string;
  phone?: string;
  postalCode?: string;
  streetAddress?: string;
  emailVerified?: string | null;
  emailVerifiedAt?: string | null;
  availability?: boolean;
  takenOrder?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lastLocationUpdate?: string | null;
  restaurantId?: string | { _id?: string; name?: string } | null;
  favoriteMenuItems?: string[];
  favoriteRestaurants?: string[];
  deliveryAddresses?: DeliveryAddress[];
  courierWorkingHours?: UserCourierWorkingHour[];
  notificationSoundEnabled?: boolean;
  messageSoundEnabled?: boolean;
  activitySummary?: UserActivitySummary;
  createdAt?: string;
  updatedAt?: string;
  admin?: boolean;
};

export type ProfileUpdateData = Pick<
  ExtendedUser,
  'name' | 'phone' | 'streetAddress' | 'postalCode' | 'city' | 'country'
>;
