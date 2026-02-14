---
description: Integrate an external API via Supabase Edge Functions (Midtrans, RajaOngkir)
---
1. Ask the user which API to integrate (e.g., "Midtrans Payment", "RajaOngkir Shipping").
2. Use **sequentialthinking** to plan the integration architecture:
   - Map the full data flow: client → Edge Function → external API → response.
   - Identify error scenarios and how each should be handled.
   - Plan what data to validate server-side vs client-side.
3. Define the API contract: request/response payloads and error codes.
   - Use `@api-design-principles` to design clean interfaces.
4. Create the Supabase Edge Function.
   - Use **Supabase MCP** `deploy_edge_function` tool to deploy directly.
   - Use `@supabase-automation` for Edge Function best practices.
   - Use `@context7-auto-research` to fetch latest Supabase Edge Functions docs.
   - Store API keys as Supabase secrets (never in client code).
5. Security audit: verify no secrets leak to client, validate input server-side.
   - Use `@frontend-mobile-security-coder` for mobile security checks.
   - Run **Supabase MCP** `get_advisors` (type: security) to check for vulnerabilities.
6. Implement the client-side service in `services/[api-name].service.ts`.
   - Call the Edge Function via `supabase.functions.invoke('[api-name]', { body })`.
   - Use `@mobile-developer` for error handling and UX.
7. Test end-to-end: client → Edge Function → external API → response.
   - Use **Supabase MCP** `get_logs` (service: edge-function) to debug if needed.
   - Use `@systematic-debugging` if issues arise.
8. Run `@lint-and-validate` on all changed files.
