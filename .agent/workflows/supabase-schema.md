---
description: Create or modify Supabase database tables, RLS policies, and generate TypeScript types
---
1. Ask the user what schema change is needed (e.g., "add Orders table", "add column to Products").
2. Fetch latest Supabase documentation for schema and RLS best practices.
   - Use `@context7-auto-research` to get up-to-date Supabase docs.
3. Use **sequentialthinking** to analyze the schema design:
   - Map table relationships (foreign keys, one-to-many, many-to-many).
   - Identify which columns need indexes.
   - Plan RLS policies before writing SQL.
4. Design the schema change: define tables, columns, types, and relationships.
   - Use `@supabase-automation` for Supabase-specific patterns.
   - Follow naming convention: snake_case for columns, plural for table names.
5. Write Row Level Security (RLS) policies for every new or modified table.
   - Use `@api-security-best-practices` to ensure proper access control.
   - CRITICAL: Never leave a table without RLS. Default to deny all, then allow specific access.
6. Apply the migration using **Supabase MCP** `apply_migration` tool.
   - This tracks the migration and ensures it can be replayed on branches.
7. Run **Supabase MCP** `get_advisors` (type: security) to verify no missing RLS policies.
8. Generate updated TypeScript types using **Supabase MCP** `generate_typescript_types` tool.
   - Save the output to `types/supabase.ts`.
9. Update the relevant service file in `services/` to use the new schema.
   - Import types from `@/types/supabase`.
// turbo
10. Run `npm run lint` to ensure no type errors or warnings.
