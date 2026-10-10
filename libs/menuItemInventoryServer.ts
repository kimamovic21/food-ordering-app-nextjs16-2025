import mongoose from 'mongoose';

import {
  getMenuItemInventoryStatus,
  normalizeLowStockThreshold,
  normalizeMenuItemStockQuantity,
} from '@/libs/menuItemInventory';
import { MenuItem } from '@/models/menuItem';

export type InventoryAdjustmentViolation = {
  menuItemId: string;
  menuItemName: string;
  requestedQuantity: number;
  stockQuantity: number;
};

export type InventoryAdjustmentAlert = {
  lowStockThreshold: number;
  menuItemId: string;
  menuItemName: string;
  requestedQuantity: number;
  restaurantId: string;
  status: 'low_stock' | 'sold_out';
  stockQuantity: number;
};

export type InventoryReservationItem = {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
};

export type InventoryReservationResult = {
  expiresAt: Date;
  ok: boolean;
  reserved: boolean;
  reservedItems: InventoryReservationItem[];
  violations: InventoryAdjustmentViolation[];
};

const getInventoryProductId = (product: any) =>
  product?.productId?.toString?.() ||
  product?._id?.toString?.() ||
  String(product?.productId || product?._id || '');

const getInventoryProductQuantity = (product: any) =>
  Math.max(1, Math.floor(Number(product?.quantity) || 1));

const buildQuantityByMenuItemId = (products: any[]) => {
  const quantityByMenuItemId = new Map<string, number>();

  for (const product of products) {
    const productId = getInventoryProductId(product);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      continue;
    }

    quantityByMenuItemId.set(
      productId,
      (quantityByMenuItemId.get(productId) || 0) + getInventoryProductQuantity(product)
    );
  }

  return quantityByMenuItemId;
};

const getMenuItemObjectIds = (ids: string[]) =>
  ids.map((id) => new mongoose.Types.ObjectId(id));

const buildAvailableStockExpression = () => ({
  $subtract: [
    { $ifNull: ['$stockQuantity', 0] },
    { $ifNull: ['$reservedStockQuantity', 0] },
  ],
});

const buildReservedStockExpression = () => ({ $ifNull: ['$reservedStockQuantity', 0] });

const normalizeReservationItems = (items: any[]): InventoryReservationItem[] =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      menuItemId: item?.menuItemId?.toString?.() || String(item?.menuItemId || ''),
      menuItemName: item?.menuItemName || 'Menu item',
      quantity: getInventoryProductQuantity(item),
    }))
    .filter((item) => mongoose.Types.ObjectId.isValid(item.menuItemId) && item.quantity > 0);

export const releaseInventoryReservationItems = async (items: InventoryReservationItem[]) => {
  const now = new Date();

  await Promise.all(
    items.map((item) =>
      MenuItem.updateOne({ _id: item.menuItemId, trackInventory: true }, [
        {
          $set: {
            reservedStockQuantity: {
              $max: [0, { $subtract: [buildReservedStockExpression(), item.quantity] }],
            },
            stockReservationUpdatedAt: now,
          },
        },
      ])
    )
  );
};

export const reserveTrackedInventoryForCheckout = async ({
  expiresAt,
  items,
}: {
  expiresAt: Date;
  items: any[];
}): Promise<InventoryReservationResult> => {
  const quantityByMenuItemId = buildQuantityByMenuItemId(items);
  const ids = Array.from(quantityByMenuItemId.keys());

  if (ids.length === 0) {
    return {
      expiresAt,
      ok: true,
      reserved: false,
      reservedItems: [],
      violations: [],
    };
  }

  const menuItems = await MenuItem.find({
    _id: { $in: getMenuItemObjectIds(ids) },
    trackInventory: true,
  })
    .select('_id name stockQuantity reservedStockQuantity trackInventory')
    .lean();

  const trackedItems = menuItems.map((item: any) => {
    const stockQuantity = normalizeMenuItemStockQuantity(item.stockQuantity, 0);
    const reservedStockQuantity = normalizeMenuItemStockQuantity(item.reservedStockQuantity, 0);

    return {
      availableStockQuantity: Math.max(0, stockQuantity - reservedStockQuantity),
      id: item._id.toString(),
      name: item.name || 'Menu item',
      requestedQuantity: quantityByMenuItemId.get(item._id.toString()) || 0,
    };
  });

  const violations = trackedItems
    .filter((item) => item.requestedQuantity > item.availableStockQuantity)
    .map((item) => ({
      menuItemId: item.id,
      menuItemName: item.name,
      requestedQuantity: item.requestedQuantity,
      stockQuantity: item.availableStockQuantity,
    }));

  if (violations.length > 0) {
    return {
      expiresAt,
      ok: false,
      reserved: false,
      reservedItems: [],
      violations,
    };
  }

  const now = new Date();
  const reservedItems: InventoryReservationItem[] = [];

  for (const item of trackedItems) {
    if (item.requestedQuantity <= 0) {
      continue;
    }

    const result = await MenuItem.updateOne(
      {
        _id: item.id,
        trackInventory: true,
        $expr: {
          $gte: [buildAvailableStockExpression(), item.requestedQuantity],
        },
      },
      {
        $inc: { reservedStockQuantity: item.requestedQuantity },
        $set: { stockReservationUpdatedAt: now },
      }
    );

    if (result.modifiedCount !== 1) {
      await releaseInventoryReservationItems(reservedItems);

      return {
        expiresAt,
        ok: false,
        reserved: false,
        reservedItems: [],
        violations: [
          {
            menuItemId: item.id,
            menuItemName: item.name,
            requestedQuantity: item.requestedQuantity,
            stockQuantity: item.availableStockQuantity,
          },
        ],
      };
    }

    reservedItems.push({
      menuItemId: item.id,
      menuItemName: item.name,
      quantity: item.requestedQuantity,
    });
  }

  return {
    expiresAt,
    ok: true,
    reserved: reservedItems.length > 0,
    reservedItems,
    violations: [],
  };
};

export const releaseOrderInventoryReservation = async (order: any, reason: string) => {
  if (!order || order.inventoryReservationStatus !== 'reserved') {
    return { released: false, reservedItems: [] as InventoryReservationItem[] };
  }

  const reservedItems = normalizeReservationItems(order.inventoryReservedItems);

  if (reservedItems.length > 0) {
    await releaseInventoryReservationItems(reservedItems);
  }

  order.inventoryReservationStatus = 'released';
  order.inventoryReservationReleasedAt = new Date();
  order.inventoryReservationReleaseReason = reason;

  return { released: reservedItems.length > 0, reservedItems };
};

const captureReservedInventoryForPaidOrder = async (order: any) => {
  const reservedItems = normalizeReservationItems(order.inventoryReservedItems);

  if (reservedItems.length === 0) {
    return {
      adjusted: false,
      alerts: [] as InventoryAdjustmentAlert[],
      ok: true as const,
      violations: [] as InventoryAdjustmentViolation[],
    };
  }

  const menuItems = await MenuItem.find({
    _id: { $in: getMenuItemObjectIds(reservedItems.map((item) => item.menuItemId)) },
    trackInventory: true,
  })
    .select('_id name restaurantId trackInventory stockQuantity reservedStockQuantity lowStockThreshold')
    .lean();

  const menuItemById = new Map(
    menuItems.map((item: any) => {
      const stockQuantity = normalizeMenuItemStockQuantity(item.stockQuantity, 0);
      const reservedStockQuantity = normalizeMenuItemStockQuantity(item.reservedStockQuantity, 0);

      return [
        item._id.toString(),
        {
          lowStockThreshold: normalizeLowStockThreshold(item.lowStockThreshold),
          name: item.name || 'Menu item',
          restaurantId: item.restaurantId?.toString?.() || String(item.restaurantId || ''),
          reservedStockQuantity,
          stockQuantity,
        },
      ];
    })
  );

  const violations = reservedItems
    .map((item) => {
      const menuItem = menuItemById.get(item.menuItemId);

      if (!menuItem) {
        return {
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          requestedQuantity: item.quantity,
          stockQuantity: 0,
        };
      }

      if (item.quantity > menuItem.reservedStockQuantity || item.quantity > menuItem.stockQuantity) {
        return {
          menuItemId: item.menuItemId,
          menuItemName: menuItem.name,
          requestedQuantity: item.quantity,
          stockQuantity: Math.min(menuItem.reservedStockQuantity, menuItem.stockQuantity),
        };
      }

      return null;
    })
    .filter((item): item is InventoryAdjustmentViolation => Boolean(item));

  if (violations.length > 0) {
    return {
      adjusted: false,
      alerts: [] as InventoryAdjustmentAlert[],
      ok: false as const,
      violations,
    };
  }

  const now = new Date();
  const adjustedItems: InventoryReservationItem[] = [];
  const alerts: InventoryAdjustmentAlert[] = [];

  for (const item of reservedItems) {
    const menuItem = menuItemById.get(item.menuItemId);

    if (!menuItem) {
      continue;
    }

    const result = await MenuItem.updateOne(
      {
        _id: item.menuItemId,
        trackInventory: true,
        $expr: {
          $and: [
            { $gte: [buildReservedStockExpression(), item.quantity] },
            { $gte: [{ $ifNull: ['$stockQuantity', 0] }, item.quantity] },
          ],
        },
      },
      {
        $inc: {
          reservedStockQuantity: -item.quantity,
          stockQuantity: -item.quantity,
        },
        $set: {
          stockLastAdjustedAt: now,
          stockReservationUpdatedAt: now,
        },
      }
    );

    if (result.modifiedCount !== 1) {
      await Promise.all(
        adjustedItems.map((adjustedItem) =>
          MenuItem.updateOne(
            { _id: adjustedItem.menuItemId, trackInventory: true },
            {
              $inc: {
                reservedStockQuantity: adjustedItem.quantity,
                stockQuantity: adjustedItem.quantity,
              },
            }
          )
        )
      );

      return {
        adjusted: false,
        alerts: [] as InventoryAdjustmentAlert[],
        ok: false as const,
        violations: [
          {
            menuItemId: item.menuItemId,
            menuItemName: menuItem.name,
            requestedQuantity: item.quantity,
            stockQuantity: Math.min(menuItem.reservedStockQuantity, menuItem.stockQuantity),
          },
        ],
      };
    }

    const previousStatus = getMenuItemInventoryStatus({
      lowStockThreshold: menuItem.lowStockThreshold,
      reservedStockQuantity: 0,
      stockQuantity: menuItem.stockQuantity,
      trackInventory: true,
    });
    const nextStockQuantity = Math.max(0, menuItem.stockQuantity - item.quantity);
    const nextStatus = getMenuItemInventoryStatus({
      lowStockThreshold: menuItem.lowStockThreshold,
      reservedStockQuantity: 0,
      stockQuantity: nextStockQuantity,
      trackInventory: true,
    });

    if (
      (nextStatus === 'low_stock' || nextStatus === 'sold_out') &&
      previousStatus !== nextStatus
    ) {
      alerts.push({
        lowStockThreshold: menuItem.lowStockThreshold,
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        requestedQuantity: item.quantity,
        restaurantId: menuItem.restaurantId,
        status: nextStatus,
        stockQuantity: nextStockQuantity,
      });
    }

    adjustedItems.push(item);
  }

  return {
    adjusted: adjustedItems.length > 0,
    alerts,
    ok: true as const,
    violations: [] as InventoryAdjustmentViolation[],
  };
};

export const applyPaidOrderInventoryAdjustment = async (order: any) => {
  if (!order || order.inventoryAdjustedAt) {
    return {
      adjusted: false,
      alerts: [] as InventoryAdjustmentAlert[],
      ok: true as const,
      violations: [] as InventoryAdjustmentViolation[],
    };
  }

  if (order.inventoryReservationStatus === 'reserved') {
    return captureReservedInventoryForPaidOrder(order);
  }

  const products = Array.isArray(order.cartProducts) ? order.cartProducts : [];
  const quantityByMenuItemId = buildQuantityByMenuItemId(products);
  const ids = Array.from(quantityByMenuItemId.keys());

  if (ids.length === 0) {
    return {
      adjusted: false,
      alerts: [] as InventoryAdjustmentAlert[],
      ok: true as const,
      violations: [] as InventoryAdjustmentViolation[],
    };
  }

  const menuItems = await MenuItem.find({
    _id: { $in: getMenuItemObjectIds(ids) },
    trackInventory: true,
  })
    .select('_id name restaurantId trackInventory stockQuantity reservedStockQuantity lowStockThreshold')
    .lean();

  const trackedItems = menuItems.map((item: any) => ({
    availableStockQuantity: Math.max(
      0,
      normalizeMenuItemStockQuantity(item.stockQuantity, 0) -
        normalizeMenuItemStockQuantity(item.reservedStockQuantity, 0)
    ),
    id: item._id.toString(),
    lowStockThreshold: normalizeLowStockThreshold(item.lowStockThreshold),
    name: item.name || 'Menu item',
    requestedQuantity: quantityByMenuItemId.get(item._id.toString()) || 0,
    restaurantId: item.restaurantId?.toString?.() || String(item.restaurantId || ''),
    stockQuantity: normalizeMenuItemStockQuantity(item.stockQuantity, 0),
  }));

  const violations = trackedItems
    .filter((item) => item.requestedQuantity > item.availableStockQuantity)
    .map((item) => ({
      menuItemId: item.id,
      menuItemName: item.name,
      requestedQuantity: item.requestedQuantity,
      stockQuantity: item.availableStockQuantity,
    }));

  if (violations.length > 0) {
    return {
      adjusted: false,
      alerts: [] as InventoryAdjustmentAlert[],
      ok: false as const,
      violations,
    };
  }

  const adjustedItems: Array<{ id: string; quantity: number }> = [];
  const alerts: InventoryAdjustmentAlert[] = [];

  for (const item of trackedItems) {
    if (item.requestedQuantity <= 0) {
      continue;
    }

    const result = await MenuItem.updateOne(
      {
        _id: item.id,
        trackInventory: true,
        $expr: {
          $gte: [buildAvailableStockExpression(), item.requestedQuantity],
        },
      },
      {
        $inc: { stockQuantity: -item.requestedQuantity },
        $set: { stockLastAdjustedAt: new Date() },
      }
    );

    if (result.modifiedCount !== 1) {
      await Promise.all(
        adjustedItems.map((adjustedItem) =>
          MenuItem.updateOne(
            { _id: adjustedItem.id, trackInventory: true },
            { $inc: { stockQuantity: adjustedItem.quantity } }
          )
        )
      );

      return {
        adjusted: false,
        alerts: [] as InventoryAdjustmentAlert[],
        ok: false as const,
        violations: [
          {
            menuItemId: item.id,
            menuItemName: item.name,
            requestedQuantity: item.requestedQuantity,
            stockQuantity: item.availableStockQuantity,
          },
        ],
      };
    }

    const previousStatus = getMenuItemInventoryStatus({
      lowStockThreshold: item.lowStockThreshold,
      reservedStockQuantity: 0,
      stockQuantity: item.stockQuantity,
      trackInventory: true,
    });
    const nextStockQuantity = Math.max(0, item.stockQuantity - item.requestedQuantity);
    const nextStatus = getMenuItemInventoryStatus({
      lowStockThreshold: item.lowStockThreshold,
      reservedStockQuantity: 0,
      stockQuantity: nextStockQuantity,
      trackInventory: true,
    });

    if (
      (nextStatus === 'low_stock' || nextStatus === 'sold_out') &&
      previousStatus !== nextStatus
    ) {
      alerts.push({
        lowStockThreshold: item.lowStockThreshold,
        menuItemId: item.id,
        menuItemName: item.name,
        requestedQuantity: item.requestedQuantity,
        restaurantId: item.restaurantId,
        status: nextStatus,
        stockQuantity: nextStockQuantity,
      });
    }

    adjustedItems.push({ id: item.id, quantity: item.requestedQuantity });
  }

  return {
    adjusted: adjustedItems.length > 0,
    alerts,
    ok: true as const,
    violations: [] as InventoryAdjustmentViolation[],
  };
};
