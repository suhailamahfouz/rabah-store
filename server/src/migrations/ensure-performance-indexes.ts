import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';

/**
 * Creates the additive indexes used by storefront pagination and order history.
 * Existing indexes are deliberately left intact, making this safe to run on a
 * live database before a later index-cleanup window.
 */
async function main() {
  await connectDb();
  try {
    await Promise.all([
      Product.collection.createIndex(
        { isActive: 1, isBestSeller: -1, createdAt: -1 },
        { name: 'isActive_1_isBestSeller_-1_createdAt_-1' },
      ),
      Product.collection.createIndex(
        { isActive: 1, category: 1, isBestSeller: -1, createdAt: -1 },
        { name: 'isActive_1_category_1_isBestSeller_-1_createdAt_-1' },
      ),
      Order.collection.createIndex(
        { customerId: 1, createdAt: -1, _id: -1 },
        { name: 'customerId_1_createdAt_-1__id_-1' },
      ),
      Order.collection.createIndex(
        { orderStatus: 1, createdAt: -1 },
        { name: 'orderStatus_1_createdAt_-1' },
      ),
      Order.collection.createIndex(
        { paymentMethod: 1, createdAt: -1 },
        { name: 'paymentMethod_1_createdAt_-1' },
      ),
    ]);
    console.log('Performance indexes ensured.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Performance index migration failed:', error instanceof Error ? error.name : 'Error');
  process.exitCode = 1;
});
