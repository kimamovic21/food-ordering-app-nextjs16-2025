import 'server-only';
import type { Types } from 'mongoose';
import { notifyUsersAboutRestaurantAvailable } from '@/libs/notifications';
import { getRestaurantOrderingCapacityStatus } from '@/libs/restaurantOrderingStatus';
import { Restaurant } from '@/models/restaurant';
import { RestaurantAvailabilityRequest } from '@/models/restaurantAvailabilityRequest';

export const notifyWaitingUsersIfRestaurantAcceptingOrders = async ({
  restaurantId,
  restaurantName,
  isAcceptingOrders,
}: {
  restaurantId: string | Types.ObjectId;
  restaurantName: string;
  isAcceptingOrders: boolean;
}) => {
  if (!isAcceptingOrders || !restaurantId) {
    return;
  }

  const waitingRequests = await RestaurantAvailabilityRequest.find({
    restaurantId,
    status: 'waiting',
  }).select('_id userId');

  if (waitingRequests.length === 0) {
    return;
  }

  await notifyUsersAboutRestaurantAvailable({
    userIds: waitingRequests.map((request) => request.userId),
    restaurantId,
    restaurantName,
  });

  await RestaurantAvailabilityRequest.updateMany(
    { _id: { $in: waitingRequests.map((request) => request._id) } },
    { $set: { status: 'notified', notifiedAt: new Date() } }
  );
};

export const notifyWaitingUsersIfRestaurantCanAcceptOrders = async (restaurantId: unknown) => {
  if (!restaurantId) return;

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return;

  const orderingStatus = await getRestaurantOrderingCapacityStatus({
    restaurant,
  });

  await notifyWaitingUsersIfRestaurantAcceptingOrders({
    restaurantId: restaurant._id,
    restaurantName: restaurant.name,
    isAcceptingOrders: orderingStatus.isAcceptingOrders,
  });
};
