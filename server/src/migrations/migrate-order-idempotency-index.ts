import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Order } from '../models/Order.js';

/**
 * Replaces the legacy global idempotency-key index with the scoped compound
 * index used by the order model. The old index allowed one client to reserve
 * a key for every other customer; the new index preserves retry safety per
 * customer (and for anonymous checkout) without changing any order data.
 */
async function main() {
  await connectDb();
  try {
    try {
      await Order.collection.dropIndex('idempotencyKey_1');
    } catch (error) {
      // MongoDB uses code 27 when an index was already removed/not created.
      if ((error as { code?: number }).code !== 27) throw error;
    }
    await Order.collection.createIndex(
      { customerId: 1, idempotencyKey: 1 },
      { name: 'customerId_1_idempotencyKey_1', unique: true, sparse: true },
    );
    console.log('Order idempotency index migrated.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  // Avoid dumping connection/configuration details into logs.
  console.error('Order idempotency index migration failed:', error instanceof Error ? error.name : 'Error');
  process.exitCode = 1;
});
