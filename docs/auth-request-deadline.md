# Authentication request deadline

The background Supabase client uses a 20-second deadline for requests to its
own `/auth/v1/` endpoints, covering both response headers and body. The deadline
aborts the actual fetch; it does not leave an abandoned request running behind
a Promise race. Caller cancellation is forwarded and listeners/timers are
removed after completion. REST, storage, photo, generation and other product
requests retain their existing transport and timing.

Session restoration errors previously returned by the SDK were ignored before
three additional refresh calls. Restoration now records a terminal failure and
returns without those extra calls. A transient failure retains the stored
session. A confirmed invalid refresh token keeps the existing sign-out behavior
and remembered account email. Outer refresh retries after successful restoration
retain their existing limit and backoff.

Regression checks execute the packaged Supabase SDK inside a Chromium extension
worker. A pending auth request aborts at the real deadline, the SDK returns
AuthRetryableFetchError status zero, and a subsequent request succeeds. A second
check exercises the actual background refresh flow and proves a failure in
restore_session, no extra refresh calls and no stored-session loss. Unit checks
cover stalled response bodies, caller cancellation, response preservation,
unmodified product requests and confirmed auth expiry. Full extension integration
and production packaging gates remain mandatory before submission.

This correction addresses a reproduced unbounded request and ignored SDK error.
It does not establish the provider/network cause of historical incomplete refresh
trails, recover discarded 1.4.10 diagnostics, or prove historical listing impact.
