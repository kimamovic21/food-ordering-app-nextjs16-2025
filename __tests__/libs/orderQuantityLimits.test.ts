import {
  canAddItemToCart,
  DEFAULT_ITEMS_PER_ORDER_LIMIT,
  DEFAULT_MENU_ITEM_QUANTITY_LIMIT,
  getCartQuantityForMenuItem,
  getCartTotalQuantity,
  MAX_ITEMS_PER_ORDER_LIMIT,
  MAX_MENU_ITEM_QUANTITY_LIMIT,
  normalizeItemsPerOrderLimit,
  normalizeMenuItemQuantityLimit,
  validateCartQuantityLimits,
} from '@/libs/orderQuantityLimits';

describe('order quantity limits', () => {
  it('normalizes restaurant and menu item limits into the supported range', () => {
    expect(normalizeItemsPerOrderLimit(undefined)).toBe(DEFAULT_ITEMS_PER_ORDER_LIMIT);
    expect(normalizeItemsPerOrderLimit(0)).toBe(1);
    expect(normalizeItemsPerOrderLimit(999)).toBe(MAX_ITEMS_PER_ORDER_LIMIT);
    expect(normalizeItemsPerOrderLimit(12.8)).toBe(12);

    expect(normalizeMenuItemQuantityLimit(undefined)).toBe(DEFAULT_MENU_ITEM_QUANTITY_LIMIT);
    expect(normalizeMenuItemQuantityLimit(-5)).toBe(1);
    expect(normalizeMenuItemQuantityLimit(100)).toBe(MAX_MENU_ITEM_QUANTITY_LIMIT);
    expect(normalizeMenuItemQuantityLimit(7.9)).toBe(7);
  });

  it('counts total cart quantity and quantity for the same menu item across sizes', () => {
    const cartItems = [
      { _id: 'pizza-1', quantity: 2 },
      { _id: 'pizza-1', quantity: 3 },
      { _id: 'drink-1', quantity: 4 },
    ];

    expect(getCartTotalQuantity(cartItems)).toBe(9);
    expect(getCartQuantityForMenuItem(cartItems, 'pizza-1')).toBe(5);
    expect(getCartQuantityForMenuItem(cartItems, 'missing')).toBe(0);
  });

  it('blocks adding another item when the per-item limit would be exceeded', () => {
    const violation = canAddItemToCart({
      cartItems: [{ _id: 'pizza-1', name: 'Pizza', quantity: 2, maxQuantityPerOrder: 2 }],
      item: { _id: 'pizza-1', name: 'Pizza', maxQuantityPerOrder: 2 },
      maxItemsPerOrder: 20,
    });

    expect(violation).toEqual(
      expect.objectContaining({
        type: 'item_quantity_limit',
        itemQuantity: 3,
        maxQuantityPerOrder: 2,
      })
    );
  });

  it('blocks adding another item when the restaurant order limit would be exceeded', () => {
    const violation = canAddItemToCart({
      cartItems: [
        { _id: 'pizza-1', name: 'Pizza', quantity: 2, maxQuantityPerOrder: 20 },
        { _id: 'drink-1', name: 'Drink', quantity: 1, maxQuantityPerOrder: 20 },
      ],
      item: { _id: 'dessert-1', name: 'Cake', maxQuantityPerOrder: 20 },
      maxItemsPerOrder: 3,
    });

    expect(violation).toEqual(
      expect.objectContaining({
        type: 'order_quantity_limit',
        totalQuantity: 4,
        maxItemsPerOrder: 3,
      })
    );
  });

  it('validates existing carts against item and restaurant limits', () => {
    expect(
      validateCartQuantityLimits({
        cartItems: [
          { _id: 'pizza-1', name: 'Pizza', quantity: 2, maxQuantityPerOrder: 2 },
          { _id: 'pizza-1', name: 'Pizza', quantity: 1, maxQuantityPerOrder: 2 },
        ],
        maxItemsPerOrder: 20,
      })
    ).toEqual(
      expect.objectContaining({
        type: 'item_quantity_limit',
        itemQuantity: 3,
        maxQuantityPerOrder: 2,
      })
    );

    expect(
      validateCartQuantityLimits({
        cartItems: [
          { _id: 'pizza-1', name: 'Pizza', quantity: 2, maxQuantityPerOrder: 20 },
          { _id: 'drink-1', name: 'Drink', quantity: 2, maxQuantityPerOrder: 20 },
        ],
        maxItemsPerOrder: 3,
      })
    ).toEqual(
      expect.objectContaining({
        type: 'order_quantity_limit',
        totalQuantity: 4,
        maxItemsPerOrder: 3,
      })
    );
  });
});
