import { Restaurant } from '@/models/restaurant';

const baseRestaurant = {
  ownerId: '507f1f77bcf86cd799439011',
  name: 'Pizza Hub',
  street: 'Main Street 1',
  city: 'Sarajevo',
  postalCode: '71000',
  country: 'Bosnia & Herzegovina',
  latitude: 43.8563,
  longitude: 18.4131,
  contact: '+38761123456',
  email: 'restaurant@example.com',
  description: 'A family restaurant with fresh pizza and pasta.',
};

describe('Restaurant model validation', () => {
  it('defaults maxItemsPerOrder to the courier-safe limit', async () => {
    const restaurant: any = new Restaurant(baseRestaurant);

    await expect(restaurant.validate()).resolves.toBeUndefined();
    expect(restaurant.maxItemsPerOrder).toBe(20);
  });

  it('rejects restaurant item limits above the courier-safe maximum', async () => {
    const restaurant: any = new Restaurant({
      ...baseRestaurant,
      maxItemsPerOrder: 21,
    });

    await expect(restaurant.validate()).rejects.toBeTruthy();
  });
});
