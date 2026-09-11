import mongoose from 'mongoose';

import { deleteUserAsSuperAdmin, AdminUserDeletionError } from '@/libs/adminUserDeletion';
import { deleteCloudinaryImageByUrl } from '@/libs/cloudinaryCleanup';
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

vi.mock('mongoose', () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: vi.fn(() => true),
      },
    },
  },
}));

vi.mock('@/libs/cloudinaryCleanup', () => ({
  deleteCloudinaryImageByUrl: vi.fn(async (imageUrl?: string | null) => ({
    publicId: imageUrl ? `public-id-for-${imageUrl}` : null,
    deleted: Boolean(imageUrl),
  })),
}));

vi.mock('@/libs/auditLog', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/models/conversation', () => ({
  Conversation: {
    updateMany: vi.fn(),
  },
}));

vi.mock('@/models/coupon', () => ({
  Coupon: {
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/models/courierReview', () => ({
  CourierReview: {
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/models/menuItem', () => ({
  MenuItem: {
    deleteMany: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/models/message', () => ({
  Message: {
    updateMany: vi.fn(),
  },
}));

vi.mock('@/models/notification', () => ({
  Notification: {
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/models/order', () => ({
  Order: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    deleteOne: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/restaurantAvailabilityRequest', () => ({
  RestaurantAvailabilityRequest: {
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/models/restaurantReview', () => ({
  RestaurantReview: {
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/models/supportTicket', () => ({
  SupportTicket: {
    updateMany: vi.fn(),
  },
}));

vi.mock('@/models/user', () => ({
  User: {
    deleteOne: vi.fn(),
    findById: vi.fn(),
    updateMany: vi.fn(),
  },
}));

const noActiveOrderQuery = () => ({
  select: vi.fn().mockResolvedValue(null),
});

describe('deleteUserAsSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true);
    vi.mocked(Order.findOne).mockReturnValue(noActiveOrderQuery() as never);
    vi.mocked(Conversation.updateMany).mockResolvedValue({ modifiedCount: 1 } as never);
    vi.mocked(Coupon.deleteMany).mockResolvedValue({ deletedCount: 2 } as never);
    vi.mocked(CourierReview.deleteMany).mockResolvedValue({ deletedCount: 3 } as never);
    vi.mocked(MenuItem.deleteMany).mockResolvedValue({ deletedCount: 1 } as never);
    vi.mocked(Message.updateMany).mockResolvedValue({ modifiedCount: 4 } as never);
    vi.mocked(Notification.deleteMany).mockResolvedValue({ deletedCount: 5 } as never);
    vi.mocked(Restaurant.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);
    vi.mocked(RestaurantAvailabilityRequest.deleteMany)
      .mockResolvedValueOnce({ deletedCount: 2 } as never)
      .mockResolvedValueOnce({ deletedCount: 1 } as never);
    vi.mocked(RestaurantReview.deleteMany)
      .mockResolvedValueOnce({ deletedCount: 6 } as never)
      .mockResolvedValueOnce({ deletedCount: 7 } as never);
    vi.mocked(SupportTicket.updateMany).mockResolvedValue({ modifiedCount: 2 } as never);
    vi.mocked(User.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);
    vi.mocked(User.updateMany).mockResolvedValue({ modifiedCount: 8 } as never);
  });

  it('deletes a user, owned restaurant graph, reviews, and Cloudinary images', async () => {
    vi.mocked(User.findById).mockResolvedValue({
      _id: 'user-1',
      email: 'owner@example.com',
      image: 'user-image',
      role: 'admin',
      restaurantId: 'restaurant-1',
    } as never);
    vi.mocked(Restaurant.findOne).mockResolvedValue({
      _id: 'restaurant-1',
      images: ['restaurant-image'],
    } as never);
    vi.mocked(MenuItem.find).mockResolvedValue([
      {
        _id: 'menu-item-1',
        image: 'menu-item-image',
      },
    ] as never);

    const summary = await deleteUserAsSuperAdmin({
      targetUserId: '507f1f77bcf86cd799439011',
      actor: { _id: 'super-admin-1', email: 'super@example.com', role: 'admin' },
      superAdminEmail: 'super@example.com',
    });

    expect(deleteCloudinaryImageByUrl).toHaveBeenCalledWith('user-image');
    expect(deleteCloudinaryImageByUrl).toHaveBeenCalledWith('restaurant-image');
    expect(deleteCloudinaryImageByUrl).toHaveBeenCalledWith('menu-item-image');
    expect(MenuItem.deleteMany).toHaveBeenCalledWith({ restaurantId: 'restaurant-1' });
    expect(Coupon.deleteMany).toHaveBeenCalledWith({ restaurantId: 'restaurant-1' });
    expect(Restaurant.deleteOne).toHaveBeenCalledWith({ _id: 'restaurant-1' });
    expect(RestaurantReview.deleteMany).toHaveBeenCalledWith({ restaurantId: 'restaurant-1' });
    expect(RestaurantReview.deleteMany).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(CourierReview.deleteMany).toHaveBeenCalledWith({
      $or: [{ userId: 'user-1' }, { courierId: 'user-1' }],
    });
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'user-1' });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.deleted_by_super_admin',
        entityType: 'user',
        entityId: 'user-1',
        restaurantId: 'restaurant-1',
      })
    );
    expect(summary).toMatchObject({
      targetUserId: 'user-1',
      deletedRestaurantId: 'restaurant-1',
      deletedMenuItemsCount: 1,
      deletedCouponsCount: 2,
      deletedImagesCount: 3,
    });
  });

  it('blocks deletion when the target user has an active order', async () => {
    vi.mocked(User.findById).mockResolvedValue({
      _id: 'user-1',
      email: 'customer@example.com',
      image: null,
      role: 'user',
      restaurantId: null,
    } as never);
    vi.mocked(Order.findOne).mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ _id: 'order-1', orderStatus: 'processing' }),
    } as never);

    await expect(
      deleteUserAsSuperAdmin({
        targetUserId: '507f1f77bcf86cd799439011',
        actor: { _id: 'super-admin-1', email: 'super@example.com', role: 'admin' },
        superAdminEmail: 'super@example.com',
      })
    ).rejects.toMatchObject<Partial<AdminUserDeletionError>>({
      status: 409,
      message: 'This user has an active order. Complete or cancel it before deleting the user.',
    });

    expect(User.deleteOne).not.toHaveBeenCalled();
    expect(Restaurant.deleteOne).not.toHaveBeenCalled();
  });
});
