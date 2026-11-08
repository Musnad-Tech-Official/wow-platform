export { CustomerSubmitComplaintScreen } from './CustomerSubmitComplaintScreen';
export type { CustomerSubmitComplaintScreenProps } from './CustomerSubmitComplaintScreen';
export { ComplaintOfferSummaryCard } from './ComplaintOfferSummaryCard';
export { ComplaintEvidenceNotice } from './ComplaintEvidenceNotice';
export { ComplaintReviewModal } from './ComplaintReviewModal';

// CUS-08 My Complaints exports
export { CustomerMyComplaintsScreen } from './CustomerMyComplaintsScreen';
export type { CustomerMyComplaintsScreenProps } from './CustomerMyComplaintsScreen';
export { ComplaintCard } from './ComplaintCard';
export type { ComplaintCardProps } from './ComplaintCard';
export { ComplaintStatusBadge } from './ComplaintStatusBadge';
export type { ComplaintStatusBadgeProps } from './ComplaintStatusBadge';
export { ComplaintFilterTabs } from './ComplaintFilterTabs';
export type { ComplaintFilterTabsProps } from './ComplaintFilterTabs';
export { ComplaintDetailsBoundaryModal } from './ComplaintDetailsBoundaryModal';
export type { ComplaintDetailsBoundaryModalProps } from './ComplaintDetailsBoundaryModal';

export {
  COMPLAINT_TYPE_OPTIONS,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  validateComplaintForm,
  validateIncidentDate,
  formatLocalDate,
  getLocalTodayDate,
  getLocalYesterdayDate,
  mapComplaintSubmissionError,
  executeComplaintSubmission,
  getComplaintTypeLabel,
  IS_EVIDENCE_ATTACHMENT_SUPPORTED,
  IS_CUS08_ROUTE_AVAILABLE,
  IS_CUS09_ROUTE_AVAILABLE,
  FIXTURE_OFFER,
} from './complaint-display';

export {
  COMPLAINT_FILTERS,
  COMPLAINT_STATUS_MAP,
  resolveComplaintStatusInfo,
  COMPLAINT_TYPE_DISPLAY_MAP,
  getComplaintTypeShortLabel,
  getComplaintTypeMeta,
  formatComplaintDate,
  formatComplaintReference,
  filterComplaints,
  sortComplaintsNewestFirst,
  deduplicateComplaints,
  IS_CUS09_DETAILS_AVAILABLE,
  FIXTURE_COMPLAINTS,
} from './complaints-list-display';
export type {
  ComplaintFilter,
  ComplaintFilterOption,
  ComplaintStatusDisplayInfo,
  ComplaintTypeDisplayMeta,
} from './complaints-list-display';

export type {
  ComplaintFormValues,
  ComplaintFormErrors,
  ComplaintTypeOption,
  ExecuteSubmitComplaintOptions,
  SubmissionResult,
} from './complaint-display';

