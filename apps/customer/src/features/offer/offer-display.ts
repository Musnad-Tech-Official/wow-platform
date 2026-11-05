import { formatDiscoveryPrice } from '../discovery/discovery-data';

/** Validates that a string is a standard UUID. */
export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Validates that coordinates are legitimate finite numeric values within geographic ranges. */
export function hasValidCoordinates(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!isFinite(latitude) || !isFinite(longitude)) return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/** Returns a clean map URL for directions if coordinates are valid. */
export function getDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/** Checks if a cover or logo URL is a safe, publicly loadable HTTP/HTTPS image URL. */
export function isSafePublicImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim().length === 0) return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

export type OfferAvailabilityStatus = 'active' | 'upcoming' | 'expired';

export interface OfferAvailabilityResult {
  status: OfferAvailabilityStatus;
  isAvailable: boolean;
  label: string;
}

/**
 * Determines if an offer is currently available based on its starts_at and ends_at timestamps.
 * - Before starts_at: 'لم يبدأ بعد' (status: 'upcoming', isAvailable: false)
 * - Between starts_at and ends_at: 'متاح' (status: 'active', isAvailable: true)
 * - After ends_at: 'منتهي' (status: 'expired', isAvailable: false)
 *
 * An optional now parameter enables deterministic testing and boundary checks.
 */
export function getOfferAvailability(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now: number | Date = Date.now(),
): OfferAvailabilityResult {
  const currentTime = typeof now === 'number' ? now : now.getTime();

  const startDate = startsAt ? new Date(startsAt) : null;
  const startTime = startDate && !isNaN(startDate.getTime()) ? startDate.getTime() : null;

  const endDate = endsAt ? new Date(endsAt) : null;
  const endTime = endDate && !isNaN(endDate.getTime()) ? endDate.getTime() : null;

  // 1. If starts_at is in the future (currentTime < startTime): Not yet started
  if (startTime !== null && currentTime < startTime) {
    return {
      status: 'upcoming',
      isAvailable: false,
      label: 'لم يبدأ بعد',
    };
  }

  // 2. If ends_at is in the past (currentTime >= endTime): Expired
  if (endTime !== null && currentTime >= endTime) {
    return {
      status: 'expired',
      isAvailable: false,
      label: 'منتهي',
    };
  }

  // 3. Current time is >= starts_at (or no starts_at) and < ends_at (or no ends_at): Active
  return {
    status: 'active',
    isAvailable: true,
    label: 'متاح',
  };
}

/** Formats offer expiration date into readable authentic Arabic prose. */
export function formatOfferExpiry(endsAt: string | null | undefined): string {
  if (!endsAt) {
    return 'تاريخ الانتهاء غير متوفر في المعاينة';
  }
  const date = new Date(endsAt);
  if (isNaN(date.getTime())) {
    return 'تاريخ الانتهاء غير متوفر في المعاينة';
  }
  try {
    const formatted = date.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `سارٍ حتى ${formatted}`;
  } catch {
    return `سارٍ حتى ${endsAt.split('T')[0]}`;
  }
}

/** Formats discount percentage into authentic Arabic badge text. */
export function formatDiscountBadge(discount: number | string | null | undefined): string | null {
  if (discount == null) return null;
  const num = typeof discount === 'number' ? discount : parseFloat(String(discount));
  if (isNaN(num) || num <= 0) return null;
  const rounded = Math.round(num);
  return `خصم %${rounded.toLocaleString('ar-YE')}`;
}

export { formatDiscoveryPrice };
