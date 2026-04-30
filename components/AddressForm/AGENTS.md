# ADDRESS FORM COMPONENTS

Multi-file address-entry composite. It is UI-only but coordinates form fields, address suggestions, area picker trigger, and default-address toggle callbacks supplied by profile scenes/hooks.

## STRUCTURE

```
components/AddressForm/
├── AddressForm.tsx           # Main form fields and area/street triggers
├── AddressSuggestionList.tsx # Google Places suggestion result states
├── DefaultAddressToggle.tsx  # Haptic checkbox-style default toggle
└── index.ts                  # Public exports
```

## WHERE TO LOOK

| Task                     | File                        | Notes                                                    |
| ------------------------ | --------------------------- | -------------------------------------------------------- |
| Change form fields       | `AddressForm.tsx`           | Values/errors use `utils/addressValidation` types        |
| Change suggestion states | `AddressSuggestionList.tsx` | Loading/error/empty/initial recommendation UI lives here |
| Change default toggle    | `DefaultAddressToggle.tsx`  | Uses haptics, `MIN_TOUCH_TARGET`, and `PRESS_OPACITY`    |
| Change area selection UI | `components/AreaPicker/`    | `AddressForm` only renders the trigger                   |

## CONVENTIONS

- `AddressForm` receives prepared `values`, `errors`, refs, save/validate callbacks, and optional navigation callbacks.
- Field blur handlers trim before saving/validating when the source field requires normalization.
- Street address is a pressable selector, not a free-form editable input.
- Suggestion lists cap initial recommendations at 6 and search results at 5.
- Indonesian empty/error copy is embedded here only for component-local suggestion states.

## ANTI-PATTERNS

- **NEVER** fetch Google Places or Supabase data from these components; pass results/callbacks in.
- **NEVER** bypass `AddressFormValues` / `AddressFormErrors` when adding fields.
- **NEVER** remove accessibility labels/state from pressable field and default toggle controls.
