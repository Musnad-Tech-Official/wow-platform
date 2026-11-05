import { useLocalSearchParams } from 'expo-router';
import { CustomerBusinessDetailsScreen } from '../../features/business/CustomerBusinessDetailsScreen';

export default function BusinessDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessId = Array.isArray(id) ? id[0] : id ?? '';

  return <CustomerBusinessDetailsScreen businessId={businessId} />;
}
