# WolfGuard shared storage

Managed server for the GitHub Pages frontend at https://wolfguard.wavetools.fr/.
Anonymous visitors may reach the login endpoint. Every data read and write requires a short-lived session issued after verification of the owner's eight-digit PIN.

## Deployment

Use the Sites workflow with the existing project ID in `.openai/hosting.json`. The manifest provisions D1 (`DB`) and R2 (`BUCKET`). Do not create a second Site or reset production storage. The initial Drizzle migration is schema-only; subsequent schema changes require a new migration.

Configure three independent server-only secrets through Sites environment settings: `AUTH_PEPPER` (32 random bytes, hex), `STORAGE_KEY` (32 random bytes, hex), and `BOOTSTRAP_HASH` (SHA-256 of the one-time activation token). Never commit their values, the activation link, or a Sites access token. Preserve the storage key: replacing it makes existing R2 objects unreadable.

Before first use, only the private activation link can initialize the singleton vault. The browser checks its existing encrypted data against the entered PIN, sets up the server, then uploads the encrypted snapshot. Setup is atomic and cannot overwrite an initialized vault. The activation link is carried in the frontend URL fragment and removed immediately; it is never a public source constant.

The public backend must allow anonymous platform access to avoid requiring ChatGPT sign-in. Application PIN verification and authorization remain mandatory. The frontend CORS origins are explicitly enumerated in `lib/wolfguard/core.mjs`.

## Protection and consistency

PIN verification uses a secret pepper, random salt, and PBKDF2-SHA-256 at 100,000 iterations (the production Workers ceiling). Every failed login increments a shared D1 counter and imposes 5 additional seconds of delay. A database lease serializes verification, including concurrent devices. Sessions are opaque random 256-bit values, stored only as SHA-256 hashes in D1, with one-minute idle expiry and fifteen-minute maximum lifetime. The browser retains the bearer token only in memory.

The browser uploads its existing AES-256-GCM envelope (PBKDF2 600,000). R2 adds independent server-key AES-256-GCM encryption in authenticated 64 KiB frames. Database metadata contains no document title or vault field. PINs and snapshot bodies are never logged by application code. The server receives the PIN over HTTPS to verify it; this is not a zero-knowledge password protocol.

Immutable R2 uploads commit through a D1 compare-and-swap of the snapshot pointer and version. Concurrent stale writes return 409. Failed uploads leave the committed pointer intact. Previous encrypted R2 objects are retained for recovery. Code rotation stages a new verifier and commits it together with the re-encrypted snapshot, revoking older sessions. An upload acknowledgement can be lost after commit; reopen using the new code to recover.

The frontend preserves an encrypted copy of the original browser workspace and failed changes locally. Export them under Settings > Data. A forgotten PIN has no automatic recovery route. Exported client-only backups remain limited by the entropy of their eight-digit code.

## Local verification

Node 22.13 or newer is required. Follow the Sites starter installation/build instructions. Generate migrations with `npm run db:generate`; apply only unapplied SQL to the local D1 database. Run browser and server tests from the parent WolfGuard GitHub repository. Local and production databases are separate. Test fixtures and synthetic development secrets must never initialize production.
