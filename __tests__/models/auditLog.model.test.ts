import { describe, expect, it } from 'vitest';

import { AuditLog } from '@/models/auditLog';

const hasIndex = (expectedIndex: Record<string, 1 | -1>) =>
  AuditLog.schema.indexes().some(([index]) =>
    Object.entries(expectedIndex).every(([key, value]) => index[key] === value)
  );

describe('AuditLog model indexes', () => {
  it('keeps compound indexes for high-traffic audit log filters', () => {
    expect(hasIndex({ action: 1, createdAt: -1 })).toBe(true);
    expect(hasIndex({ action: 1, 'metadata.reason': 1, createdAt: -1 })).toBe(true);
    expect(hasIndex({ restaurantId: 1, action: 1, createdAt: -1 })).toBe(true);
    expect(hasIndex({ entityType: 1, entityId: 1, createdAt: -1 })).toBe(true);
  });
});
