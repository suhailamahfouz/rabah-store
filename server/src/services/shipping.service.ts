import { AppError } from '../utils/AppError.js';
import { getSettings, type SettingsDoc } from '../models/Settings.js';

export interface ShippingQuote {
  fee: number;
  zoneId?: string;
  zoneName?: { ar: string; en: string };
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  isFree: boolean;
}

export function normalizeGovernorate(value: string): string {
  return value.trim().toLocaleLowerCase('ar-EG').replace(/\s+/g, ' ');
}

export function calculateShipping(
  settings: Pick<SettingsDoc, 'deliveryFee' | 'freeShippingThreshold' | 'shipping'>,
  subtotal: number,
  governorate: string,
  area?: string,
): ShippingQuote {
  const shipping = settings.shipping;
  if (shipping?.enabled === false) return { fee: 0, isFree: true };

  const threshold = shipping?.freeShipping
    ? (shipping.freeShipping.enabled ? shipping.freeShipping.threshold : undefined)
    : settings.freeShippingThreshold;
  const zones = shipping?.zones ?? [];
  const requested = normalizeGovernorate(governorate);
  const requestedArea = area ? normalizeGovernorate(area) : undefined;
  const governorateZones = zones.filter((candidate) =>
    candidate.isActive && candidate.governorates.some((name) => normalizeGovernorate(name) === requested),
  );
  const zone = governorateZones.find((candidate) =>
    !!requestedArea && (candidate.areas?.length ?? 0) > 0 && (candidate.areas ?? []).some((name) => normalizeGovernorate(name) === requestedArea),
  ) ?? governorateZones.find((candidate) => (candidate.areas?.length ?? 0) === 0);

  if (zones.length > 0 && !zone) {
    throw AppError.badRequest('Shipping is unavailable for this governorate or area');
  }

  const baseFee = zone ? Number(zone.price) : Number(settings.deliveryFee ?? 0);
  const isFree = threshold != null && subtotal >= Number(threshold);
  return {
    fee: isFree ? 0 : baseFee,
    zoneId: zone ? String(zone._id) : undefined,
    zoneName: zone?.name ?? undefined,
    estimatedDaysMin: zone?.estimatedDaysMin,
    estimatedDaysMax: zone?.estimatedDaysMax,
    isFree,
  };
}

export async function quoteShipping(subtotal: number, governorate: string, area?: string): Promise<ShippingQuote> {
  return calculateShipping(await getSettings(), subtotal, governorate, area);
}
