import { formatDiscoveryPrice } from '../discovery/discovery-data';

/** Validates that a string is a standard UUID. */
export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Formats active offer count with authentic Arabic inflection. */
export function formatOfferCount(total: number): string {
  if (total <= 0) return 'لا توجد عروض';
  const numAr = total.toLocaleString('ar-YE');
  if (total === 1) return 'عرض واحد';
  if (total === 2) return 'عرضان';
  if (total >= 3 && total <= 10) return `${numAr} عروض`;
  return `${numAr} عرض`;
}

/** Formats branch count with authentic Arabic inflection. */
export function formatBranchCount(total: number): string {
  if (total <= 0) return 'لا توجد فروع مسجلة';
  const numAr = total.toLocaleString('ar-YE');
  if (total === 1) return 'فرع واحد';
  if (total === 2) return 'فرعان';
  if (total >= 3 && total <= 10) return `${numAr} فروع`;
  return `${numAr} فرع`;
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

export { formatDiscoveryPrice };
