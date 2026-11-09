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

// CUS-09 Complaint Details exports
export { CustomerComplaintDetailsScreen } from './CustomerComplaintDetailsScreen';
export type {
  CustomerComplaintDetailsScreenProps,
  ComplaintDetailsPreviewMode,
} from './CustomerComplaintDetailsScreen';
export { ComplaintSummaryCard } from './ComplaintSummaryCard';
export type { ComplaintSummaryCardProps } from './ComplaintSummaryCard';
export { ComplaintDescriptionCard } from './ComplaintDescriptionCard';
export type { ComplaintDescriptionCardProps } from './ComplaintDescriptionCard';
export { ComplaintTimeline } from './ComplaintTimeline';
export type { ComplaintTimelineProps } from './ComplaintTimeline';
export { ComplaintOutcomeCard } from './ComplaintOutcomeCard';
export type { ComplaintOutcomeCardProps } from './ComplaintOutcomeCard';
export { ComplaintPrivacyNotice } from './ComplaintPrivacyNotice';

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
  FIXTURE_COMPLAINT_NEW,
  FIXTURE_COMPLAINT_INVESTIGATING,
  FIXTURE_COMPLAINT_WAITING,
  FIXTURE_COMPLAINT_CLOSED_WITH_OUTCOME,
  FIXTURE_COMPLAINT_CLOSED_NO_OUTCOME,
  FIXTURE_COMPLAINT_WITH_UPDATES,
  FIXTURE_COMPLAINT_NO_UPDATES,
  FIXTURE_COMPLAINT_LONG_DESCRIPTION,
  resolveComplaintFixture,
  resolveUpdateKindMeta,
  formatComplaintDateTime,
} from './complaints-list-display';
export type {
  ComplaintFilter,
  ComplaintFilterOption,
  ComplaintStatusDisplayInfo,
  ComplaintTypeDisplayMeta,
  UpdateKindMeta,
} from './complaints-list-display';

export type {
  ComplaintFormValues,
  ComplaintFormErrors,
  ComplaintTypeOption,
  ExecuteSubmitComplaintOptions,
  SubmissionResult,
} from './complaint-display';

