import { useLocalSearchParams } from 'expo-router';
import { CustomerComplaintDetailsScreen } from '../../features/complaint';

export default function ComplaintDetailsRoute() {
  const { id, preview } = useLocalSearchParams<{
    id?: string;
    preview?: string;
  }>();

  return <CustomerComplaintDetailsScreen complaintId={id} previewMode={preview as any} />;
}
