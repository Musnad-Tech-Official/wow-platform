import { useLocalSearchParams } from 'expo-router';
import { CustomerComplaintDetailsScreen } from '../../features/complaint';
import type { ComplaintDetailsPreviewMode } from '../../features/complaint/CustomerComplaintDetailsScreen';

export default function ComplaintDetailsRoute() {
  const { id, preview } = useLocalSearchParams<{
    id?: string;
    preview?: string;
  }>();

  return <CustomerComplaintDetailsScreen complaintId={id} previewMode={__DEV__ && typeof preview === 'string' ? preview as ComplaintDetailsPreviewMode : 'live'} />;
}
