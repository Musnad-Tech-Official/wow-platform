/** Pure, platform-independent math for UI constraints. */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
export function clampPage(page: number, totalPages: number): number {
  const max = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.min(max, Math.floor(page)));
}
