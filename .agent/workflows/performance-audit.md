---
description: Audit app performance for re-renders, image optimization, bundle size, and memory
---
1. Ask the user which screen or area to audit, or run a full-app audit.
2. Use **sequentialthinking** to plan the audit scope:
   - Identify which performance areas are most critical for this screen.
   - Prioritize checks by impact (re-renders > images > lists > memory > bundle).
   - Note any known bottlenecks from user report.
3. Check for unnecessary re-renders:
   - Look for missing `React.memo`, `useMemo`, `useCallback` on expensive components.
   - Verify FlatList uses `keyExtractor`, `getItemLayout`, and `windowSize` props.
   - Use `@react-patterns` for React performance best practices.
4. Check image optimization:
   - All images should use `expo-image` (not React Native `Image`).
   - Verify images have proper `contentFit`, `placeholder`, and `cachePolicy` props.
   - Use `@mobile-developer` for Expo image best practices.
5. Check list performance:
   - Long lists must use `FlashList` or `FlatList` — never `.map()` inside ScrollView.
   - Verify `estimatedItemSize` is set for FlashList.
6. Check for memory leaks:
   - Verify `useEffect` cleanup functions exist for subscriptions and timers.
   - Verify Supabase realtime subscriptions are unsubscribed on unmount.
7. Check bundle size concerns:
   - Look for large unused imports or heavy libraries that could be lazy-loaded.
   - Use `@kaizen` for continuous improvement suggestions.
8. Summarize findings with severity (Critical / Warning / Info) and recommend fixes.
// turbo
9. Run `npm run lint` to catch any issues introduced during audit fixes.
