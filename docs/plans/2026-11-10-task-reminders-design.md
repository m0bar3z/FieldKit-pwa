# Task reminder push notifications

Status: approved by the user and implemented. Deployment still requires sender
configuration and a running scheduler; real push-provider/device delivery must be
verified with deployment credentials.

Builder review: a fresh software-engineering reviewer found no important open
questions before implementation planning.

## Intent and scope

Implement the previously proposed Web Push approach for task reminders only.
An account can enable notifications on a browser/device and set, change, or remove
one reminder time on a task. At that time, the server submits a reminder to the
account's enabled devices. Clicking it opens that task. Notes, due-date alerts,
overdue summaries, recurring reminders, and arbitrary notification broadcasts are
outside this change. No automatic permission prompt or new packages are needed.

## Approaches

The user selected Web Push with subscription controls, VAPID configuration,
service-worker display/click handlers, and server scheduling in the preceding
conversation. Use authenticated Route Handlers to fit the existing application,
rather than adding a second Server Action transport. Extend the existing Serwist
worker; never register a competing worker from the Next.js example.

A browser timer would require the app to remain open and cannot satisfy closed-app
delivery. Adding a database and hosted queue would be a broader persistence
project because all existing tasks and accounts use a process-local demo store.

My call: keep the current demo storage model, add an authenticated dispatch endpoint
and a local scheduler runner, and document a persistent database plus durable
job scheduling as production requirements. This implementation is functional on
one running Node.js server; it does not claim durability across restarts or
multiple server processes. A runner calling the endpoint uses the same server's
store, rather than importing an independent copy into another process.

## User controls

- Add a Task reminders dialog accessible from the signed-in app header, using
  existing shadcn components. It shows this device's subscription state and has
  Enable and Disable controls. Permission is requested only by clicking Enable.
- Unsupported browser, insecure context, missing server configuration, denied
  permission, offline state, and server errors have actionable messages. On iOS,
  explain Home Screen installation, reusing existing installation guidance.
- The browser reads its subscription from the existing root-scoped Serwist
  registration. Account-aware state is checked against the server; browser
  permission alone does not mean the account is subscribed. Controls recover
  from partial registration/unsubscription failures without reporting success.
- Add an optional local date/time field to task creation and editing. Empty means
  no reminder. Store an absolute Unix timestamp in milliseconds and display it in
  the user's existing time zone. Do not infer a reminder from a due date.
- New or explicitly changed reminder times must be in the future at the point of
  user selection. An unchanged past time may remain when editing task text.
  The API accepts otherwise-valid past timestamps so delayed offline uploads work.
- Explain that a reminder saved offline is scheduled once its task changes sync;
  edits, completion, or deletion made offline cannot cancel a server reminder
  until those changes reach the server.

## Task model and offline integration

Add optional `reminderAt` to task API input, allowing `number | null`; persist a
normalized `number | null` on TaskRecord. Missing creation input defaults to null;
omitted reminder fields in legacy update payloads preserve the server's value.
New editors always submit the selected timestamp or explicit null.

Carry the value through task form defaults, local creation, shared queue payloads,
immutable upload attempts, acknowledgements, overlays, server query responses,
and previews. Do not change note schemas or note behavior. Existing IndexedDB
version-6 records and pending legacy attempts remain valid; missing values are
interpreted using their baseline/default, without mutating persisted attempt
payloads or their idempotency fingerprints. Keep the current task/note sync engine.

Changing or removing reminderAt invalidates its previous delivery state.
Completing/deleting a task suppresses delivery. Reopening a task does not repeat
an already delivered reminder; choosing a new reminder time schedules a new one.
Text edits alone do not resend a delivered reminder.

## Subscriptions and account ownership

Add authenticated, same-origin-checked, uncached endpoints to inspect/register/
remove the current browser's subscription, using existing expected-account
headers. Store subscription endpoint, encryption keys, account ID, session
fingerprint, session expiry, and device identity in a server-only process-local
repository. Support multiple devices per account and one active account binding
per browser subscription. Do not return other endpoints or private keys to clients.

Validate endpoint URLs, encryption keys, lengths, and subscription expiry.
Permit only HTTPS endpoints for supported browser push providers; reject
credentials, unusual ports, and local/private destinations. Do not allow arbitrary
URLs to turn the sender into a server-side HTTP proxy. The endpoint/key pair is
treated as sensitive and never logged.

Bind registration to the current session, with an opaque browser-generated device
secret for ownership of endpoint replacement/removal. Registration by a different
account requires explicit Enable; merely opening another account does not transfer
the subscription. Same-device concurrent changes are serialized and requests
carry the expected account. Disable only affects the selected browser/device.

On successful logout or replacement login, remove bindings for the outgoing
session before changing cookies. Client cleanup unsubscribes that browser and
closes displayed FieldKit notifications. Never unsubscribe other devices.
Expired sessions are ineligible for dispatch. Permission revocation is reconciled
on the next visit; expired endpoints are also removed when the push provider
responds 404/410. Logout cannot retract an already accepted/in-flight push, so
worker display/click logic must tolerate stale account data.

## Dispatch and scheduling

- Add a Node.js POST endpoint `/api/internal/task-reminders`, authenticated using
  a constant-time check of `Authorization: Bearer <TASK_REMINDER_CRON_SECRET>`.
  Missing configuration fails closed. Do not use a user's cookie as scheduler
  authorization, and do not cache responses.
- Each call selects due, incomplete, non-deleted tasks and matching active device
  bindings. Send through `web-push` with bounded concurrency, payload sizes,
  timeouts, and TTL. Recheck reminder identity, completion, deletion, and device
  binding immediately before sending each notification.
- Track delivery per task/reminder timestamp/device. Claim work before awaiting
  the provider, suppress overlap within this process, mark accepted sends, and
  retry transient failures with bounded backoff. Failed devices do not block
  successful devices, and a retry does not resend to a device already accepted.
  A task with no enabled devices remains eligible until its reminder expires.
- My call: a reminder expires 24 hours after its chosen time; this permits delayed
  offline sync and temporary provider outages without delivering very old alerts.
  New devices do not receive reminders already completed for all devices that
  were eligible when dispatch began. Zero-device work remains pending until expiry.
- Remove expired/invalid 404/410 subscriptions. Retain retryable work for later
  dispatch, honoring Retry-After where provided. Invalid configuration is reported
  as unavailable without discarding reminders.
- Provide `pnpm reminders:run` as a long-running local runner that calls the
  endpoint immediately and then about once per minute, with no overlapping calls,
  timeouts, shutdown handling, and no secret logging. It must run alongside the
  Next.js server; a deployed scheduler can call the same endpoint every minute.
- Delivery time depends on scheduler cadence, connectivity, browser/OS behavior,
  and provider acceptance. Provider acceptance is not proof of display, and
  exactly-once display cannot be guaranteed after a lost provider response.

## Service worker

Extend `src/app/sw.ts` with typed, validated task-reminder push and notification
click handlers. Keep offline caches and shared Background Sync intact. Use
existing icon assets, a stable task/reminder notification tag, and a validated
task UUID rather than trusting an arbitrary payload URL.

Before showing private task text, verify the active account. If unavailable,
use generic FieldKit task-reminder wording without task title/content. Suppress
messages known to belong to a different/signed-out account. Clicks focus/navigate
an existing same-origin window or open the task route. A different account goes
through sign-in/account guidance and cannot open another account's task content.
Malformed/empty payloads and unavailable windows must not crash unrelated worker
features. No external navigation targets are accepted.

## Configuration and setup

Add documented placeholders in `.env.example` for
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`TASK_REMINDER_CRON_SECRET`, and the runner's application origin. Use the installed
web-push CLI to generate keys; do not install it globally or commit generated keys.
Validate configuration lazily so builds and unrelated features work without push
credentials. Expose only safe configuration status and the public key to the UI.

Document HTTPS, outbound push-provider access, notification permissions, iOS Home
Screen installation, build-time public-key configuration, scheduler startup, key
rotation requiring resubscription, and the single-process demo restriction.
Review security/cache headers for the actual `/serwist/sw.js` path, keeping the
existing worker scope and update handling.

## Validation

Add tests for configuration failure, subscription validation and ownership,
logout/login/expiry, reminder UTC conversion, legacy omitted fields, offline
creation/edit/completion/delete preservation, and immutable attempt retries.
Exercise due selection, reminder replacement/removal, completed/deleted tasks,
per-device delivery/retry, expired endpoints, concurrent dispatch, and authorized
scheduler calls using a mocked push transport. Test worker payload validation,
same-origin click routing, and account-safe display. Run existing sync/API/auth
tests plus lint, typecheck, and build.

Use an isolated browser for actual controls and worker integration where possible.
Real encrypted delivery depends on configured keys, browser permission, and an
accessible push service; report separately which real-device checks passed and
which require the user's browser/device rather than claiming mock tests establish
end-to-end OS notification delivery.
