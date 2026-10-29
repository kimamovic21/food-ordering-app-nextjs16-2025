export type CourierTrackingLocation = {
  latitude: number;
  longitude: number;
  lastLocationUpdate: string | null;
};

export type CourierTrackingStatus = 'active' | 'waiting' | 'ended' | 'denied';

export type CourierTrackingResponse = {
  location: CourierTrackingLocation | null;
  trackingStatus: CourierTrackingStatus;
  checkedAt: string;
  message?: string;
  courier?: { name?: string; email?: string };
};
