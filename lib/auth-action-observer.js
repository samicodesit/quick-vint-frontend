(function (root) {
  "use strict";
  function createObserver({ track, makeId = () => root.crypto.randomUUID(), getOwner, now = Date.now }) {
    const records = new Map();
    const noop = { operationId: undefined, observe() {}, finish() {} };
    const sameScope = (a, b) => Array.isArray(a) && Array.isArray(b)
      ? a.length === b.length && a.every((value, index) => value === b[index]) : a === b;
    return {
      clear() { records.clear(); },
      begin({ entryPoint, scope, generationAttemptId }) {
        try {
          const owner = getOwner() || null;
          const previous = records.get(entryPoint);
          const matching = owner && previous?.owner === owner && previous.blocked &&
            now() - previous.createdAt < 15 * 60 * 1000 && sameScope(previous.scope, scope);
          const record = matching ? previous : {
            owner, scope, operationId: makeId(), createdAt: now(), attempt: 0, blocked: false,
          };
          record.attempt++;
          records.set(entryPoint, record);
          const attempt = record.attempt;
          let finished = false;
          return {
            operationId: record.operationId,
            observe(response) {
              if (typeof response?.authRefreshOperationId === "string") record.refreshOperationId = response.authRefreshOperationId;
            },
            finish(resultStatus, details = {}) {
              try {
                if (finished || records.get(entryPoint) !== record || record.attempt !== attempt ||
                    (getOwner() || null) !== owner) return;
                finished = true;
                const recovered = resultStatus === "succeeded" && record.blocked;
                if (record.refreshOperationId || resultStatus === "blocked" || recovered) {
                  track("auth_action_result", {
                    ...details, operationId: record.operationId,
                    generationAttemptId: details.generationAttemptId || generationAttemptId,
                    authRefreshOperationId: record.refreshOperationId, entryPoint, attempt,
                    resultStatus: recovered ? "recovered" : resultStatus,
                  }, owner);
                }
                if (resultStatus === "blocked") record.blocked = true;
                if (resultStatus === "succeeded") records.delete(entryPoint);
              } catch { /* Observation must never change the action result. */ }
            },
          };
        } catch { return noop; }
      },
    };
  }
  root.AutoListerAuthActions = { createObserver };
  if (typeof module === "object") module.exports = { createObserver };
})(globalThis);
