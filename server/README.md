# WolfGuard shared storage

Managed server for the GitHub Pages frontend at https://wolfguard.wavetools.fr/.
Anonymous visitors may reach the login endpoint. Every data read and write requires a short-lived session issued after verification of the personal eight-digit code and, when enabled, an Authenticator OTP. Email remains mandatory on each account, but is not entered at login.

## Code-only login and Authenticator

Personal codes are unique across accounts, including disabled accounts. A peppered HMAC lookup accelerates identification while the independently salted PBKDF2 verifier remains mandatory. Old accounts are checked against their existing verifiers until their lookup is populated on login; no existing code, workspace key or agent credential is changed. Ambiguous legacy codes fail closed and require the administrator to reset one member's code. Code creation and changes reject collisions; a unique database index also handles races. Older clients can still submit an email alongside the code.

Settings → Security offers optional TOTP enrollment with a locally displayed configuration key. The implementation follows [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238): SHA-1, six digits, 30-second periods and one adjacent step of clock tolerance. Setup requires the current personal code, expires after ten minutes and is activated only after a valid OTP. Secrets and pending secrets are encrypted under STORAGE_KEY with dedicated contexts. Each OTP counter is consumed atomically and cannot be reused. Eight random, single-use recovery codes are shown once at activation; only their hashes, encrypted with a separate context, are retained. Activating or disabling OTP revokes the account's other sessions.

Password-only login for an OTP-enabled account returns only `otpRequired`, without a session, identity or workspace key. It does not reset the shared failure count. The second request checks both factors under the existing global attempt lease and throttling. Recovery codes can replace an OTP. Disabling requires the personal code and an OTP or recovery code. An administrator may reset a member's Authenticator, revoking their sessions; the owner uses Security or a recovery code. Password reset preserves the second factor. The frontend prepares invitation/reset emails through the user's mail application; delivery remains manual and no SMTP provider is configured.

## Deployment

Use the Sites workflow with the existing project ID in `.openai/hosting.json`. The manifest provisions D1 (`DB`) and R2 (`BUCKET`). Do not create a second Site or reset production storage. The initial Drizzle migration is schema-only; subsequent schema changes require a new migration.

Configure three independent server-only secrets through Sites environment settings: `AUTH_PEPPER` (32 random bytes, hex), `STORAGE_KEY` (32 random bytes, hex), and `BOOTSTRAP_HASH` (SHA-256 of the one-time activation token). Never commit their values, the activation link, or a Sites access token. Preserve the storage key: replacing it makes existing R2 objects unreadable.

Before first use, only the private activation link can initialize the singleton vault. The browser checks its existing encrypted data against the entered PIN, sets up the server, then uploads the encrypted snapshot. Setup is atomic and cannot overwrite an initialized vault. The activation link is carried in the frontend URL fragment and removed immediately; it is never a public source constant.

The public backend must allow anonymous platform access to avoid requiring ChatGPT sign-in. Application PIN verification and authorization remain mandatory. The frontend CORS origins are explicitly enumerated in `lib/wolfguard/core.mjs`.

## Protection and consistency

`ENTRY_LINK_HASH` is the SHA-256 of the independent random private-link key.
`POST /api/entry` checks it from the Authorization header and returns no vault
data and no PIN session. The private frontend URL must pass this check before
its encrypted startup document is decrypted and the PIN screen appears.
Missing or incorrect links stay closed, including when the verifier is down.
The frontend stays on GitHub Pages at wolfguard.wavetools.fr with its private
`?access=` query. Missing/incorrect keys navigate to the reserved hostname
`site-introuvable.invalid`, producing a real DNS failure and the browser's own
network error. No key, original path or query is forwarded. The initial root
request is still HTTP 200; Pages cannot choose its status based on a private
key. Unknown paths receive 404 then a meta refresh to the same invalid host.
The valid private link and frontend remain on GitHub Pages. The key is absent
from public sources.
Rotate only `ENTRY_LINK_HASH` for a new private link, then redeploy the existing
saved server version; preserve the other secrets and storage bindings.
The backend root does not advertise the frontend.

PIN verification uses a secret pepper, random salt, and PBKDF2-SHA-256 at 100,000 iterations (the production Workers ceiling). Every failed login increments a shared D1 counter and imposes 5 additional seconds of delay. A database lease serializes verification, including concurrent devices. Sessions are opaque random 256-bit values, stored only as SHA-256 hashes in D1, with fifteen-minute idle expiry and an eight-hour maximum lifetime. The browser retains its bearer token in memory and in the current tab's sessionStorage for reload recovery. The workspace key is temporarily stored as a non-extractable CryptoKey in IndexedDB, with an expiry; no PIN or clear workspace content is stored for recovery. Only reloads can resume, using the latest authenticated server snapshot. A fresh navigation, explicit lock, expiry, or server-side revocation requires the PIN again.

The browser uploads its existing AES-256-GCM envelope (PBKDF2 600,000). R2 adds independent server-key AES-256-GCM encryption in authenticated 64 KiB frames. Database metadata contains no document title or vault field. PINs and snapshot bodies are never logged by application code. The server receives the PIN over HTTPS to verify it; this is not a zero-knowledge password protocol.

Immutable R2 uploads commit through a D1 compare-and-swap of the snapshot pointer and version. Concurrent stale writes return 409. Failed uploads leave the committed pointer intact. Previous encrypted R2 objects are retained for recovery. Personal code changes replace only that account verifier and revoke its other sessions; the current tab receives a replacement session. Workspace key and generation remain unchanged. Legacy whole-vault rotation is unavailable once user accounts are enabled.

The frontend preserves an encrypted copy of the original browser workspace and failed changes locally. Export them under Settings > Data. A forgotten PIN has no automatic recovery route. Exported client-only backups remain limited by the entropy of their eight-digit code.

## User accounts

GET /api/status pre-creates the fixed owner account cantin.bruno@gmx.fr for an existing legacy vault, copying only its salted verifier. It does not require, reveal or reset the current code and does not change the encrypted snapshot. Account creation is atomic and idempotent, including concurrent requests. While its workspace key is pending, login already requires the owner username and existing code. The first successful browser sign-in decrypts the current snapshot and automatically submits its derived key to /api/users/initialize; the current code is retained and no setup form is shown. Binding the key atomically enables named users, attaches the current session and revokes other legacy sessions. A competing initialization cannot replace a completed binding. The existing agent generation is preserved. The server encrypts the key with STORAGE_KEY and an independent authenticated context. Personal login then returns it only to the authenticated browser, which imports it as a non-extractable AES key. Raw keys are never saved in browser storage or reload tickets. This is a server-assisted encryption model, not zero knowledge. Preserve STORAGE_KEY.

Usernames are encrypted, with peppered HMAC lookup. Each code has an independent salt and PBKDF2 verifier; no plaintext code is stored. Sessions bind to user ID and code version, checked on every request and again when committing uploads. Disabled/deleted accounts and old code versions cannot reuse existing sessions. Unknown users receive the same error and shared throttling as incorrect codes.

Administrators manage users in Settings, including enable/disable, reset code, disconnect and delete. Only cantin.bruno@gmx.fr can be administrator. Its ID is pinned in vault.owner_user_id, and its email, active status and role are protected. Creating/promoting other administrators is rejected server-side. A one-time runtime migration renames the original earliest administrator, preserves its code and ID, demotes other former administrators and revokes their sessions. Old member identifiers must be changed to valid email addresses by the owner before they can log in. Members can edit the same shared workspace, run scans and use existing agents. The Users and Access tabs are visible but disabled, with keyboard navigation skipping them. The server refuses user, IP-block, pairing and agent-revocation management independently of the interface. Each user can change their own code after verification. Standalone exports use that personal code and re-encrypt retained vault fields for the backup; importing older backups remains supported.

## User-defined codes and invitations

The primary **Inviter par lien** action calls `POST /api/users/invite` without requiring an email. It returns a random 256-bit ticket valid for 24 hours. The recipient supplies their own email and eight-digit code. The separate `user_invitations` table stores only the ticket hash, an opaque management ID and timestamps. Opening or inspecting a link does not consume it. On completion, a D1 transaction inserts a member only while the invitation is valid and deletes the invitation only when that insertion succeeds. Concurrent uses have a single winner, even with different emails. Duplicate emails and the 100-account limit leave the invitation unconsumed; transaction failure rolls back both operations. No invitation can elevate an existing account or create an administrator.

Administrators see pending links in `GET /api/users` and can cancel one with `POST /api/users/revoke-invitation` using its management ID. Tickets and hashes are never returned by listings. The UI shows account totals, email search, status filters and pending invitation cancellation. Issuance limits accounts plus unexpired generic invitations to 100; redemption independently enforces the 100-account limit. Expired invitations are ignored and cleaned up on issuance. These routes require an administrator; anonymous completion also respects IP blocks. No email is sent automatically.

Administrators create members with only an email address. Passing a code to users/create or users/reset-code is rejected. Each creation or reset returns a random 256-bit one-time ticket valid for 24 hours. Only its SHA-256 hash, deadline and credential_pending flag are stored. The admin UI shows a personal link, with the private Pages query preserved and the ticket in the #account fragment, for manual delivery. No email is sent automatically. Tickets are not placed in browser storage or URL queries and are removed from the address bar when the app loads.

The Pages gate accepts only the existing exact private query and an optional canonical #account=<64 lowercase hex> fragment. Entry-key verification still precedes decryption. POST /api/account/inspect checks a valid ticket but returns no workspace or user credentials. POST /api/account/complete also checks the username, enabled state, expiry and eight-digit code, then atomically consumes the ticket and sets the user's verifier. It returns only success; the browser subsequently authenticates normally to open the common base. Expired, disabled, deleted, replaced or already consumed tickets cannot be used. Parallel redemptions have one winner.

Reset immediately increments the account's code version, replaces its verifier with random unusable material, sets credential_pending and revokes its sessions and remote connections. Old codes cannot sign in, and upload commits recheck account validity. The user must define a code through the new personal link before regaining access. Resetting one's own administrator account through this workflow is blocked; the authenticated owner changes its own code in Security. Other current accounts, enrolled agents and the shared encryption key remain intact.

## Access management

Authenticated `GET /api/access` lists all unexpired current-generation web sessions and blocked IPs. Only administrators can manage access or user accounts. Each connection has an independent random public ID; session tokens and token hashes never appear in that response. Connection metadata includes its browser/OS label, first observation, last server activity, and the edge-observed IP. "Online" means a request within the last 90 seconds; each connection includes its named user and role. Legacy sessions remain disconnectable before their next heartbeat, with unknown metadata shown honestly.

`POST /api/access/disconnect` revokes one connection. `POST /api/access/block` accepts an exact IPv4 or IPv6 address, revokes every matching connection, and prevents new PIN logins and authenticated requests from that address. `POST /api/access/unblock` removes a block by its public ID; previously revoked tokens remain invalid. Blocks persist across PIN rotations. Managers cannot block their own current IP, including an IPv4-mapped IPv6 alias. Same-IP peers can still be disconnected separately. Disconnecting or blocking a desktop viewer immediately closes its desktop session and deletes transient images and input. A snapshot upload also rechecks session validity at commit, so revocation during upload cannot modify the shared vault.

Only `CF-Connecting-IP` is accepted as the observed address, with strict canonicalization; user-supplied forwarding headers and the shared cross-zone Worker placeholder are excluded. See [Cloudflare's header contract](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip). If hosting does not supply a usable address, the UI reports an unavailable IP and still permits session disconnection. An IP may be shared by several people behind a router or VPN. IPs and browser labels are encrypted with the existing storage key and separate authenticated contexts; address lookup uses an HMAC with the existing server pepper. The new Drizzle migration only adds `access_connections` and `access_blocks`; existing vault data, keys and storage bindings are preserved.

The browser checks its session every 25 seconds and locks immediately when any authenticated request reports revocation or an IP block. The access tab refreshes every 15 seconds while open. Expired sessions are excluded from its listing. All mutation controls require confirmation, and offline refresh failures retain the last known list with actions disabled.

## Local verification

## Scan agents

The relay also exposes scoped agent routes. An administrator web session creates a random 128-bit pairing code, valid once for five minutes. The Windows, Linux or macOS agent exchanges it for its own random 256-bit token. Enrollment accepts only `win32`, `linux` and `darwin`. All four scan workspaces use the one agent chosen in the dedicated Agents dialog beside Settings; that choice is stored in the existing encrypted workspace settings. Only its SHA-256 hash is stored. The token cannot authenticate to vault routes or create scans. Administrators can revoke an agent. Personal code changes preserve the workspace generation and enrolled agents. Members can select and use existing agents.

The agent makes outbound HTTPS requests only. Jobs contain validated network operations, never shell commands. Public and private unicast addresses are accepted. Active scans resolve a FQDN once and pin one validated address; passive scans read only local cached associations and never issue a DNS query. Network scans require network-scan-v3 agents. Limits: up to 256 addresses, 4096 TCP tests, 32 concurrent tests and a three-minute agent deadline. The passive collector filters local neighbors, DNS/hosts names, existing connections, process ownership and local listening sockets to the requested target. It uses fixed read-only OS commands: PowerShell on Windows, ip/ss (with /proc fallback) on Linux, and arp/ndp/lsof on macOS. Security audits inspect OS-specific local evidence and update caches; inaccessible controls remain not checked. Optional active identification performs bounded banner reads, HTTP HEAD or a validated TLS handshake. Windows DPAPI protects the credential for the current user. POSIX credentials live outside the extracted source in a per-user directory (0700) and file (0600), without OS encryption. Credentials are never part of any downloadable archive.

New D1 tables hold pairings, agent credentials and jobs. Agent names, target specifications and result bodies are AES-GCM encrypted with the existing server storage key and distinct authenticated contexts; no vault snapshot or PIN verifier is changed. This relay encryption is server-side, not end-to-end encryption. Legacy reports in the client's encrypted workspace remain available in Settings → History.

A partial unique index permits one queued/running job per agent. Atomic claims issue a separate execution lease, updates carry increasing revisions, and a 30-second heartbeat deadline marks disconnected jobs lost. A lost job is not replayed. Cancellation prevents later updates from replacing the stopped result. Queued jobs expire after two minutes, results are retained without automatic expiry, and the frontend can load them on another device without an import. Authenticated `GET /api/scans?history=1` pages through all four scan kinds and all agents, including revoked agents and earlier vault generations. Stable `beforeAt` / `beforeId` cursors return up to 50 metadata records per page without decrypting result bodies. Only a current vault session can list or export historical results; agent credentials cannot. Jobs from future generations remain inaccessible. Results already purged under the former seven-day retention cannot be recovered. The existing encrypted job storage and keys are preserved; no data migration is needed.

## Local verification commands

Node 22.13 or newer is required. Follow the Sites starter installation/build instructions. Generate migrations with `npm run db:generate`; apply only unapplied SQL to the local D1 database. Run browser and server tests from the parent WolfGuard GitHub repository. Local and production databases are separate. Test fixtures and synthetic development secrets must never initialize production.

## Interactive remote desktop

The Remote workspace uses the selected agent and a separate, per-browser-session
lease. Windows uses GDI/SendInput and a native background JPEG encoder. The agent tray menu and authenticated viewer provide Stop controls; there is no desktop popup. macOS
uses its screen-capture utility and CoreGraphics input after native privacy
permissions. Linux uses X11/XTest or RemoteDesktop/ScreenCast portals with
PipeWire and GStreamer on Wayland. Linux needs a graphical session and
zenity/kdialog (xmessage is an X11 fallback). Native code dependencies are
version-pinned and SHA-512 checked before extraction; no package install
scripts run. Dependency licenses stay with their downloaded packages.

The relay accepts only bounded screen images and a finite keyboard/pointer
protocol. There is no shell, file-transfer or arbitrary process endpoint.
Images and queued input are encrypted at rest with independent AES-GCM contexts;
HTTPS protects transport. This is server-side encryption, not end-to-end.
The last image replaces its predecessor in R2. Ordered input is acknowledged
and removed, and both are deleted when a session ends. Enrolled Windows agents connect directly after viewer authentication; macOS/Linux privacy permissions still apply. Sharing stops on refusal, the tray sharing Stop, agent
Stop, browser navigation, logout/revocation, stale input or loss of heartbeat.
Viewer and agent heartbeats expire after 15 seconds; input older than four
seconds terminates the session rather than replaying delayed actions. An
unclaimed request expires after 90 seconds; all sessions expire after 20 minutes.
Scans and desktop sessions cannot run concurrently on one agent. These are
administration-oriented image updates, not a video/audio conferencing service.
