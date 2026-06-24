export interface Vendor {
  id: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
  entry_level?: 'Menders' | 'Member of the public' | string;
  types?: string[];
  categories?: string[];
  regional_techniques?: string[];
  online_presence?: string;
  review_text?: string;
  rating?: number;
  rating_count?: number;
  phone?: string;
  website?: string;
  hours?: string;
  photo_url?: string;
  photos?: string;
  contact?: string;
}
