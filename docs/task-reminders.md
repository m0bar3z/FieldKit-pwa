# Task reminder push notifications

FieldKit sends Web Push notifications for the optional reminder time on a task.
It does not send due-date alerts, overdue summaries, or note notifications.

## Configure the server

The existing `web-push` dependency provides key generation. No global install or
additional packages are needed:

```sh
pnpm exec web-push generate-vapid-keys
openssl rand -hex 32
```

Put the generated values in the ignored `.env.local` file:

```dotenv
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key from web-push>
VAPID_PRIVATE_KEY=<matching private key from web-push>
VAPID_SUBJECT=mailto:your-real-contact@example.com
TASK_REMINDER_CRON_SECRET=<independently generated random secret>
TASK_REMINDER_ORIGIN=https://your-fieldkit-host.example
```

Keep the private key and scheduler secret server-only. Configure the public key
before building; changing it requires a rebuild and device resubscription. Keep
the key pair stable between restarts. A real HTTPS contact URL can be used instead
of a mailto address. Missing or invalid configuration disables notification
registration without preventing normal tasks, notes, or builds from working.

## Run and enable reminders

Serve FieldKit over HTTPS. For development, use `pnpm dev --experimental-https`;
`http://localhost` is also a secure-context exception in supporting browsers.
For a production build run `pnpm build`, then `pnpm start`.

In a separate terminal alongside the same running server:

```sh
pnpm reminders:run
```

The runner reads Next.js environment files and calls
`POST /api/internal/task-reminders` immediately and about once per minute. It
handles shutdown signals and avoids overlapping calls. Set `NODE_ENV=production`
when the runner should read production environment files. For local testing,
`TASK_REMINDER_ORIGIN` defaults to `http://localhost:3000`; it must match your
server's port and protocol. With local HTTPS, trust the local certificate; do not
disable TLS verification. Ensure the Node process can reach browser push services
over HTTPS. The library does not automatically use every system proxy setting.

A hosted scheduler can call that same endpoint every minute with
`Authorization: Bearer <TASK_REMINDER_CRON_SECRET>`. Never place the secret in a
URL. Session cookies do not authorize dispatch. An external scheduler must reach
the same Node.js process that holds the demo tasks.

Open the bell button in the app header and choose **Enable reminders**. The
browser prompts for permission only after that click. On iOS/iPadOS, use a
supporting version (16.4+) and open FieldKit after adding it to the Home Screen;
the existing installation guide explains how. Browser and operating-system
notification settings must both allow notifications.

Create or edit a task and choose a future reminder date/time. The field uses the
device's local time and stores an absolute timestamp; the task detail shows it
in the current display time zone. Clear the field to remove the reminder.
Completing or deleting the task prevents future submissions. Changing the time
schedules a new reminder; text edits and reopening a completed task do not replay
an already accepted reminder. The bell's **Disable reminders** affects only this
browser/device. Sign-out or a replacement login removes the outgoing session's
device registrations. A new login must explicitly enable reminders again.

## Offline and delivery behavior

Reminder changes use the existing task/note IndexedDB queue. Offline creation,
editing, completion, and deletion remain supported. A reminder reaches the server
only after synchronization. Until then, a server may still send the previously
saved reminder. A late upload can deliver within 24 hours of the selected time;
older reminders expire. No enabled devices means the task waits within that window.
The set of eligible devices is fixed when dispatch first finds enabled devices;
newly enabled devices do not replay historical reminders.

The dispatcher submits to each eligible device independently, keeps accepted
device deliveries, backs off failed deliveries, and removes provider endpoints
returning 404/410. Duplicate concurrent calls are suppressed in the current
process. A provider accepting the message does not guarantee immediate display;
offline devices, OS settings, and browser scheduling can delay or suppress it.
Messages expire with their delivery window/session, and lost provider responses
can still lead to a duplicate attempt. Stable notification tags reduce duplicate
visible alerts. A task cannot retract a push already accepted by the provider.

The existing Serwist worker receives push messages and opens an account-checking
task destination when clicked. It verifies the active account before displaying
task text; if the server cannot be reached, it uses generic text without cached
private content. Known signed-out/different-account messages are suppressed.
Changing accounts cannot expose another account's task through a notification.
The worker retains the existing offline caches and shared Background Sync.

## Demo storage and production requirements

Tasks, subscriptions, and delivery receipts live in memory in one Node.js
process. Restarting it clears them. Multiple instances/serverless processes have
independent stores. This setup is for the existing single-process demo; merely
deploying a scheduler does not make its storage persistent.

Production requires a shared persistent database for tasks, per-device
subscriptions, and delivery receipts, plus a durable scheduler/queue with atomic
claims across processes. Keep subscription encryption keys private, monitor
delivery failures, configure HTTPS and outbound provider connectivity, and use a
stable VAPID identity. Replace the demo account/session system as appropriate.

## Verification

```sh
pnpm test:reminders
pnpm test:product-sync
pnpm test:products
pnpm test:auth
pnpm lint
pnpm typecheck
pnpm build
```

For a real-device check, configure keys, run the server and scheduler, enable
reminders in a browser, choose a task time a few minutes ahead, and close the tab.
Verify receipt and click navigation, then test cancellation, sign-out, a second
device, and denied permission. Automated transport mocks verify application
logic but cannot prove encrypted provider-to-OS delivery on your device.
