import { useLocalSearchParams } from 'expo-router';
import { AllTechniciansScreen } from '../../components/technicians/recommendation/AllTechniciansScreen';

export default function TechnicianDirectoryRoute() {
  const params = useLocalSearchParams<{ category?: string; area?: string }>();

  return (
    <AllTechniciansScreen
      initialCategory={params.category || 'all'}
      initialArea={params.area || 'Semua area'}
    />
  );
}
