
- Pending area writes can still fail after postal resolution; catch them in the hook and surface the exact user-safe message instead of rethrowing.
- Jest clearAllMocks() does not reset a mock implementation, so a throwing mock must be restored before success-path assertions.

- Keep the persistence boundary local: build the selection payload first, catch only the store write, then call onComplete outside the catch so navigation failures are not masked.
- Final postal selection needs the same requestIdRef stale guard as staged list loads; stale resolved areas must return before loading/error/completion mutations.
- In concurrent postal selections, pass the selected option hierarchy into handleAreaSelection so the latest success does not rely on a stale selectedPostalLabel closure.
- Guard async postal finalization with catch/finally as well as success checks; rejected stale requests must be swallowed and loading cleanup must stay tied to the latest request id.
- Keep the final postal resolver catch boundary tight: catch only resolveAreaByPostal failures, then run no-area and handleAreaSelection after the try/catch so completion/navigation errors are not remasked.
- Native `TextInput` props on Tamagui `Input` can need explicit theme resolution; keep regular Tamagui style props token-based and resolve only the native bridge prop, matching `AddressSearch`.
- AreaPicker screen render tests should wait for the async province bootstrap UI (uppercase option labels such as `BANTEN`) to avoid React act warnings after the assertion.
- Focused AreaPicker QA should distinguish direct current-location flow coverage from helper-only coverage; do not claim handleUseCurrentLocation success/failure is covered unless explicit tests exist.

- 2026-04-25 13:18:34: F4 scope audit separated the prior Profile/Akun refactor working-tree noise from the corrective Oracle fixes; approved scope is limited to useAreaPickerFlow, AreaPicker, AreaPicker tests, and evidence, with no route/service/session/cancellation changes.
- 2026-04-25 final: F1-F4 all returned APPROVE and were marked complete in `profile-akun-oracle-fixes.md`; final validation evidence includes focused AreaPicker tests, lint, format check, and full Jest passing.
