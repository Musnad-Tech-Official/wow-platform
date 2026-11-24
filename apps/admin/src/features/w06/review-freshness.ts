/** Called only from explicit reviewer events. Inject the clock for boundary tests. */
export function isReviewSignatureFresh(updatedAt: number, now = Date.now()): boolean {
 return updatedAt > 0 && now >= updatedAt && now - updatedAt < 45_000;
}
