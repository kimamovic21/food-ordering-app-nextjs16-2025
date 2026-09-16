import 'server-only';

import { MenuItem } from '@/models/menuItem';
import { Restaurant } from '@/models/restaurant';
import {
  DEFAULT_ITEMS_PER_ORDER_LIMIT,
  DEFAULT_MENU_ITEM_QUANTITY_LIMIT,
  MAX_ITEMS_PER_ORDER_LIMIT,
  MAX_MENU_ITEM_QUANTITY_LIMIT,
  MIN_ITEMS_PER_ORDER_LIMIT,
  MIN_MENU_ITEM_QUANTITY_LIMIT,
} from '@/libs/orderQuantityLimits';

type BackfillModel = {
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
  updateMany: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ) => Promise<{ modifiedCount?: number; matchedCount?: number; nModified?: number }>;
};

export type OrderCapacityBackfillOperation = {
  label: string;
  target: 'restaurants' | 'menuItems';
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
};

export type OrderCapacityBackfillResult = {
  dryRun: boolean;
  restaurants: Record<string, number>;
  menuItems: Record<string, number>;
};

export const createOrderCapacityBackfillOperations = (): OrderCapacityBackfillOperation[] => [
  {
    label: 'missingMaxItemsPerOrder',
    target: 'restaurants',
    filter: {
      $or: [{ maxItemsPerOrder: { $exists: false } }, { maxItemsPerOrder: null }],
    },
    update: { $set: { maxItemsPerOrder: DEFAULT_ITEMS_PER_ORDER_LIMIT } },
  },
  {
    label: 'lowMaxItemsPerOrder',
    target: 'restaurants',
    filter: { maxItemsPerOrder: { $lt: MIN_ITEMS_PER_ORDER_LIMIT } },
    update: { $set: { maxItemsPerOrder: MIN_ITEMS_PER_ORDER_LIMIT } },
  },
  {
    label: 'highMaxItemsPerOrder',
    target: 'restaurants',
    filter: { maxItemsPerOrder: { $gt: MAX_ITEMS_PER_ORDER_LIMIT } },
    update: { $set: { maxItemsPerOrder: MAX_ITEMS_PER_ORDER_LIMIT } },
  },
  {
    label: 'missingMaxQuantityPerOrder',
    target: 'menuItems',
    filter: {
      $or: [{ maxQuantityPerOrder: { $exists: false } }, { maxQuantityPerOrder: null }],
    },
    update: { $set: { maxQuantityPerOrder: DEFAULT_MENU_ITEM_QUANTITY_LIMIT } },
  },
  {
    label: 'lowMaxQuantityPerOrder',
    target: 'menuItems',
    filter: { maxQuantityPerOrder: { $lt: MIN_MENU_ITEM_QUANTITY_LIMIT } },
    update: { $set: { maxQuantityPerOrder: MIN_MENU_ITEM_QUANTITY_LIMIT } },
  },
  {
    label: 'highMaxQuantityPerOrder',
    target: 'menuItems',
    filter: { maxQuantityPerOrder: { $gt: MAX_MENU_ITEM_QUANTITY_LIMIT } },
    update: { $set: { maxQuantityPerOrder: MAX_MENU_ITEM_QUANTITY_LIMIT } },
  },
];

const getModelForOperation = (operation: OrderCapacityBackfillOperation): BackfillModel =>
  operation.target === 'restaurants'
    ? (Restaurant as unknown as BackfillModel)
    : (MenuItem as unknown as BackfillModel);

const getAffectedCount = (result: { modifiedCount?: number; nModified?: number }) =>
  Number(result.modifiedCount ?? result.nModified ?? 0);

export const backfillOrderCapacityLimits = async ({ dryRun = true } = {}) => {
  const result: OrderCapacityBackfillResult = {
    dryRun,
    restaurants: {},
    menuItems: {},
  };

  for (const operation of createOrderCapacityBackfillOperations()) {
    const model = getModelForOperation(operation);
    const count = dryRun
      ? await model.countDocuments(operation.filter)
      : getAffectedCount(await model.updateMany(operation.filter, operation.update));

    result[operation.target][operation.label] = count;
  }

  return result;
};
