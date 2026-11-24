import { LegalDocumentLinks as SharedLegalDocumentLinks } from '@wow/ui';
import { legalDocuments } from './legal-documents';
export function LegalDocumentLinks() {
 return <SharedLegalDocumentLinks termsUrl={legalDocuments.terms} privacyUrl={legalDocuments.privacy} />;
}
