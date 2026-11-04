# Shared product sync implementation plan

1. Introduce typed task/note change and attempt contracts, common merge helpers,
   and a version-6 migration preserving saved records and uncertain note attempts.
2. Generalize mutation receipts for both API resource kinds and add note
   create/update/delete request schemas without changing existing responses.
3. Implement the shared repository, queue processor, locking, retry lifecycle,
   worker entry point, and legacy background-tag compatibility. Route task APIs
   through thin adapters and remove duplicated processors.
4. Route note saves/deletions through the same system. Add local edit/delete
   controls, stable preview identity, alias handling, and pending-deletion feedback.
5. Adapt existing regression tests, add migration and cross-kind concurrency
   coverage, run lint/typecheck/build, and exercise real offline browser flows.
   Update feature documentation and report actual validation results.

Implemented with one shared processor/runtime/worker, typed product adapters,
version-6 migration, note API mutation receipts, and local note controls.
Validation includes 108 task/note/shared/API tests, lint, typecheck, production
build, and isolated Chrome flows using real version-5 IndexedDB fixtures and
offline create/read/edit/delete/reload/reconnect behavior for notes, plus task
completion/timestamp regression checks. The server remains process-local demo storage.
