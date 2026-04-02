export interface RegionalProvince {
  code: string;
  name: string;
}

export interface RegionalRegency {
  code: string;
  name: string;
}

export interface RegionalDistrict {
  code: string;
  name: string;
}

export interface RegionalDistrictPostalData {
  code: number;
  parent: number;
  name: string;
  postal: number[];
  children?: number[];
}
