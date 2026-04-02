export interface GeocodingProximity {
  latitude: number;
  longitude: number;
}

export interface AddressSuggestion {
  id: string;
  placeId: string;
  name: string;
  fullAddress: string;
  primaryText: string;
  secondaryText: string;
}

export interface SelectedAddressSuggestion {
  id: string;
  placeId: string;
  fullAddress: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  accuracy: string | null;
}

export interface GooglePlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface GooglePlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  addressComponents: Array<{
    longName: string;
    shortName: string;
    types: string[];
  }>;
}

export interface GooglePlacePredictionNew {
  suggestions?: Array<{
    placePrediction?: {
      place?: string;
      placeId?: string;
      text?: {
        text?: string;
        matches?: Array<{
          startOffset: number;
          endOffset: number;
        }>;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
          matches?: Array<{
            startOffset: number;
            endOffset: number;
          }>;
        };
        secondaryText?: {
          text?: string;
        };
      };
      types?: string[];
    };
  }>;
}

export interface GooglePlaceDetailsNew {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  types?: string[];
}
