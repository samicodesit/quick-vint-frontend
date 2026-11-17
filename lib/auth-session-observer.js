(function (root) {
  "use strict";
  const supported = new Set(["token_refresh_failed", "token_refresh_expired", "token_refresh_success", "auth_success"]);
  function firstFailureFacts(input, info, observedAt) {
    const facts = { firstFailureObservedAt: new Date(observedAt).toISOString() };
    for (const [key, value] of Object.entries({
      firstFailureClientId: info?.clientId, firstFailureVersion: info?.version,
      firstFailureEvent: input.event, firstFailureErrorCode: input.errorCode,
      firstFailureErrorName: input.errorName, firstFailurePhase: input.phase,
    })) if (typeof value === "string") facts[key] = value.slice(0, 120);
    if (Number.isFinite(input.statusCode)) facts.firstFailureStatusCode = Math.max(0, Math.min(input.statusCode, 999));
    if (typeof input.navigatorOnline === "boolean") facts.firstFailureOnline = input.navigatorOnline;
    return facts;
  }
  function createObserver({ load, save, emit, emitOriginal, clientInfo = async () => ({}), now = Date.now, makeId = () => root.crypto.randomUUID() }) {
    let pending = Promise.resolve();
    async function deliver(record, owner) {
      if (record?.owner !== owner || !record.outcome) return;
      let originalQueued = !record.original;
      if (record.original && emitOriginal) {
        try { originalQueued = (await emitOriginal(record.original, owner, record.outcome.id))?.queued === true; }
        catch { /* An unavailable original must not prevent the outcome. */ }
      }
      // Admission pins the original in the existing capped queue until ACK.
      // Do not hold the episode marker while its transport backs off: that
      // would hide a later failure/renewal episode on the same client.
      if ((await emit(record.outcome, owner))?.queued && originalQueued) await save(null);
    }
    function run(work) {
      pending = pending.then(work).catch(() => {});
      return pending;
    }
    return {
      drain: () => pending,
      resume: owner => run(async () => {
        const record = await load();
        if (record && now() - record.startedAt >= 86400000) return save(null);
        await deliver(record, owner);
      }),
      observe(event, owner) {
        if (!owner || !supported.has(event?.event)) return Promise.resolve();
        // Copy only bounded diagnostic metadata. Never retain session objects.
        const input = { event: event.event, id: event.id, occurredAt: event.occurredAt,
          extensionVersion: event.extensionVersion, source: event.source, operationId: event.context?.operationId,
          entryPoint: event.context?.entryPoint, reason: event.context?.reason,
          errorCode: event.context?.errorCode, errorName: event.context?.errorName,
          statusCode: event.context?.statusCode, phase: event.context?.phase,
          navigatorOnline: event.context?.navigatorOnline };
        const occurredAt = now();
        return run(async () => {
          let record = await load();
          if (record && occurredAt - record.startedAt >= 86400000) {
            await save(null); record = null;
          }
          if (record?.outcome) {
            await deliver(record, owner);
            record = await load();
            if (record?.outcome) return;
          }
          if (input.event === "token_refresh_failed" || input.event === "token_refresh_expired") {
            if (!input.operationId) return;
            if (!record || record.owner !== owner) {
              let info;
              try { info = await clientInfo(); } catch { /* Optional metadata cannot discard the observation. */ }
              record = { owner, operationId: input.operationId,
                entryPoint: input.entryPoint || "unspecified", startedAt: occurredAt, attempt: 0, signInRequired: false,
                firstFailure: firstFailureFacts(input, info, occurredAt) };
              // One minimal original survives queue pressure until acknowledged.
              // Keep its actual transport identity and occurrence time. Legacy
              // markers without a real event ID cannot reconstruct an original.
              if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.id || "") &&
                  input.source === "extension_background" && Number.isFinite(Date.parse(input.occurredAt))) {
                const context = { operationId: record.operationId, entryPoint: record.entryPoint };
                for (const key of ["errorCode", "errorName", "phase"])
                  if (typeof input[key] === "string") context[key] = input[key].slice(0, 120);
                if (Number.isFinite(input.statusCode)) context.statusCode = Math.max(0, Math.min(input.statusCode, 999));
                if (typeof input.navigatorOnline === "boolean") context.navigatorOnline = input.navigatorOnline;
                record.original = { id: input.id, event: input.event, occurredAt: input.occurredAt,
                  source: input.source, extensionVersion: String(input.extensionVersion || info?.version || "unknown").slice(0, 80), context };
              }
            }
            if (record.lastEventId !== input.id) record.attempt++;
            record.lastEventId = input.id;
            record.signInRequired ||= input.event === "token_refresh_expired";
            await save(record);
            return;
          }
          if (!record || record.owner !== owner) return;
          record.outcome = { id: makeId(), occurredAt: new Date(occurredAt).toISOString(), context: {
            operationId: record.operationId, authRefreshOperationId: input.event === "token_refresh_success" ? input.operationId : undefined,
            entryPoint: record.entryPoint, resultStatus: input.event === "auth_success" ? "signed_in" : "silent_renewed",
            // Backend recovery matching uses the event kind, not the sign-in route.
            reason: input.event === "auth_success" ? "auth_success" : input.reason || input.event,
            attempt: record.attempt,
            elapsedMs: Math.max(0, occurredAt - record.startedAt), signInRequired: record.signInRequired,
            ...record.firstFailure,
          } };
          await save(record);
          await deliver(record, owner);
        });
      },
    };
  }
  root.AutoListerAuthSessions = { createObserver };
  if (typeof module === "object") module.exports = { createObserver };
})(globalThis);
