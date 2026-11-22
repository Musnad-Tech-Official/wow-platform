/**
 * Deterministic, authorization-scoped merchant business selection.
 *
 * An explicit businessId in the URL is authoritative. Never silently redirect
 * an inaccessible deep link to some other accessible business: that could
 * produce edits against the wrong merchant. All candidates come from the
 * server-authorized merchant list, never from URL parameters alone.
 */
export interface MerchantBusinessSelectionInput {
  allowedBusinessIds: readonly string[];
  routeBusinessId?: string | null;
  selectedBusinessId?: string | null;
  selectionBelongsToSession: boolean;
  isSignedIn: boolean;
  isSyntheticPreview: boolean;
}

export function resolveMerchantBusinessId(input: MerchantBusinessSelectionInput): string | null {
  const {
    allowedBusinessIds,
    routeBusinessId,
    selectedBusinessId,
    selectionBelongsToSession,
    isSignedIn,
    isSyntheticPreview,
  } = input;

  if (!isSignedIn && !isSyntheticPreview) return null;

  if (routeBusinessId) {
    return allowedBusinessIds.includes(routeBusinessId) ? routeBusinessId : null;
  }

  if (
    selectionBelongsToSession &&
    selectedBusinessId &&
    allowedBusinessIds.includes(selectedBusinessId)
  ) {
    return selectedBusinessId;
  }

  return allowedBusinessIds[0] ?? null;
}
