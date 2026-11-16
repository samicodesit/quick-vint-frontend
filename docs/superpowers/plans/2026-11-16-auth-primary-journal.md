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
accepted original. Admission protects that original inside the existing bounded
queue until acknowledgment. Duplicate/routine pressure cannot evict it; the
original still obeys the same age and capacity caps, and customer reports retain
priority. The protection flag is local queue metadata, never a request field.
No retry deadline or backoff is reset by protecting an existing entry.

Clear the observation marker after protected admission and durable outcome
admission. Holding this marker until acknowledgment was reproduced as hiding a
later auth episode, so that candidate was corrected before release. The queue
retains the older original independently while later failures and renewals are
observed normally. Failed original admission still keeps the bounded journal;
failure to replay must not prevent queuing the outcome.
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
- Repeated real-worker browser coverage for two auth episodes while older
  originals remain unacknowledged. Protected entries survive worker restart.
- The extension transport alone uses the optional protection flag. Website
  producers and their deployed queue stay unchanged; no server update is needed.
- Relevant auth and telemetry browser journeys, full unit/E2E and production build.
- Inline combined-diff review because the owner prohibits delegated reviewers.
- Actual Store state first, standard production push and upload/submit pipeline.
  Never replace an existing pending package. Inspect the packaged artifact and
  actual Store delivery; publication is separate from natural customer evidence.
