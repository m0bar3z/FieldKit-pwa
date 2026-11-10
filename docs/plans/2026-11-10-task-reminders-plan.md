# Task reminders implementation plan

1. Add reminder timestamps to task validation, storage, queries, forms, and the
   shared offline queue while preserving legacy immutable attempts.
2. Add lazy push configuration, validated session/device subscriptions, account
   cleanup, and bounded per-device reminder dispatch with retries.
3. Expose authenticated subscription and scheduler routes; add worker display
   and click handlers without replacing the existing Serwist worker.
4. Add notification controls and task date/time editing, then document keys,
   HTTPS, scheduler startup, supported devices, and demo storage limitations.
5. Test reminder/API/offline/worker behavior and run lint, typecheck, and build;
   exercise the browser where available and report delivery limitations.

Implemented. Validation completed:

- 141 API, auth, note/task sync, reminder dispatch, worker, and scheduler-runner
  tests passed, including 21 reminder tests and three offline reminder regressions.
- Lint, typecheck, production build, and whitespace checks passed. The build was
  also exercised with temporary matching build-time/runtime VAPID configuration.
- Isolated Chrome verified enable/disable using the real subscription API with a
  mocked browser-provider subscription; offline reminder creation and preview;
  exact timestamp syncing after reconnect; synthetic push delivery to the real
  compiled Serwist worker; owner/cross-account routing; and suppression after
  server logout.
- Real push-service transport and OS delivery on the user's device are not
  established by those browser mocks/synthetic events. Follow task-reminders.md
  after configuring a real sender contact, stable keys, and the scheduler.
