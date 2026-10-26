import { z } from 'zod';
import { MAX_LOW_STOCK_THRESHOLD, MAX_MENU_ITEM_STOCK_QUANTITY } from '@/libs/menuItemInventory';
import type { MenuItemEditBaseline } from '@/types/menu';

export const menuItemEditVersionSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER - 1);

export const menuItemInventoryEditSchema = z.object({
  expectedEditVersion: menuItemEditVersionSchema,
  trackInventory: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).max(MAX_MENU_ITEM_STOCK_QUANTITY).nullable().optional(),
  expectedStockQuantity: z
    .number()
    .int()
    .min(0)
    .max(MAX_MENU_ITEM_STOCK_QUANTITY)
    .nullable()
    .optional(),
  lowStockThreshold: z.number().int().min(0).max(MAX_LOW_STOCK_THRESHOLD).optional(),
});

export const menuItemEditVersionFilter = (expectedEditVersion: number) => ({
  $expr: { $eq: [{ $ifNull: ['$editVersion', 0] }, expectedEditVersion] },
});

// Unchanged stock is deliberately absent: saving a description must not restock sold items.
export function getMenuItemStockEdit(
  baseline: MenuItemEditBaseline,
  trackInventory: boolean,
  stockQuantity: number
) {
  if (
    !trackInventory ||
    (baseline.trackInventory === true && stockQuantity === (baseline.stockQuantity ?? 0))
  ) {
    return {};
  }
  return { stockQuantity, expectedStockQuantity: baseline.stockQuantity ?? null };
}

export function buildMenuItemInventoryEdit(
  current: MenuItemEditBaseline,
  input: z.infer<typeof menuItemInventoryEditSchema>
) {
  const trackInventory = input.trackInventory ?? current.trackInventory === true;
  const changesTracking = trackInventory !== (current.trackInventory === true);
  const writesStock = trackInventory && input.stockQuantity !== undefined;

  if (
    (trackInventory && changesTracking && input.stockQuantity == null) ||
    (writesStock && (input.stockQuantity === null || input.expectedStockQuantity === undefined))
  ) {
    return { error: 'A stock adjustment requires current stock and its previously loaded value.' };
  }
  if (!trackInventory && input.stockQuantity != null) {
    return { error: 'Enable inventory tracking before setting stock.' };
  }

  const filter: Record<string, unknown>[] = [menuItemEditVersionFilter(input.expectedEditVersion)];
  const fields: Record<string, unknown> = {};
  if (input.lowStockThreshold !== undefined) fields.lowStockThreshold = input.lowStockThreshold;
  if (input.trackInventory !== undefined) fields.trackInventory = trackInventory;

  if (writesStock) {
    filter.push({
      $expr: { $eq: [{ $ifNull: ['$stockQuantity', null] }, input.expectedStockQuantity] },
    });
    filter.push({
      $expr: { $lte: [{ $ifNull: ['$reservedStockQuantity', 0] }, input.stockQuantity] },
    });
    fields.stockQuantity = input.stockQuantity;
    fields.stockLastAdjustedAt = new Date();
  }
  if (changesTracking) {
    // A reservation can arrive after the route read; enforce this inside the write too.
    filter.push({ $expr: { $eq: [{ $ifNull: ['$reservedStockQuantity', 0] }, 0] } });
    if (!trackInventory) fields.stockQuantity = null;
    fields.stockLastAdjustedAt = new Date();
  }
  return { filter: { $and: filter }, fields };
}
