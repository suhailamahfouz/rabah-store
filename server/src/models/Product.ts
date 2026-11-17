import { Schema, model, InferSchemaType } from 'mongoose';

const bilingual = (required: boolean, max: number) => ({
  ar: { type: String, required, trim: true, maxlength: max, default: '' },
  en: { type: String, required, trim: true, maxlength: max, default: '' },
});

/**
 * Variants are OPTIONAL. If `variants` is empty the product uses `stock`.
 * If variants exist, each variant represents exactly ONE color and carries
 * its own stock. Sizes no longer exist in the new product model.
 */
const variantSchema = new Schema(
  {
    // Every variant is one color and must carry a color name.
    color: { name: bilingual(true, 60), hex: { type: String, match: /^#[0-9a-fA-F]{6}$/ } },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: bilingual(true, 200),
    description: bilingual(false, 4000),
    shortDescription: bilingual(false, 200),
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, default: 0, min: 0 },
    features: [bilingual(false, 200)],
    badge: bilingual(false, 40),
    salePrice: {
      type: Number,
      min: 0,
      validate: {
        validator(this: { price?: number }, v?: number) { return v == null || this.price == null || v < this.price; },
        message: 'salePrice must be lower than price',
      },
    },
    images: [{
      url: { type: String, required: true },
      // Cloudinary's immutable asset id lets us remove only an image that is
      // no longer referenced after a successful MongoDB update.
      publicId: { type: String, default: '' },
      alt: { type: String, default: '' },
      _id: false,
    }],
    variants: [variantSchema],
    // Display/order selections only: stock remains the product's general stock.
    colorOptions: [{ name: bilingual(true, 60), hex: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ }, _id: false }],
    stock: { type: Number, min: 0, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

productSchema.virtual('availableQty').get(function () {
  return this.variants.length ? this.variants.reduce((s, v) => s + v.stock, 0) : this.stock ?? 0;
});
productSchema.pre('validate', function () {
  if (this.variants.length) this.stock = this.variants.reduce((sum, variant) => sum + variant.stock, 0);
});
productSchema.virtual('effectivePrice').get(function () {
  return this.salePrice != null && this.salePrice < this.price ? this.salePrice : this.price;
});

// Matches the public catalog's filter and deterministic card ordering.
productSchema.index({ isActive: 1, isBestSeller: -1, createdAt: -1 });
// Category pages use the same order after constraining the category.
productSchema.index({ isActive: 1, category: 1, isBestSeller: -1, createdAt: -1 });
productSchema.index({ 'name.ar': 'text', 'name.en': 'text', sku: 'text' });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product = model('Product', productSchema);
