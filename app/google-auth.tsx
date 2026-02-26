import { Redirect } from 'expo-router';

/**
 * Google OAuth deep-link callback handler.
 *
 * When native Google OAuth completes, the browser redirects to
 * `apotek-eccomerce://google-auth?code=...` (PKCE flow).
 * Expo Router resolves this to `/google-auth` — this route.
 *
 * Token extraction is handled by WebBrowser.openAuthSessionAsync
 * + createSessionFromUrl in auth.service.ts.
 * This route simply redirects back to the index so the router
 * doesn't show a 404.
 */
export default function GoogleAuthCallback() {
  return <Redirect href="/" />;
}
