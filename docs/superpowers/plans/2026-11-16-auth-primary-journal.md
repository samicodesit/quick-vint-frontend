# Preserve the first auth diagnostic through queue pressure

## Confirmed defect

The released 1.4.39 queue deliberately evicts older duplicate refresh failures
under its 200-event or 512 KiB cap. The independent session observer retains the
first failed operation but does not retain its actual transport event. A later
renewal can therefore reference an original that the queue discarded. Reproduced
in the loaded MV3 extension with controlled offline collector pressure and a
real worker restart. The regression fails on b2bf081.

Two historical original records have arrived late, after 5h12m and 14h19m.
Two others lack original receipts. Their outcomes establish offline fetch errors
and silent renewal on the same desktop Chrome clients. The customers' original
queue dispositions are unavailable, so the controlled capacity cause must not be
represented as proof of either historical client's loss mechanism.

## Small correction

Prepare refresh failures once. The normal queue and observer use the same real
UUID and occurrence time. The existing single-owner, 24-hour observation marker
also keeps a minimal original: ID, event, source, version, operation, entry point,
finite failure metadata and online flag. No tokens, messages, stack, breadcrumbs,
images or listing contents are copied into this journal.

After attributable same-owner renewal, replay that original through the existing
authenticated queue using the same ID. Collector deduplication handles an already
accepted original. Keep the journal until the original is acknowledged and the
outcome is durably queued. Failure to replay must not prevent queuing the outcome.
Worker startup resumes the journal; expiry and owner checks still apply. Old
markers without a transport UUID cannot manufacture historical originals.
Authentication, refresh retries, generation, photos and credits stay independent
of this asynchronous diagnostic work. No new permissions or database migration.

## Acceptance

- Causal loaded-extension regression, three repetitions, including native worker
  restart, original queue eviction, exact-ID/time replay, unchanged photos and no
  Generate request. Controlled external services only.
- Unit coverage for acknowledgment versus admission, retry identity, restart,
  owner isolation, expiry, legacy markers, storage/transport failures and bounds.
- Relevant auth and telemetry browser journeys, full unit/E2E and production build.
- Inline combined-diff review because the owner prohibits delegated reviewers.
- Actual Store state first, standard production push and upload/submit pipeline.
  Never replace an existing pending package. Inspect the packaged artifact and
  actual Store delivery; publication is separate from natural customer evidence.
