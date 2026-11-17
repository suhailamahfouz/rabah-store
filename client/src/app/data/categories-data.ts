import { Category } from '../models/store';

export const categories: Category[] = [
  {
    id: 'bags',
    slug: 'bags',
    label: { ar: 'حقائب', en: 'Bags' },
    icon: 'bag',
    description: { ar: 'قطع أنيقة وأعمال يدوية', en: 'Elegant pieces and handcrafted essentials' },
  },
  {
    id: 'accessories',
    slug: 'accessories',
    label: { ar: 'إكسسوارات', en: 'Accessories' },
    icon: 'gem',
    description: { ar: 'تفاصيل تكمّل إطلالتك', en: 'Finishing touches for every look' },
  },
  {
    id: 'wallets',
    slug: 'wallets',
    label: { ar: 'محافظ', en: 'Wallets' },
    icon: 'wallet',
    description: { ar: 'أناقة عملية لكل يوم', en: 'Everyday essentials, elevated' },
  },
  {
    id: 'makeup',
    slug: 'makeup',
    label: { ar: 'مكياج', en: 'Makeup' },
    icon: 'lipstick',
    description: { ar: 'أساسيات جمال مختارة', en: 'Beauty essentials, thoughtfully chosen' },
  },
  {
    id: 'nails',
    slug: 'nails',
    label: { ar: 'العناية بالأظافر', en: 'Nails' },
    icon: 'nail',
    description: { ar: 'تفاصيل صغيرة، أناقة كبيرة', en: 'Little details, polished beautifully' },
  },
  {
    id: 'hair-accessories',
    slug: 'hair-accessories',
    label: { ar: 'إكسسوارات الشعر والتوكس', en: 'Hair Accessories & Toks' },
    icon: 'hair',
    description: { ar: 'لمسات مرحة لشعرك', en: 'Playful finishing touches for your hair' },
  },
  {
    id: 'girly-essentials',
    slug: 'girly-essentials',
    label: { ar: 'أساسيات بناتية', en: 'Girly Essentials' },
    icon: 'sparkles',
    description: { ar: 'اختياراتك اليومية المفضلة', en: 'Your everyday little luxuries' },
  },
  {
    id: 'gifts',
    slug: 'gifts',
    label: { ar: 'هدايا وأكثر', en: 'Gifts & More' },
    icon: 'gift',
    description: { ar: 'اختيارات مميزة جاهزة للإهداء', en: 'Thoughtful finds ready to gift' },
  },
];
