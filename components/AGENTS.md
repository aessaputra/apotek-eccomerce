# COMPONENTS

Tamagui-based component library. All UI uses Tamagui primitives and themed tokens; keep data fetching and Supabase access outside this directory.

## STRUCTURE

```
components/
├── elements/       # Atomic UI building blocks
├── layouts/        # Navigation/header/tab/layout primitives
├── AddressForm/    # Multi-file composite for address entry
├── AreaPicker/     # Area selection components
├── MapPin/         # Map-specific picker UI
└── icons/          # Custom icon components
```

## WHERE TO LOOK

| Task                  | Location                | Notes                                                       |
| --------------------- | ----------------------- | ----------------------------------------------------------- |
| Add atomic component  | `elements/[Name]/`      | Prefer `Name/Name.tsx` + `index.ts`                         |
| Add layout component  | `layouts/[Name]/`       | Shared screen/header/tab structure                          |
| Add complex composite | `components/[Feature]/` | Use only when the component needs multiple supporting files |
| Add icon              | `icons/`                | Keep icon primitives presentation-only                      |

## CHILD AGENTS

- `AddressForm/AGENTS.md` — address entry composite, suggestion/result states, default-address toggle.
- `MapPin/AGENTS.md` — native map picker, Expo Location behavior, `react-native-maps` web guard.

Read the closest child file before changing those composites.

## CONVENTIONS

- Use Tamagui primitives such as `XStack`, `YStack`, `Text`, `Card`, `Button`, and `styled`.
- Prop types usually extend `GetProps<typeof SomeTamaguiPrimitive>` with `Omit` for overrides.
- Shared visual constants should come from `@/constants/ui` rather than ad hoc literals when a reusable token already exists.
- Platform-specific escape hatches are rare; existing dynamic `require()` usage is limited to cases like map libraries that break on web.
- Components should usually receive prepared data and callbacks via props or hooks; avoid direct backend work here unless the existing component is already acting as a tightly scoped interaction wrapper.

## TESTING

- Component tests live in `__tests__/components/`, not beside source files.
- Use `renderWithTheme` from `@/test-utils/renderWithTheme`.
- Mock dependencies inline with `jest.mock()` inside the test file.

## ANTI-PATTERNS

- **NEVER** use `StyleSheet.create()` for core UI in this directory.
- **NEVER** import the Supabase client from this directory. Service calls from a component should stay rare and limited to existing interaction-oriented composites rather than becoming the default pattern.
- **NEVER** add `__mocks__/` directories; keep mocking local to the test.
