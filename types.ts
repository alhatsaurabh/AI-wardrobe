export type ClothingCategory = 'Tops' | 'Bottoms' | 'Shoes' | 'Accessories';

export interface ImageState {
  id: string;
  file?: File | null;
  dataUrl: string | null;
  base64?: string | null;
  mimeType: string | null;
  category?: ClothingCategory;
  name?: string;
  tags?: string[];
}

export interface OutfitRecommendation {
    outfitName: string;
    description: string;
    items: ClothingCategory[];
}

export interface WeatherInfo {
    temp: number;
    description: string;
    icon: string;
}