import { validateLegalDocumentUrl } from '@wow/ui';
export { validateLegalDocumentUrl } from '@wow/ui';
export const legalDocuments = {
  terms: validateLegalDocumentUrl(process.env.EXPO_PUBLIC_WOW_TERMS_URL),
  privacy: validateLegalDocumentUrl(process.env.EXPO_PUBLIC_WOW_PRIVACY_URL),
};
