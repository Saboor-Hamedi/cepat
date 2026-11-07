import type { DataSource, Technician } from '../../../types/marketplace';

export interface TechnicianRecommendationCardProps {
  technician: Technician;
  source?: DataSource;
  onPress?: () => void;
  onChat?: () => void;
  testID?: string;
}

export interface RecommendedTechniciansProps {
  technicians: Technician[];
  source?: DataSource;
  selectedCategory?: string;
  selectedArea?: string;
  onSeeAll?: () => void;
  onSelectTechnician?: (technician: Technician) => void;
  onChatWithTechnician?: (technician: Technician) => void;
  testID?: string;
}

export interface TechnicianFiltersState {
  category: string;
  area: string;
  query: string;
  minRating: number;
  availableOnly: boolean;
  sortBy: 'recommended' | 'rating' | 'reviews' | 'experience';
}

export interface AllTechniciansScreenProps {
  initialCategory?: string;
  initialArea?: string;
  onBack?: () => void;
}
