---
"@convex-dev/r2": minor
---

Use Convex built-in pagination for `listMetadata`, forward `endCursor` and read
limits through the public API, and return the registered component API from the
test helper. Built-in pagination uses opaque cursors instead of the prior
paginator cursor format, so clients must discard cursors held across the
upgrade. A query that already paginated cannot call `listMetadata` in the same
query; mutations are unaffected.
