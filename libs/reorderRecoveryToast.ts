import type { ReorderRecoverySummary } from '@/types/order';

export const getReorderRecoveryToastCopy = (
  summary: ReorderRecoverySummary | null | undefined,
  fallbackTitle = 'Order added to cart'
) => {
  if (!summary?.hasChanges) {
    return {
      description: undefined,
      title: fallbackTitle,
      tone: 'success' as const,
    };
  }

  const updates: string[] = [];

  if (summary.skippedItemCount > 0) {
    updates.push(
      `${summary.skippedItemCount} unavailable ${summary.skippedItemCount === 1 ? 'item was' : 'items were'} skipped`
    );
  }

  if (summary.adjustedItemCount > 0) {
    updates.push(
      `${summary.adjustedItemCount} ${summary.adjustedItemCount === 1 ? 'quantity was' : 'quantities were'} adjusted`
    );
  }

  if (summary.priceChangedItemCount > 0) {
    updates.push(
      `${summary.priceChangedItemCount} ${summary.priceChangedItemCount === 1 ? 'price was' : 'prices were'} refreshed`
    );
  }

  return {
    description: updates.join('. '),
    title: `${summary.addedQuantity} ${summary.addedQuantity === 1 ? 'item' : 'items'} added with current menu updates`,
    tone: 'info' as const,
  };
};
