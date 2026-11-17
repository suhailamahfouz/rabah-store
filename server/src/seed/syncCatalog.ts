import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Category, Product } from "../models/index.js";
import { CATEGORIES, PRODUCTS } from "./data.js";

async function syncCatalog(): Promise<void> {
  await connectDb();

  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const category of CATEGORIES) {
    const saved = await Category.findOneAndUpdate(
      { slug: category.slug },
      {
        $set: {
          name: category.name,
          description: category.description,
          image: category.image,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categoryIds.set(category.slug, saved._id);
  }

  for (const product of PRODUCTS) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category for product ${product.slug}`);
    }

    await Product.findOneAndUpdate(
      { sku: product.sku },
      {
        $set: {
          slug: product.slug,
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
          category: categoryId,
          price: product.price,
          salePrice: product.salePrice,
          rating: product.rating,
          reviewCount: product.reviewCount,
          variants: product.variants,
          images: product.images,
          features: product.features,
          isFeatured: product.isFeatured,
          isBestSeller: product.isBestSeller,
          isActive: true,
        },
        $setOnInsert: { stock: product.stock, isDemo: true },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
  }

  console.log(
    "Catalog sync complete: %d categories, %d products",
    CATEGORIES.length,
    PRODUCTS.length,
  );
  await mongoose.disconnect();
}

syncCatalog().catch(async (error: unknown) => {
  console.error("Catalog sync failed", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
