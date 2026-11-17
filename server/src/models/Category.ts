import { Schema, model, InferSchemaType } from 'mongoose';

const bilingual = { ar: { type: String, required: true, trim: true, maxlength: 200 }, en: { type: String, required: true, trim: true, maxlength: 200 } };

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    name: bilingual,
    description: { ar: { type: String, trim: true, maxlength: 400, default: '' }, en: { type: String, trim: true, maxlength: 400, default: '' } },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
categorySchema.index({ isActive: 1, sortOrder: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category = model('Category', categorySchema);
