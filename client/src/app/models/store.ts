import { ProductColor } from '../data/product-colors';
export type Lang = 'ar' | 'en';

export interface LocalizedText {
  ar: string;
  en: string;
}

export type CategoryIcon =
  'bag' | 'gem' | 'wallet' | 'lipstick' | 'nail' | 'hair' | 'sparkles' | 'gift';

export interface Category {
  id: string;
  slug: string;
  label: LocalizedText;
  icon: CategoryIcon;
  description: LocalizedText;
  image?: string;
}

export interface Product {
  colorOptions?: ProductColor[];
  id: string;
  sku?: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  shortDescription: LocalizedText;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  stock: number;
  category: string;
  additionalCategories?: string[];
  badge?: LocalizedText;
  /** Derived from color variants for catalog filtering. */
  colors: string[];
  variants: ProductVariant[];
  images: string[];
  features: LocalizedText[];
  /** Selected by the admin when the product is added/edited. */
  isBestSeller: boolean;
}

export interface ProductVariant {
  id: string;
  color: LocalizedText;
  hex?: string;
  stock: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  note?: string;
  color?: string;
  /** Internal inventory identity for a color variant. */
  variantId?: string;
}
