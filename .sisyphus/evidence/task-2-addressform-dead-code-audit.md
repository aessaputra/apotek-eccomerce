## Task 2 AddressForm Dead Code Audit

### Reference audit
- `AddressInfoSection` only appeared in `components/AddressForm/AddressInfoSection.tsx` and `__tests__/components/AddressForm_AddressInfoSection.test.tsx`.
- `ReceiverInfoSection` only appeared in `components/AddressForm/ReceiverInfoSection.tsx` and `__tests__/components/AddressForm_ReceiverInfoSection.test.tsx`.
- Repo-wide import search found no app/source imports for either component path.

### LSP reference audit
- `AddressInfoSection` references: declaration/export in its own file plus the single legacy component test file.
- `ReceiverInfoSection` references: declaration/export in its own file plus the single legacy component test file.

### Deletion decision
- Deleted:
  - `components/AddressForm/AddressInfoSection.tsx`
  - `components/AddressForm/ReceiverInfoSection.tsx`
  - `__tests__/components/AddressForm_AddressInfoSection.test.tsx`
  - `__tests__/components/AddressForm_ReceiverInfoSection.test.tsx`
- Kept live:
  - `components/AddressForm/AddressForm.tsx`
  - `components/AddressForm/DefaultAddressToggle.tsx`
  - `components/AddressForm/AddressSuggestionList.tsx`

### Coverage preservation
- Added live coverage to `__tests__/components/AddressForm.test.tsx` for receiver field change/blur validation, phone submit behavior, and disabled state.

### Verification
- Command: `npm run test -- --runInBand __tests__/components __tests__/scenes/AddressFormFlow.test.tsx`
- Result: passed (`41` suites, `218` tests).
