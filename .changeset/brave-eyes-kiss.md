---
"@farfetched/core": patch
---

Fix retry operator to not retry abort errors from concurrency policies. Previously, when using `concurrency` with `TAKE_LATEST` strategy alongside `retry`, abort errors could leak through the retry mechanism, causing unnecessary retry attempts for intentionally cancelled requests. Now abort errors are automatically filtered out before retry logic is applied.
