# PROFILE SCENES

Profile/account flows live here: profile view, address list/forms, support, order history, and the area-picker workflow. This directory mixes screens with tightly coupled local helpers because the address flow is feature-specific.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Main profile screen | `Profile.tsx`, `EditProfile.tsx` | Account overview and profile editing |
| Address list and form | `AddressList.tsx`, `AddressForm.tsx` | Saved addresses and CRUD flow |
| Map/search address flow | `AddressMap.tsx`, `AddressSearch.tsx` | Search + pin selection helpers |
| Area selection | `AreaPicker.tsx` | Multi-stage province/city/district/postal flow |
| Order history entry point | `OrderHistory.tsx` | Profile-owned jump into order history |
| Route param helpers | `addressRouteParams.ts` | Keep profile route params typed and synchronized |

## AREA PICKER SUBSYSTEM

- `AreaPicker.tsx` is the orchestration screen; treat it as the entry point for the area-selection workflow.
- `areaPickerState.ts` defines the stage model and selection-state helpers.
- `areaPickerHelpers.ts` handles normalization and postal-code resolution logic.
- `areaPickerCurrentLocation.ts` owns GPS/current-location lookup and reverse-geocoding coordination.
- `AreaPickerStageList.tsx` and `AreaPickerSelectionSummary.tsx` are presentation helpers for the same flow.
- `addressFormFlow.ts` coordinates transitions between address-form steps; keep it aligned with `AddressForm.tsx` and route params.

## CONVENTIONS

- Keep reusable cross-feature logic in hooks/services, but keep address-flow-specific state machines local to this directory.
- When changing the area picker, read the whole helper cluster first; behavior is spread across orchestration, state, lookup, and summary files.
- Keep route payloads typed through `addressRouteParams.ts` and shared route types rather than ad hoc parsing inside screens.
- Profile screens may consume services and shared hooks, but avoid importing Supabase clients directly here.

## ANTI-PATTERNS

- **NEVER** move the area-picker helpers into generic utilities unless another feature truly needs them.
- **NEVER** change only one stage of the area-picker flow without checking `areaPickerState.ts`, `areaPickerHelpers.ts`, and `addressFormFlow.ts` together.
- **NEVER** duplicate address-route parsing across screens when `addressRouteParams.ts` already defines the contract.
