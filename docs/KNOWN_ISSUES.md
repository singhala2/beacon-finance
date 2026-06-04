# Known Issues

Bugs and rough edges we've identified but not yet fixed. Each entry should name the symptom, where it surfaces, the current diagnosis, and any known workaround.

Add a new entry as a new `##` section. Move to a `## Resolved` heading (with the commit hash that fixed it) instead of deleting, so future debugging has the history.

---

## Plaid Link refresh race after Connect institution

**Surface:** `/settings/integrations` → "+ Connect another institution" → complete the Sandbox flow → expected the list to refresh with the new institution; sometimes it does not.

**Diagnosis (suspected):** `PlaidLinkButton` awaits `/api/plaid/exchange` and calls our `onSuccess` after it resolves, which now triggers `window.location.reload()`. The exchange route does extra work after persisting the `PlaidItem` (fetches balances, optionally fetches holdings, runs an initial `syncTransactionsForUser`), so the response can take a few seconds. If anything in that chain throws (e.g., the encryption key bug fixed in `<hash>`), the route returns 500 with an empty body, the client's `await res.json()` throws `SyntaxError: Unexpected end of JSON input`, `onSuccess` never runs, and the page never reloads. The institution may still be partially persisted depending on where the throw happened.

**Workaround:** manually reload `/settings/integrations` after a connect attempt and check whether the new institution appears. If it does, the exchange succeeded but the response failed; if it doesn't, the exchange itself failed — check the dev server log for the actual error.

**Fix-when:** part of Phase 7's polish pass or sooner if it keeps biting. Real fix is: (a) make the exchange route never throw past the `PlaidItem` upsert (wrap subsequent work in try/catch and still return ok), and (b) make `PlaidLinkButton` show the real error to the user instead of swallowing it as a silent non-refresh.

---
