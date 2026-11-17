import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { migrateToSingleStock } from './migrations/single-product-stock.js';

async function main() {
  await connectDb();
  const migrated = await migrateToSingleStock();
  if (migrated) console.log(`Converted ${migrated} products to general inventory; old color data archived`);
  const server = createApp().listen(env.PORT, () => console.log(`RABAH API listening on :${env.PORT} (${env.NODE_ENV})`));
  const shutdown = async () => { server.close(); await mongoose.disconnect(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
main().catch((e) => {
  // Connection/configuration errors may include a URI or other secrets.
  console.error('Fatal startup error', { name: e instanceof Error ? e.name : 'Error' });
  process.exit(1);
});
