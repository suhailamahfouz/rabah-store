import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDb } from "../config/db.js";
import { Category, Product, Settings, Subscriber } from "../models/index.js";
import { CATEGORIES, PRODUCTS } from "./data.js";

async function main() {
  await connectDb();

  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Settings.deleteMany({}),
    Subscriber.deleteMany({}),
  ]);

  const categories = await Category.insertMany(
    CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      image: c.image,
      sortOrder: c.sortOrder,
      isActive: true,
    })),
  );

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c._id]));

  await Product.insertMany(
    PRODUCTS.map((p) => ({
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      description: p.description,
      shortDescription: p.shortDescription,
      category: categoryBySlug.get(p.categorySlug)!,
      price: p.price,
      salePrice: p.salePrice,
      rating: p.rating,
      reviewCount: p.reviewCount,
      variants: p.variants,
      images: p.images,
      features: p.features,
      stock: p.stock,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isActive: true,
      isDemo: true,
    })),
  );

  await Settings.create({
    key: "main",
    storeName: "RABAH",
    currency: "EGP",
    deliveryFee: 25,
    freeShippingThreshold: 85,
    languages: { default: "ar" },
    contact: {
      phone: "",
      whatsapp: "",
      email: "",
      address: { ar: "مصر", en: "Egypt" },
    },
  });

  await Subscriber.insertMany([
    { email: "demo@rabah.sa", lang: "ar" },
    { email: "demo@rabah.sa", lang: "en" },
  ]);

  console.log(
    "Seed complete: %d categories, %d products, settings, subscribers",
    categories.length,
    PRODUCTS.length,
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("Seed failed", e);
  process.exit(1);
});
