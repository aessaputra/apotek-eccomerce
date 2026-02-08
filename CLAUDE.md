# Claude AI Development Guide

This React Native Expo project follows specific patterns and uses built-in features for consistency and reusability.

## Project Context

**Technology Stack:**

- React Native with Expo SDK 54
- TypeScript (strict mode)
- Expo Router v6 (flat config)
- Redux Toolkit for state management
- Tamagui for UI components and styling
- ESLint 9 with flat config
- React 19.1 and React Native 0.81.4

## Always Use These Built-in Features

### Configuration & Environment

- **`utils/config.ts`** - For all environment variables and app configuration
- **`utils/deviceInfo.ts`** - For platform detection, screen dimensions, and device info
- Never hardcode values that should come from configuration

### Theme & Styling (Full Tamagui)

- **Single styling system**: Tamagui only. No StyleSheet or dual styling.
- **Colors**: Defined only in `tamagui.config.ts` (palette + theme overrides). Use Tamagui tokens (`$primary`, `$background`, `$color`) in components; never hardcode.
- **Fonts**: `@/utils/fonts` — `loadFonts()`, `fonts` (OpenSans). Call `loadFonts()` at app init (e.g. root layout).
- **Images**: `@/utils/images` — `loadImages()`, `images` (logo etc.). Call `loadImages()` at app init.
- **Tamagui** - All UI uses Tamagui: components (Card, Input, Form, ListItem, Button), layout (YStack, XStack), tokens from themes. Import from `tamagui`.

### Custom Hooks (Reuse These)

- **`useColorScheme` from `@/hooks`** - For dark/light theme detection
- **`useDataPersist` from `@/hooks`** - For local storage operations
- **`useKeyboard` from `@/hooks`** - For keyboard state management
- **`useAppSlice` from `@/slices`** - For global state operations

### State Management

- **Redux Toolkit slices in `@/slices`** - For all global state
- Use `useAppSlice` for accessing global state
- Keep local state minimal, prefer global state for shared data

### Services & API

- **`@/services`** - For all API calls and external integrations
- Never make direct API calls from components
- Use the services layer for data transformation

### Type Definitions

- **`@/types`** - For all TypeScript interfaces and types
- Always define component prop interfaces
- Use strict TypeScript - project is configured for it

## Directory Structure

```
app/                 # Expo Router routes (keep minimal, delegate to scenes)
components/
  elements/          # Reusable Tamagui-based components (styled() or Tamagui primitives)
  layouts/           # Layout-specific components (headers, navigation)
scenes/              # Screen components (main UI logic)
hooks/               # Custom React hooks
slices/              # Redux Toolkit slices
services/            # API and external services
tamagui.config.ts    # createTamagui; palette + light/dark themes (single source for colors)
types/               # TypeScript type definitions
utils/               # Utility functions (config, deviceInfo, fonts, images)
```

## Component Development Patterns

### Component Structure

1. Define TypeScript interface for props
2. Use function declarations (not arrow functions)
3. Place hooks at the top
4. Use early returns for conditional rendering
5. Use Tamagui for all styling: tokens (`$primary`, `$background`), layout (YStack, XStack), `styled()` for custom components. No StyleSheet.
6. Export default at bottom

### Import Order

1. React and React Native
2. Third-party libraries
3. Internal imports with `@/` paths
4. Relative imports

### File Naming

- **Components**: PascalCase (`Button.tsx`)
- **Hooks**: camelCase with "use" prefix (`useColorScheme.ts`)
- **Utils**: camelCase (`deviceInfo.ts`)
- **Types**: PascalCase (`User.ts`)

## Development Guidelines

### When Creating Components

1. **Check Tamagui first**: Card, Input, Form, ListItem, Button, Avatar, Checkbox, Switch — use directly or extend with `styled()`
2. Check `components/elements` for project-specific Tamagui-based wrappers
3. Use Tamagui tokens (`$primary`, `$background`, `$color`) — never hardcode
4. Custom components: use Tamagui `styled(View)`, `styled(Text)`, or composition — no StyleSheet
5. Use TypeScript interfaces for all props
6. Write tests for all new components

### State Management Rules

- Use Redux Toolkit for global state
- Use `useAppSlice` for state operations
- Keep component state local only when not shared
- Use built-in hooks for common functionality

### Styling Rules (Full Tamagui)

- **Single styling system**: Tamagui only. Do not use StyleSheet.
- **Color source**: palette in `tamagui.config.ts` → theme overrides (light/dark)
- **All components**: Use Tamagui tokens (`$primary`, `$background`, `$color`), layout (YStack, XStack), and `styled()` for custom UI
- **TamaguiProvider** receives `defaultTheme` from `useColorScheme()` for dark/light
- Use Tamagui's responsive props when needed; support dark/light via Tamagui themes

### Testing Requirements

- One test file per component
- Test behavior, not implementation
- Use descriptive test names
- Mock external dependencies

## Navigation (Expo Router v5)

- Use flat config format (already configured)
- Keep route files minimal - delegate to scene components
- Use `<Redirect>` for programmatic navigation
- Handle deep linking through router

## Code Quality Standards

- No `console.log` in production code
- Always handle loading and error states
- Write self-documenting code
- Keep functions focused and small
- Use TypeScript strictly

## Key Development Principles

1. **Reuse First** - Check Tamagui components, then `components/elements`, before creating new ones
2. **Follow Patterns** - Use established patterns in the codebase
3. **Use Built-ins** - Leverage Tamagui, theme, hooks, and utils
4. **Single Styling** - Tamagui only; colors in tamagui.config.ts; no StyleSheet or dual systems
5. **Type Safety** - Use TypeScript strictly for better code quality
6. **Test Everything** - Write tests for all components
7. **Stay Consistent** - Follow naming conventions and code structure

## Common Utilities Available

### Device & Platform

```typescript
// From utils/deviceInfo.ts
import { isIos, isAndroid, windowWidth, windowHeight } from '@/utils/deviceInfo';
```

### Configuration

```typescript
// From utils/config.ts
import config from '@/utils/config';
// Access env and apiUrl
```

### Theme

```typescript
// Colors for tamagui.config.ts only; loadFonts/loadImages for app init
import { loadFonts } from '@/utils/fonts';
import { loadImages } from '@/utils/images';
```

### Tamagui (Full UI Styling)

```typescript
// Import from 'tamagui' (per Tamagui docs)
import { Card, Input, Button, YStack, XStack, useTheme, styled, View, Text } from 'tamagui';

// Tokens: $primary, $background, $color (defined in tamagui.config themes)
// Custom: styled(View, { backgroundColor: '$background', ... }) or styled(Text, { ... })
// Root: TamaguiProvider config={tamaguiConfig} defaultTheme={useColorScheme()!}
```

### Hooks

```typescript
// From @/hooks
import useColorScheme from '@/hooks/useColorScheme';
import { useDataPersist } from '@/hooks';
```

## Tamagui Setup (per official docs)

- **tamagui.config.ts**: `createTamagui({ ...defaultConfig, themes })` — palette + light/dark overrides. Include `declare module 'tamagui' { interface TamaguiCustomConfig extends ... }` for types.
- **Root layout**: `<TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme!}>` — `colorScheme` from `useColorScheme()` (react-native).
- **Web**: `import '../tamagui-web.css'` in root layout for Expo web.
- **Babel**: `@tamagui/babel-plugin` with `config: './tamagui.config.ts'`, `components: ['tamagui']`.

## Architecture Notes

- Project upgraded to Expo SDK 54
- Using React 19.1 with React Native 0.81.4
- Full Tamagui for all UI styling; colors from tamagui.config.ts palette/themes; no StyleSheet
- ESLint 9 with flat config
- Directory "pages" was renamed to "scenes"
- TypeScript strict mode enabled (v5.9.2)
- Custom theme system with dark/light support; Tamagui themes (light/dark) sync with useColorScheme
- SafeAreaView imported from react-native-safe-area-context (not React Native)
- Required peer dependencies: @expo/metro-runtime, react-native-worklets

## Available Scripts

### Development Commands:

- `npm run dev` - Start Expo development server for all platforms with cache cleared
- `npm run dev:ios` - Start development server for iOS simulator only
- `npm run dev:android` - Start development server for Android emulator only
- `npm run dev:web` - Start development server for web browser only
- `npm run dev:doctor` - Run Expo diagnostics to check project health

### Building & Deployment:

- `npm run dev:build:mobile` - Build iOS (IPA) and Android (APK) using EAS Build for development
- `npm run dev:build:web` - Export static web application to `dist/` directory
- `npm run dev:serve:web` - Serve the built web app locally (run after `dev:build:web`)
- `npm run dev:deploy:web` - Build and deploy web app to EAS Hosting

### Environment & Configuration:

- `npm run dev:secret:push` - Upload environment variables from `.env.dev` to EAS secrets
- `npm run dev:secret:list` - List all environment variables stored in EAS
- `npm run dev:config:public` - Display current Expo configuration for debugging

### Code Quality & Testing:

- `npm run lint` - Run ESLint to check code quality and style
- `npm run lint:staged` - Run linting only on staged Git files (used in pre-commit)
- `npm run format` - Format code using Prettier
- `npm run test` - Run Jest unit tests
- `npm run test:watch` - Run Jest tests in watch mode for development

### Git Hooks:

- `npm run prepare` - Set up Husky Git hooks for pre-commit quality checks

## When in Doubt

- Use Tamagui for all UI — no StyleSheet
- Check Tamagui components (Card, Input, Form, ListItem, Button, etc.) first
- Check `components/elements` for project-specific Tamagui wrappers
- Use Tamagui tokens (`$primary`, `$background`) — never hardcode colors
- Custom UI: `styled(View, {...})` or Tamagui composition
