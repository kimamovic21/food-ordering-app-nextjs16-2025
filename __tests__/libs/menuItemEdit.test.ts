import {
  buildMenuItemInventoryEdit,
  getMenuItemStockEdit,
  menuItemEditVersionFilter,
} from '@/libs/menuItemEdit';
import { MenuItem } from '@/models/menuItem';
import { createMongoMemoryTestServer } from '@/__tests__/utils/mongoMemoryServer';
import mongoose from 'mongoose';

describe('menu item stock edit intent', () => {
  it('omits unchanged or disabled stock and includes the baseline for an intentional change', () => {
    const baseline = { trackInventory: true, stockQuantity: 10 };
    expect(getMenuItemStockEdit(baseline, true, 10)).toEqual({});
    expect(getMenuItemStockEdit(baseline, false, 20)).toEqual({});
    expect(getMenuItemStockEdit({ trackInventory: true, stockQuantity: null }, true, 0)).toEqual(
      {}
    );
    expect(getMenuItemStockEdit(baseline, true, 20)).toEqual({
      stockQuantity: 20,
      expectedStockQuantity: 10,
    });
    expect(getMenuItemStockEdit({}, true, 10)).toEqual({
      stockQuantity: 10,
      expectedStockQuantity: null,
    });
  });
});

describe('atomic menu item edits (isolated MongoDB)', () => {
  let db: Awaited<ReturnType<typeof createMongoMemoryTestServer>>;
  let item: any;
  beforeAll(async () => {
    db = await createMongoMemoryTestServer();
  }, 60000);
  afterAll(async () => {
    await db?.stop();
  });
  beforeEach(async () => {
    await MenuItem.deleteMany({});
    item = await MenuItem.create({
      name: 'Soup',
      description: 'Original',
      image: 'https://example.com/soup.png',
      adminId: new mongoose.Types.ObjectId(),
      restaurantId: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      trackInventory: true,
      stockQuantity: 10,
    });
  });

  const save = (edit: ReturnType<typeof buildMenuItemInventoryEdit>, fields = {}) => {
    if (edit.error) throw new Error(edit.error);
    return MenuItem.findOneAndUpdate(
      { _id: item._id, ...edit.filter },
      { $set: { ...edit.fields, ...fields }, $inc: { editVersion: 1 } },
      { returnDocument: 'after', runValidators: true }
    );
  };

  it('preserves purchased stock when a stale form changes only its description', async () => {
    const edit = buildMenuItemInventoryEdit(item, { expectedEditVersion: 0, trackInventory: true });
    await MenuItem.updateOne({ _id: item._id }, { $inc: { stockQuantity: -3 } });
    const saved = await save(edit, { description: 'New recipe' });
    expect(saved.stockQuantity).toBe(7);
    expect(saved.description).toBe('New recipe');
    expect(saved.editVersion).toBe(1);
  });

  it('allows only one of two simultaneous edits based on the same version', async () => {
    const edit = buildMenuItemInventoryEdit(item, { expectedEditVersion: 0 });
    const results = await Promise.all([save(edit, { name: 'A' }), save(edit, { name: 'B' })]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await MenuItem.findById(item._id)).editVersion).toBe(1);
  });

  it('rejects restocking against an outdated physical stock baseline', async () => {
    const edit = buildMenuItemInventoryEdit(item, {
      expectedEditVersion: 0,
      stockQuantity: 20,
      expectedStockQuantity: 10,
    });
    await MenuItem.updateOne({ _id: item._id }, { $inc: { stockQuantity: -3 } });
    expect(await save(edit)).toBeNull();
    expect((await MenuItem.findById(item._id)).stockQuantity).toBe(7);
  });

  it('checks reservations at write time, not just when the form or route reads', async () => {
    const lowerStock = buildMenuItemInventoryEdit(item, {
      expectedEditVersion: 0,
      stockQuantity: 2,
      expectedStockQuantity: 10,
    });
    const disable = buildMenuItemInventoryEdit(item, {
      expectedEditVersion: 0,
      trackInventory: false,
    });
    await MenuItem.updateOne({ _id: item._id }, { $inc: { reservedStockQuantity: 3 } });
    expect(await save(lowerStock)).toBeNull();
    expect(await save(disable)).toBeNull();
    const current = await MenuItem.findById(item._id);
    expect(current.stockQuantity).toBe(10);
    expect(current.reservedStockQuantity).toBe(3);
    expect(current.trackInventory).toBe(true);
  });

  it('allows stock equal to reserved units without clearing reservations', async () => {
    await MenuItem.updateOne({ _id: item._id }, { $set: { reservedStockQuantity: 3 } });
    const saved = await save(
      buildMenuItemInventoryEdit(item, {
        expectedEditVersion: 0,
        stockQuantity: 3,
        expectedStockQuantity: 10,
      })
    );
    expect(saved.stockQuantity).toBe(3);
    expect(saved.reservedStockQuantity).toBe(3);
  });

  it('allows disabling tracking after reservations are released', async () => {
    const saved = await save(
      buildMenuItemInventoryEdit(item, { expectedEditVersion: 0, trackInventory: false })
    );
    expect(saved.trackInventory).toBe(false);
    expect(saved.stockQuantity).toBeNull();
  });

  it('supports legacy documents with no version or inventory fields without a migration', async () => {
    await MenuItem.collection.updateOne(
      { _id: item._id },
      {
        $unset: {
          editVersion: '',
          trackInventory: '',
          stockQuantity: '',
          reservedStockQuantity: '',
        },
      }
    );
    const saved = await save(buildMenuItemInventoryEdit({}, { expectedEditVersion: 0 }), {
      name: 'Legacy',
    });
    expect(saved.editVersion).toBe(1);
    expect(saved.trackInventory).toBe(false);
    expect(saved.stockQuantity).toBeNull();
    const enabled = await save(
      buildMenuItemInventoryEdit(
        {},
        {
          expectedEditVersion: 1,
          trackInventory: true,
          stockQuantity: 10,
          expectedStockQuantity: null,
        }
      )
    );
    expect(enabled.stockQuantity).toBe(10);
    expect(enabled.trackInventory).toBe(true);
  });

  it('availability edits also invalidate an older form version', async () => {
    await MenuItem.findOneAndUpdate(
      { _id: item._id, ...menuItemEditVersionFilter(0) },
      { $set: { isAvailable: false }, $inc: { editVersion: 1 } }
    );
    expect(
      await save(buildMenuItemInventoryEdit(item, { expectedEditVersion: 0 }), {
        isAvailable: true,
      })
    ).toBeNull();
    expect((await MenuItem.findById(item._id)).isAvailable).toBe(false);
  });
});
