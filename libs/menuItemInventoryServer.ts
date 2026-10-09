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

export const applyPaidOrderInventoryAdjustment = async (order: any) => {
  if (!order || order.inventoryAdjustedAt) {
    return {
      adjusted: false,
      alerts: [] as InventoryAdjustmentAlert[],
      ok: true as const,
      violations: [] as InventoryAdjustmentViolation[],
    };
  }

  const products = Array.isArray(order.cartProducts) ? order.cartProducts : [];
  const quantityByMenuItemId = new Map<string, number>();

  for (const product of products) {
    const productId = product?.productId?.toString?.() || String(product?.productId || '');

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      continue;
    }

    quantityByMenuItemId.set(
      productId,
      (quantityByMenuItemId.get(productId) || 0) +
        Math.max(1, Math.floor(Number(product.quantity) || 1))
    );
  }

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
    _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
    trackInventory: true,
  })
    .select('_id name restaurantId trackInventory stockQuantity lowStockThreshold')
    .lean();

  const trackedItems = menuItems.map((item: any) => ({
    id: item._id.toString(),
    lowStockThreshold: normalizeLowStockThreshold(item.lowStockThreshold),
    name: item.name || 'Menu item',
    requestedQuantity: quantityByMenuItemId.get(item._id.toString()) || 0,
    restaurantId: item.restaurantId?.toString?.() || String(item.restaurantId || ''),
    stockQuantity: normalizeMenuItemStockQuantity(item.stockQuantity, 0),
  }));

  const violations = trackedItems
    .filter((item) => item.requestedQuantity > item.stockQuantity)
    .map((item) => ({
      menuItemId: item.id,
      menuItemName: item.name,
      requestedQuantity: item.requestedQuantity,
      stockQuantity: item.stockQuantity,
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
        stockQuantity: { $gte: item.requestedQuantity },
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
            stockQuantity: item.stockQuantity,
          },
        ],
      };
    }

    const previousStatus = getMenuItemInventoryStatus({
      lowStockThreshold: item.lowStockThreshold,
      stockQuantity: item.stockQuantity,
      trackInventory: true,
    });
    const nextStockQuantity = Math.max(0, item.stockQuantity - item.requestedQuantity);
    const nextStatus = getMenuItemInventoryStatus({
      lowStockThreshold: item.lowStockThreshold,
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
