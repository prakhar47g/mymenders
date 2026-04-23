export interface Vendor {
  id: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  rating_count: number;
  phone?: string;
  website?: string;
  hours?: string;
  photo_url?: string;
  photos?: string;
}

export type Mender = Omit<Vendor, 'id' | 'address' | 'category' | 'rating' | 'rating_count' | 'phone' | 'website' | 'hours' | 'photo_url' | 'photos'> & {
  id: string;
  lat: number;
  lng: number;
  note: string;
  contact?: string;
};
