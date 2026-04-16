import { sanitizeAddressCandidate } from '@/services/googlePlaces.service';
import type { SelectedAddressSuggestion } from '@/types/geocoding';
import type { RouteParams } from '@/types/routes.types';
import {
  buildAreaDisplayName,
  formatLevel2Display,
  resolveAreaNames,
} from '@/utils/areaFormatters';
import type { PendingAreaSelection } from '@/utils/areaPickerSession';
import type { MapPickerResult } from '@/components/MapPin';

type AddressMapRouteOverrides = {
  latitude?: number | null;
  longitude?: number | null;
  streetAddress?: string;
  areaName?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

type AddressMapRouteSource = {
  latitude: number | null;
  longitude: number | null;
  streetAddress: string;
  areaName: string;
  areaId: string;
  city: string;
  province: string;
  postalCode: string;
};

type AreaActions = {
  clearTransientErrors: () => void;
  setArea: (area: {
    id: string;
    name: string;
    city: string;
    province: string;
    postalCode: string;
  }) => void;
  setAreaProximity: (
    proximity: { latitude: number; longitude: number; bbox?: number[] } | null,
  ) => void;
  setCoordinateFieldValue: (field: 'latitude' | 'longitude', value: number | null) => void;
  resetMapConfirmation: () => void;
};

type AddressActions = {
  clearTransientErrors: () => void;
  setTextFieldValue: (
    field: 'streetAddress' | 'city' | 'province' | 'postalCode',
    value: string,
  ) => void;
  setCoordinateFieldValue: (field: 'latitude' | 'longitude', value: number | null) => void;
  setAreaProximity: (
    proximity: { latitude: number; longitude: number; bbox?: number[] } | null,
  ) => void;
  setMapConfirmed: (confirmed: boolean) => void;
  handleOpenMap: (overrides?: AddressMapRouteOverrides) => void;
};

type MapResultActions = {
  clearTransientErrors: () => void;
  setCoordinateFieldValue: (field: 'latitude' | 'longitude', value: number | null) => void;
  setMapConfirmed: (confirmed: boolean) => void;
};

type PendingSelectionHandlers = {
  consumePendingAreaSelection: () => PendingAreaSelection | null;
  consumePendingAddressSelection: () => SelectedAddressSuggestion | null;
  consumePendingMapPickerResult: () => MapPickerResult | null;
  getCurrentAddressContext: () => Pick<
    AddressMapRouteSource,
    'areaId' | 'areaName' | 'city' | 'province' | 'postalCode'
  >;
  applySelectedArea: (selection: PendingAreaSelection) => void;
  applySelectedAddress: (
    selection: SelectedAddressSuggestion,
    context: Pick<
      AddressMapRouteSource,
      'areaId' | 'areaName' | 'city' | 'province' | 'postalCode'
    >,
  ) => void;
  applyMapPickerResult: (result: MapPickerResult) => void;
};

export function buildAddressContextFromPendingAreaSelection(
  selectedArea: PendingAreaSelection,
): Pick<AddressMapRouteSource, 'areaId' | 'areaName' | 'city' | 'province' | 'postalCode'> {
  const area = selectedArea.area;
  const resolved = resolveAreaNames(selectedArea);
  const areaDisplayName = buildAreaDisplayName({
    ...resolved,
    regency: formatLevel2Display(resolved.regency, area.administrative_division_level_2_type),
  });

  return {
    areaId: area.id,
    areaName: areaDisplayName || area.name,
    city: resolved.regency,
    province: resolved.province,
    postalCode: resolved.postalCode,
  };
}

export function buildAddressMapRouteParams(
  values: AddressMapRouteSource,
  overrides?: AddressMapRouteOverrides,
): RouteParams<'profile/address-map'> {
  const params: RouteParams<'profile/address-map'> = {};

  const latitude = overrides?.latitude ?? values.latitude;
  const longitude = overrides?.longitude ?? values.longitude;
  const streetAddress = overrides?.streetAddress ?? values.streetAddress;
  const areaName = overrides?.areaName ?? values.areaName;
  const city = overrides?.city ?? values.city;
  const province = overrides?.province ?? values.province;
  const postalCode = overrides?.postalCode ?? values.postalCode;

  if (latitude != null && longitude != null) {
    params.latitude = String(latitude);
    params.longitude = String(longitude);
  }

  if (streetAddress) {
    params.streetAddress = streetAddress;
  }

  if (areaName) {
    params.areaName = areaName;
  }

  if (city) {
    params.city = city;
  }

  if (province) {
    params.province = province;
  }

  if (postalCode) {
    params.postalCode = postalCode;
  }

  return params;
}

export function applySelectedAreaSelection(
  selectedArea: PendingAreaSelection,
  actions: AreaActions,
): void {
  const area = selectedArea.area;
  const resolved = resolveAreaNames(selectedArea);
  const areaDisplayName = buildAreaDisplayName({
    ...resolved,
    regency: formatLevel2Display(resolved.regency, area.administrative_division_level_2_type),
  });

  actions.clearTransientErrors();
  actions.setArea({
    id: area.id,
    name: areaDisplayName || area.name,
    city: resolved.regency,
    province: resolved.province,
    postalCode: resolved.postalCode,
  });
  actions.setAreaProximity(null);
  actions.setCoordinateFieldValue('latitude', null);
  actions.setCoordinateFieldValue('longitude', null);
  actions.resetMapConfirmation();
}

export function applySelectedAddressSelection(
  selectedAddress: SelectedAddressSuggestion,
  currentValues: Pick<
    AddressMapRouteSource,
    'areaId' | 'areaName' | 'city' | 'province' | 'postalCode'
  >,
  actions: AddressActions,
): void {
  actions.clearTransientErrors();

  const sanitizedStreetAddress =
    sanitizeAddressCandidate(selectedAddress.streetAddress) || selectedAddress.streetAddress;

  actions.setTextFieldValue('streetAddress', sanitizedStreetAddress);

  if (!currentValues.areaId) {
    actions.setTextFieldValue('city', selectedAddress.city);
    actions.setTextFieldValue('province', selectedAddress.province);
    actions.setTextFieldValue('postalCode', selectedAddress.postalCode);
  }

  actions.setCoordinateFieldValue('latitude', selectedAddress.latitude);
  actions.setCoordinateFieldValue('longitude', selectedAddress.longitude);
  actions.setAreaProximity({
    latitude: selectedAddress.latitude,
    longitude: selectedAddress.longitude,
  });
  actions.setMapConfirmed(false);
  actions.handleOpenMap({
    latitude: selectedAddress.latitude,
    longitude: selectedAddress.longitude,
    streetAddress: sanitizedStreetAddress,
    areaName: currentValues.areaName,
    city: currentValues.areaId ? currentValues.city : selectedAddress.city,
    province: currentValues.areaId ? currentValues.province : selectedAddress.province,
    postalCode: currentValues.areaId ? currentValues.postalCode : selectedAddress.postalCode,
  });
}

export function applyMapPickerSelection(result: MapPickerResult, actions: MapResultActions): void {
  actions.clearTransientErrors();
  actions.setCoordinateFieldValue('latitude', result.latitude);
  actions.setCoordinateFieldValue('longitude', result.longitude);
  actions.setMapConfirmed(true);
}

export function applyPendingSelections(handlers: PendingSelectionHandlers): void {
  const selectedArea = handlers.consumePendingAreaSelection();
  const effectiveAddressContext = selectedArea
    ? buildAddressContextFromPendingAreaSelection(selectedArea)
    : handlers.getCurrentAddressContext();

  if (selectedArea) {
    handlers.applySelectedArea(selectedArea);
  }

  const selectedAddress = handlers.consumePendingAddressSelection();
  if (selectedAddress) {
    handlers.applySelectedAddress(selectedAddress, effectiveAddressContext);
  }

  const mapPickerResult = handlers.consumePendingMapPickerResult();
  if (mapPickerResult) {
    handlers.applyMapPickerResult(mapPickerResult);
  }
}
