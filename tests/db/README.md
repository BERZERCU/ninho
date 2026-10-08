# Isolated managed child migration validation

Run `npm ci --prefix tests/db` and `npm test --prefix tests/db`.

This test applies the complete migration, unchanged, to a new in-memory PostgreSQL database using pinned PGlite. Its dependency fixture contains only the Auth/family columns and constraints used by this migration. The four family RPC definitions were read from production on 2026-10-08; no user data is included.

The test exercises role escalation, other-family access, invite disclosure, guardian deletion/leave protection, RPC grants and child deletion. All test users are rolled back. Auth UID and invitation randomness are simulated locally. It does not emulate hosted Supabase Auth, CAPTCHA, Edge runtime, Storage, Realtime or all existing RLS policies, and does not replace authenticated browser E2E or deployment verification.
