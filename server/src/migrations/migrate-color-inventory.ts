import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';

type LegacyVariant = {
  _id?: unknown;
  color?: unknown;
  stock?: unknown;
  size?: unknown;
  [key: string]: unknown;
};

type ProductSnapshot = {
  _id: unknown;
  sku?: string;
  slug?: string;
  stock?: unknown;
  variants?: LegacyVariant[];
};

type MigrationRow = {
  id: string;
  sku: string;
  slug: string;
  status: 'no-change' | 'would-update' | 'updated' | 'conflict' | 'skipped';
  oldVariantCount: number;
  newVariantCount: number;
  oldStockTotal: number;
  newStockTotal: number;
  storedStockBefore: number;
  mergedColors: Array<{ color: string; sourceVariantCount: number; stock: number }>;
  warnings: string[];
};

type MigrationReport = {
  migration: 'color-only-inventory-v1';
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  nodeEnv: string;
  summary: {
    scanned: number;
    affected: number;
    unchanged: number;
    invalid: number;
    updated: number;
    conflicts: number;
    stockBefore: number;
    stockAfter: number;
  };
  products: MigrationRow[];
};

const migrationName = 'color-only-inventory-v1';
const apply = process.argv.includes('--apply');
const allowProduction = process.argv.includes('--allow-production');
const reportArg = process.argv.find((value) => value.startsWith('--report='));
const reportPath = path.resolve(
  process.cwd(),
  reportArg?.slice('--report='.length) ?? `migration-reports/${migrationName}-${new Date().toISOString().replaceAll(':', '-')}.json`,
);

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function keyPart(value: unknown): string {
  return text(value).toLocaleLowerCase('ar-EG');
}

function colorInfo(raw: LegacyVariant['color']): { key: string; label: string; color: Record<string, unknown> } | null {
  if (typeof raw === 'string' && raw.trim()) {
    const label = raw.trim();
    return { key: keyPart(label), label, color: { name: { ar: label, en: label } } };
  }
  if (!raw || typeof raw !== 'object') return null;

  const input = raw as Record<string, unknown>;
  const name = input.name && typeof input.name === 'object'
    ? input.name as Record<string, unknown>
    : input;
  const ar = text(name.ar);
  const en = text(name.en);
  const hex = text(input.hex);
  const key = ar || en ? `${keyPart(ar)}|${keyPart(en)}` : keyPart(hex);
  if (!key.replaceAll('|', '')) return null;

  const color: Record<string, unknown> = { name: { ar: ar || en, en: en || ar } };
  if (/^#[0-9a-f]{6}$/i.test(hex)) color.hex = hex;
  return { key, label: ar || en || hex, color };
}

function planProduct(product: ProductSnapshot): MigrationRow {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const warnings: string[] = [];
  const groups = new Map<string, { color: Record<string, unknown>; label: string; stock: number; count: number }>();
  let oldStockTotal = 0;

  for (const variant of variants) {
    const stock = Number(variant.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      warnings.push(`Invalid variant stock: ${String(variant.stock)}`);
      continue;
    }
    const info = colorInfo(variant.color);
    if (!info) {
      warnings.push('Variant has no usable color and was not migrated');
      continue;
    }
    oldStockTotal += stock;
    const group = groups.get(info.key);
    if (group) {
      group.stock += stock;
      group.count += 1;
    } else {
      groups.set(info.key, { color: info.color, label: info.label, stock, count: 1 });
    }
  }

  const newVariants = [...groups.values()];
  const mergedColors = newVariants
    .filter((group) => group.count > 1)
    .map((group) => ({ color: group.label, sourceVariantCount: group.count, stock: group.stock }));
  const storedStockBefore = Number(product.stock ?? 0);
  if (storedStockBefore !== oldStockTotal && variants.length) {
    warnings.push(`Stored product stock ${storedStockBefore} differs from variant total ${oldStockTotal}`);
  }
  if (warnings.length) {
    return {
      id: String(product._id), sku: text(product.sku), slug: text(product.slug), status: 'skipped',
      oldVariantCount: variants.length, newVariantCount: newVariants.length, oldStockTotal,
      newStockTotal: newVariants.reduce((sum, group) => sum + group.stock, 0), storedStockBefore,
      mergedColors, warnings,
    };
  }

  const changed = variants.some((variant) => 'size' in variant) || mergedColors.length > 0 || storedStockBefore !== oldStockTotal;
  return {
    id: String(product._id), sku: text(product.sku), slug: text(product.slug),
    status: changed ? 'would-update' : 'no-change', oldVariantCount: variants.length,
    newVariantCount: newVariants.length, oldStockTotal,
    newStockTotal: newVariants.reduce((sum, group) => sum + group.stock, 0), storedStockBefore,
    mergedColors, warnings,
  };
}

function migratedVariants(product: ProductSnapshot): Array<Record<string, unknown>> {
  const groups = new Map<string, { id: unknown; color: Record<string, unknown>; stock: number }>();
  for (const variant of product.variants ?? []) {
    const info = colorInfo(variant.color);
    if (!info) throw new Error(`Product ${String(product._id)} has an unusable color`);
    const stock = Number(variant.stock);
    const group = groups.get(info.key);
    if (group) group.stock += stock;
    else groups.set(info.key, { id: variant._id ?? new mongoose.Types.ObjectId(), color: info.color, stock });
  }
  return [...groups.values()].map((group) => ({
    _id: group.id,
    color: group.color,
    stock: group.stock,
  }));
}

async function writeReport(report: MigrationReport): Promise<void> {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  if (env.isProd && apply && !allowProduction) {
    throw new Error('Migration blocked in production. Use a controlled one-off run with --apply --allow-production.');
  }

  await connectDb();
  const collection = mongoose.connection.collection('products');
  const products = await collection.find({ variants: { $exists: true, $type: 'array', $ne: [] } }).project({
    sku: 1, slug: 1, stock: 1, variants: 1,
  }).toArray() as ProductSnapshot[];
  const rows = products.map(planProduct);
  const report: MigrationReport = {
    migration: migrationName,
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    nodeEnv: env.NODE_ENV,
    summary: {
      scanned: rows.length,
      affected: rows.filter((row) => row.status === 'would-update').length,
      unchanged: rows.filter((row) => row.status === 'no-change').length,
      invalid: rows.filter((row) => row.status === 'skipped').length,
      updated: 0,
      conflicts: 0,
      stockBefore: rows.reduce((sum, row) => sum + row.oldStockTotal, 0),
      stockAfter: rows.reduce((sum, row) => sum + row.newStockTotal, 0),
    },
    products: rows,
  };

  // This preflight report is written before any product is changed.
  await writeReport(report);
  console.log(`Preflight report written to ${reportPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
  if (!apply) return;

  for (const row of rows.filter((candidate) => candidate.status === 'would-update')) {
    const product = await collection.findOne({ _id: new mongoose.Types.ObjectId(row.id) }) as ProductSnapshot | null;
    if (!product) {
      row.status = 'conflict';
      report.summary.conflicts += 1;
      continue;
    }
    const nextVariants = migratedVariants(product);
    const nextStock = nextVariants.reduce((sum, variant) => sum + Number(variant.stock), 0);
    const result = await collection.updateOne(
      { _id: product._id as mongoose.Types.ObjectId, variants: product.variants },
      { $set: { variants: nextVariants, stock: nextStock } },
    );
    if (result.modifiedCount !== 1) {
      row.status = 'conflict';
      report.summary.conflicts += 1;
      continue;
    }
    row.status = 'updated';
    report.summary.updated += 1;
  }

  await writeReport(report);
  console.log(`Migration complete. Final report written to ${reportPath}`);
}

main()
  .catch((error: unknown) => {
    console.error('Color inventory migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
