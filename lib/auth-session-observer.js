(function (root) {
  "use strict";
  const supported = new Set(["token_refresh_failed", "token_refresh_expired", "token_refresh_success", "auth_success"]);
  function createObserver({ load, save, emit, now = Date.now, makeId = () => root.crypto.randomUUID() }) {
    let pending = Promise.resolve();
    async function deliver(record, owner) {
      if (record?.owner !== owner || !record.outcome) return;
      if ((await emit(record.outcome, owner))?.queued) await save(null);
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
        const input = { event: event.event, id: event.id, operationId: event.context?.operationId,
          entryPoint: event.context?.entryPoint, reason: event.context?.reason };
        const occurredAt = now();
        return run(async () => {
          let record = await load();
          if (record && occurredAt - record.startedAt >= 86400000) {
            await save(null); record = null;
          }
          if (record?.outcome) {
            await deliver(record, owner);
            return;
          }
          if (input.event === "token_refresh_failed" || input.event === "token_refresh_expired") {
            if (!input.operationId) return;
            if (!record || record.owner !== owner) record = { owner, operationId: input.operationId,
              entryPoint: input.entryPoint || "unspecified", startedAt: occurredAt, attempt: 0, signInRequired: false };
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
            reason: input.reason || input.event, attempt: record.attempt,
            elapsedMs: Math.max(0, occurredAt - record.startedAt), signInRequired: record.signInRequired,
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
