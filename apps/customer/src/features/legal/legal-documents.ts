/** Legal documents are public, release-controlled HTTPS URLs, not inferred routes. */
export function validateLegalDocumentUrl(value?: string | null): string | null {
  if (!value || value.trim() !== value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password ||
        url.hostname === 'localhost' || /^\d+(\.\d+){3}$/.test(url.hostname) ||
        url.hostname.endsWith('.local') || url.hash || url.search) return null;
    return url.href;
  } catch { return null; }
}
export const legalDocuments = {
  terms: validateLegalDocumentUrl(process.env.EXPO_PUBLIC_WOW_TERMS_URL),
  privacy: validateLegalDocumentUrl(process.env.EXPO_PUBLIC_WOW_PRIVACY_URL),
};
