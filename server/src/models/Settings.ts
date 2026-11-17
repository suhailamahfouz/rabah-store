import { Schema, model, InferSchemaType } from 'mongoose';

const bi = { ar: { type: String, default: '', trim: true }, en: { type: String, default: '', trim: true } };
const shippingZoneSchema = new Schema(
  {
    name: { ...bi },
    governorates: { type: [String], default: [] },
    // Empty means the zone covers the whole governorate. A populated list
    // narrows it to cities/districts within its governorate.
    areas: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    estimatedDaysMin: { type: Number, required: true, min: 1, default: 2 },
    estimatedDaysMax: { type: Number, required: true, min: 1, default: 5 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

/**
 * Singleton document (key = 'main'); the owner can customize these defaults
 * from the admin dashboard.
 */
const settingsSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    storeName: { type: String, default: 'RABAH' },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    currency: { type: String, default: 'EGP' },
    deliveryFee: { type: Number, default: 25, min: 0 },
    freeShippingThreshold: { type: Number, default: 85, min: 0 },
    shipping: {
      enabled: { type: Boolean, default: true },
      freeShipping: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 85, min: 0 },
      },
      zones: { type: [shippingZoneSchema], default: [] },
    },
    announcement: { ...bi, isActive: { type: Boolean, default: false } },
    hero: {
      videoUrl: { type: String, default: '' },
      mobileVideoUrl: { type: String, default: '' },
      posterUrl: { type: String, default: '' },
      posterPublicId: { type: String, default: '' },
      title: bi,
      subtitle: bi,
      ctaLabel: bi,
      ctaLink: { type: String, default: '/shop' },
    },
    promoBanner: { title: bi, text: bi, ctaLabel: bi, ctaLink: { type: String, default: '/shop' }, image: { type: String, default: '' }, imagePublicId: { type: String, default: '' }, isActive: { type: Boolean, default: false } },
    featuredCollection: { title: bi, text: bi, image: { type: String, default: '' }, imagePublicId: { type: String, default: '' }, link: { type: String, default: '/shop' } },
    contact: { phone: { type: String, default: '' }, whatsapp: { type: String, default: '' }, email: { type: String, default: '' }, address: bi },
    social: { instagram: { type: String, default: '' }, facebook: { type: String, default: '' }, tiktok: { type: String, default: '' } },
    instapay: { enabled: { type: Boolean, default: false }, identifier: { type: String, default: '' }, accountName: { type: String, default: '' }, instructions: bi },
    languages: { default: { type: String, enum: ['ar', 'en'], default: 'ar' } },
    pages: { privacy: bi, terms: bi, shippingReturns: bi },
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;
export const Settings = model('Settings', settingsSchema);
export async function getSettings() {
  return (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }));
}
