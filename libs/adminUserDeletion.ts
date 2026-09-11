import mongoose from 'mongoose';

import {
  deleteCloudinaryImageByUrl,
  type CloudinaryDeletionResult,
} from '@/libs/cloudinaryCleanup';
import { activeOrderFilter } from '@/libs/orderDeletionGuards';
import { createAuditLog } from '@/libs/auditLog';
import { Conversation } from '@/models/conversation';
import { Coupon } from '@/models/coupon';
import { CourierReview } from '@/models/courierReview';
import { MenuItem } from '@/models/menuItem';
import { Message } from '@/models/message';
import { Notification } from '@/models/notification';
import { Order } from '@/models/order';
import { Restaurant } from '@/models/restaurant';
import { RestaurantAvailabilityRequest } from '@/models/restaurantAvailabilityRequest';
import { RestaurantReview } from '@/models/restaurantReview';
import { SupportTicket } from '@/models/supportTicket';
import { User } from '@/models/user';

type Actor = {
  _id: unknown;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

type DeleteManyResultLike = {
  deletedCount?: number;
  modifiedCount?: number;
};

export type DeletedUserCleanupSummary = {
  targetUserId: string;
  targetEmail: string;
  targetRole: string;
  deletedRestaurantId: string | null;
  deletedMenuItemsCount: number;
  deletedCouponsCount: number;
  deletedRestaurantReviewsCount: number;
  deletedCourierReviewsCount: number;
  deletedNotificationsCount: number;
  deletedAvailabilityRequestsCount: number;
  anonymizedSupportTicketsCount: number;
  hiddenConversationsCount: number;
  hiddenMessagesCount: number;
  cleanedFavoriteUsersCount: number;
  deletedImagesCount: number;
  cloudinaryFailures: CloudinaryDeletionResult[];
};

export class AdminUserDeletionError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AdminUserDeletionError';
    this.status = status;
    this.details = details;
  }
}

const getDeletedCount = (result: DeleteManyResultLike | null | undefined) =>
  Number(result?.deletedCount || 0);

const getModifiedCount = (result: DeleteManyResultLike | null | undefined) =>
  Number(result?.modifiedCount || 0);

const getObjectIdString = (value: unknown) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && 'toString' in value) {
    return String(value);
  }

  return '';
};

const assertNoActiveOrder = async ({
  filter,
  message,
}: {
  filter: Record<string, unknown>;
  message: string;
}) => {
  const activeOrder = await Order.findOne({
    ...filter,
    ...activeOrderFilter,
  }).select('_id orderStatus');

  if (activeOrder) {
    throw new AdminUserDeletionError(message, 409, {
      activeOrderId: getObjectIdString(activeOrder._id),
      activeOrderStatus: activeOrder.orderStatus,
    });
  }
};

const deleteCloudinaryImages = async (imageUrls: Array<string | null | undefined>) => {
  const results: CloudinaryDeletionResult[] = [];

  for (const imageUrl of imageUrls) {
    const result = await deleteCloudinaryImageByUrl(imageUrl);

    if (result.publicId) {
      results.push(result);
    }
  }

  return results;
};

export async function deleteUserAsSuperAdmin({
  targetUserId,
  actor,
  superAdminEmail,
}: {
  targetUserId: string;
  actor: Actor;
  superAdminEmail?: string | null;
}): Promise<DeletedUserCleanupSummary> {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new AdminUserDeletionError('Invalid user ID', 400);
  }

  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    throw new AdminUserDeletionError('User not found', 404);
  }

  if (superAdminEmail && targetUser.email === superAdminEmail) {
    throw new AdminUserDeletionError('You cannot delete the super admin account.', 409);
  }

  await assertNoActiveOrder({
    filter: { userId: targetUser._id },
    message: 'This user has an active order. Complete or cancel it before deleting the user.',
  });

  await assertNoActiveOrder({
    filter: { courierId: targetUser._id },
    message: 'This courier has an active delivery. Complete or cancel it before deleting the user.',
  });

  const restaurant = await Restaurant.findOne({
    $or: [{ ownerId: targetUser._id }, { _id: targetUser.restaurantId }],
  });

  if (restaurant) {
    await assertNoActiveOrder({
      filter: { restaurantId: restaurant._id },
      message:
        'This user owns a restaurant with active orders. Complete or cancel those orders before deleting the user.',
    });
  }

  const menuItems = restaurant ? await MenuItem.find({ restaurantId: restaurant._id }) : [];
  const menuItemIds = menuItems.map((menuItem: { _id: unknown }) => menuItem._id);
  const imageResults = await deleteCloudinaryImages([
    targetUser.image,
    ...(Array.isArray(restaurant?.images) ? restaurant.images : []),
    ...menuItems.map((menuItem: { image?: string | null }) => menuItem.image),
  ]);
  const cloudinaryFailures = imageResults.filter((result) => result.error);

  let deletedMenuItemsCount = 0;
  let deletedCouponsCount = 0;
  let deletedRestaurantReviewsCount = 0;
  let deletedAvailabilityRequestsCount = 0;
  let cleanedFavoriteUsersCount = 0;

  if (restaurant) {
    const [
      menuItemsDeleteResult,
      couponsDeleteResult,
      restaurantReviewsDeleteResult,
      availabilityRequestsDeleteResult,
      favoriteCleanupResult,
    ] = await Promise.all([
      MenuItem.deleteMany({ restaurantId: restaurant._id }),
      Coupon.deleteMany({ restaurantId: restaurant._id }),
      RestaurantReview.deleteMany({ restaurantId: restaurant._id }),
      RestaurantAvailabilityRequest.deleteMany({ restaurantId: restaurant._id }),
      User.updateMany(
        {},
        {
          $pull: {
            favoriteRestaurants: restaurant._id,
            favoriteMenuItems: { $in: menuItemIds },
          },
        }
      ),
    ]);

    deletedMenuItemsCount = getDeletedCount(menuItemsDeleteResult);
    deletedCouponsCount = getDeletedCount(couponsDeleteResult);
    deletedRestaurantReviewsCount = getDeletedCount(restaurantReviewsDeleteResult);
    deletedAvailabilityRequestsCount = getDeletedCount(availabilityRequestsDeleteResult);
    cleanedFavoriteUsersCount = getModifiedCount(favoriteCleanupResult);

    await Restaurant.deleteOne({ _id: restaurant._id });
  }

  const [
    authoredRestaurantReviewsDeleteResult,
    courierReviewsDeleteResult,
    notificationsDeleteResult,
    availabilityRequestsByUserDeleteResult,
    supportTicketsUpdateResult,
    conversationsUpdateResult,
    messagesUpdateResult,
  ] = await Promise.all([
    RestaurantReview.deleteMany({ userId: targetUser._id }),
    CourierReview.deleteMany({
      $or: [{ userId: targetUser._id }, { courierId: targetUser._id }],
    }),
    Notification.deleteMany({ recipientUserId: targetUser._id }),
    RestaurantAvailabilityRequest.deleteMany({ userId: targetUser._id }),
    SupportTicket.updateMany(
      { reporterId: targetUser._id },
      {
        $set: {
          reporterName: 'Deleted user',
          reporterEmail: 'deleted-user@example.local',
          contactEmail: '',
          contactPhone: '',
        },
      }
    ),
    Conversation.updateMany(
      { participantUserIds: targetUser._id },
      { $addToSet: { hiddenFor: targetUser._id } }
    ),
    Message.updateMany(
      {
        $or: [{ senderUserId: targetUser._id }, { recipientUserId: targetUser._id }],
      },
      { $addToSet: { deletedFor: targetUser._id } }
    ),
  ]);

  await User.deleteOne({ _id: targetUser._id });

  const summary: DeletedUserCleanupSummary = {
    targetUserId: getObjectIdString(targetUser._id),
    targetEmail: targetUser.email,
    targetRole: targetUser.role || 'user',
    deletedRestaurantId: restaurant ? getObjectIdString(restaurant._id) : null,
    deletedMenuItemsCount,
    deletedCouponsCount,
    deletedRestaurantReviewsCount:
      deletedRestaurantReviewsCount + getDeletedCount(authoredRestaurantReviewsDeleteResult),
    deletedCourierReviewsCount: getDeletedCount(courierReviewsDeleteResult),
    deletedNotificationsCount: getDeletedCount(notificationsDeleteResult),
    deletedAvailabilityRequestsCount:
      deletedAvailabilityRequestsCount + getDeletedCount(availabilityRequestsByUserDeleteResult),
    anonymizedSupportTicketsCount: getModifiedCount(supportTicketsUpdateResult),
    hiddenConversationsCount: getModifiedCount(conversationsUpdateResult),
    hiddenMessagesCount: getModifiedCount(messagesUpdateResult),
    cleanedFavoriteUsersCount,
    deletedImagesCount: imageResults.filter((result) => result.deleted).length,
    cloudinaryFailures,
  };

  await createAuditLog({
    actor,
    action: 'user.deleted_by_super_admin',
    entityType: 'user',
    entityId: summary.targetUserId,
    restaurantId: summary.deletedRestaurantId || undefined,
    metadata: summary,
  });

  return summary;
}
