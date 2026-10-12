# TURBO OS Portal — production architecture

## Stack
- Frontend: migrate this responsive prototype to Next.js or similar.
- Auth/database: Supabase Auth + PostgreSQL + Row Level Security, or a custom API.
- Files: public storage/CDN for FREE; private object storage for PLUS.
- Telegram: bot token stored only as a server secret; notify admins when a support ticket or PLUS request is created.
- Admin: server-verified admin role, MFA recommended, audit log.

## Routes
`/`, `/devices`, `/free`, `/plus`, `/updates`, `/posts/:slug`, `/support`, `/account`, `/admin`.

## Suggested tables
- `profiles(id, display_name, email, locale, created_at)`
- `user_roles(user_id, role)`
- `posts(id, slug, title_ru, title_en, summary_ru, summary_en, body_ru, body_en, channel, status, published_at, created_by)`
- `devices(id, name, kind, codename, notes, active)`
- `builds(id, device_id, version, android_version, channel, storage_key, checksum_sha256, published_at, status)`
- `plus_access_requests(id, user_id, status, reviewed_by, reviewed_at, admin_note)`
- `support_tickets(id, user_id, subject, status, created_at, updated_at)`
- `support_messages(id, ticket_id, sender_id, body, created_at)`
- `audit_log(id, actor_id, action, target_type, target_id, created_at)`

## Security rules
1. Never trust a client-side PLUS flag. Check approved access on every PLUS API request and every download.
2. PLUS posts and private files must be denied to non-approved users by database/storage policies.
3. Only admins can approve access, publish posts, edit builds, change roles or close tickets.
4. Users can read/write only their own tickets; admins can access the support queue.
5. Store Telegram tokens, service-role keys and signing secrets only on the server.
6. Validate uploads, calculate SHA-256, limit sizes, back up data and rate-limit forms.

## Telegram support flow
1. Ticket and first message are saved to the database.
2. Backend sends Telegram notification to admin chat with ticket ID and admin URL.
3. Admin replies in site panel; reply is saved in same thread.
4. Backend notifies the user by email or optional Telegram flow.
5. Full message history remains on the website.

## Manual PLUS approval
User submits request -> status pending -> admin gets Telegram alert -> admin approves/denies -> backend updates access and audit log -> private download endpoint checks access and issues a short-lived signed URL.
