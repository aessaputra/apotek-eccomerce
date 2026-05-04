# MAP PIN / MAP PICKER

Native map picker composite for selecting delivery coordinates. The directory name is `MapPin`, but the primary implementation is `MapPicker.tsx`.

## STRUCTURE

```
components/MapPin/
├── MapPicker.tsx # Coordinate picker, permission flow, draggable marker
└── index.ts      # Public exports
```

## PLATFORM MODEL

- `react-native-maps` is dynamically required only when `Platform.OS !== 'web'`; this prevents web bundling failures.
- `MapView` / `Marker` module variables remain `null` on web; UI must tolerate that path.
- Location permission and GPS lookup use `expo-location` with a 15s timeout and last-known fallback.
- Default coordinate fallback is Jakarta: `-6.2088, 106.8456`.

## STATE MODEL

- `selectedCoords` starts from `initialCoords` or Jakarta fallback.
- `hasInteracted` tracks whether the user moved the pin; confirmation returns `didAdjustPin`.
- `isCancelledRef` prevents state updates after unmount.
- `regionAnimationTimeoutRef` must be cleared on cleanup before re-animating map region.

## WHERE TO LOOK

| Task                       | File            | Notes                                               |
| -------------------------- | --------------- | --------------------------------------------------- |
| Change permission copy     | `MapPicker.tsx` | Indonesian location-denied/unavailable messages     |
| Change coordinate result   | `MapPicker.tsx` | Keep `MapPickerResult` and `didAdjustPin` semantics |
| Change native map behavior | `MapPicker.tsx` | Preserve dynamic require and web guard              |

## ANTI-PATTERNS

- **NEVER** statically import `react-native-maps`; it breaks web.
- **NEVER** remove unmount/timeout cleanup around map animation and location requests.
- **NEVER** assume GPS is available; keep permission-denied, timeout, and manual-pin paths.
