# Dark Mode Contrast Verification

## Updated Dark Tokens

- `color`: `#F2F5F7`
- `colorPress`: `#E6EBF0`
- `colorSubtle`: `#AAB4C2`
- `placeholderColor`: `#98A4B3`
- `colorMuted`: `#98A4B3`
- `tabBarInactive`: `#AAB4C2`

## WebAIM Contrast Checker (API) Results

Verified using WebAIM API endpoint pattern:

`https://webaim.org/resources/contrastchecker/?fcolor=<FOREGROUND>&bcolor=<BACKGROUND>&api`

| Scenario                                | Foreground | Background |  Ratio | WCAG AA (normal text) |
| --------------------------------------- | ---------- | ---------- | -----: | --------------------- |
| Search placeholder on surfaceElevated   | `#98A4B3`  | `#262626`  | 5.97:1 | pass                  |
| Category button text on surfaceElevated | `#F2F5F7`  | `#262626`  | 13.8:1 | pass                  |
| Form label on surface                   | `#F2F5F7`  | `#141414`  | 16.8:1 | pass                  |
| Secondary text on surface               | `#AAB4C2`  | `#141414`  | 8.78:1 | pass                  |
| Secondary text on elevated surface      | `#AAB4C2`  | `#262626`  | 7.21:1 | pass                  |

## Targeted Issue Mapping

1. Search placeholder contrast improved via `placeholderColor` token and placeholder usage normalization.
2. Category button text verified against `surfaceElevated` background with high contrast margin.
3. Form labels moved to stronger text token (`$color`) in key form components.
4. Secondary text adjusted via `colorSubtle` and `colorMuted` dark token updates.

## Exhaustive Dark Text Matrix (All Theme Text Tokens)

Token values tested from `brand_dark`:

- `color #F2F5F7`
- `colorPress #E6EBF0`
- `colorSubtle #AAB4C2`
- `colorMuted #98A4B3`
- `placeholderColor #98A4B3`
- `colorDisabled #8A94A3`
- `danger #FF8F8F`
- `error #FF8F8F`
- `primary #41D8CB` (converted from `hsl(175,66%,55%)`)
- `white token #0A0A0A` (used on primary backgrounds)

Backgrounds tested:

- `background #0A0A0A`
- `surface #141414`
- `surfaceElevated #262626`

All matrix checks returned **WCAG AA pass** for normal text (>= 4.5:1).

| Token            | background | surface | surfaceElevated |
| ---------------- | ---------: | ------: | --------------: |
| color            |     18.0:1 |  16.8:1 |          13.8:1 |
| colorPress       |     16.5:1 |  15.3:1 |          12.6:1 |
| colorSubtle      |     9.44:1 |  8.78:1 |          7.21:1 |
| colorMuted       |     7.82:1 |  7.27:1 |          5.97:1 |
| placeholderColor |     7.82:1 |  7.27:1 |          5.97:1 |
| colorDisabled    |     6.45:1 |  6.00:1 |          4.93:1 |
| danger           |     9.02:1 |  8.40:1 |          6.90:1 |
| error            |     9.02:1 |  8.40:1 |          6.90:1 |
| primary          |     11.2:1 |  10.4:1 |          8.58:1 |

Additional check:

- `white token #0A0A0A` on `primary #41D8CB` => 11.2:1 (AA pass)
