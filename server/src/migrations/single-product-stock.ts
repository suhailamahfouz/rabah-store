import { Product } from '../models/Product.js';

/** Idempotent conversion before accepting orders. Archive the old inventory
 * on each product so no color information is lost, and preserve its total. */
export async function migrateToSingleStock(): Promise<number> {
  const result = await Product.collection.updateMany(
    { 'variants.0': { $exists: true } },
    [{ $set: {
      colorInventoryArchive: { variants: '$variants', stock: '$stock', migratedAt: '$$NOW' },
      stock: { $sum: '$variants.stock' },
      variants: [],
    } }],
  );
  return result.modifiedCount;
}
