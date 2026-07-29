# Module 14 — DECISIONS.md

## (a) Forced by the spec

- **Every DOCTYPE parse error before a complete, validly-quoted identifier
  sets `forceQuirks = true`** — missing name, missing quote, unrecognized
  keyword after the name, missing whitespace, all of it. A malformed
  DOCTYPE this early is treated as strong evidence the document itself
  doesn't reliably declare its own document type, and quirks-mode
  rendering exists specifically to handle documents that can't be trusted
  to follow modern rules.
- **The one exception: trailing garbage *after* a complete system
  identifier does NOT force quirks.** Verified directly, and independently
  re-verified by deliberately breaking exactly this rule and confirming
  precisely one test catches it, in both languages. By this point the
  DOCTYPE already told the parser everything it needs (name, public ID,
  system ID) — one stray token before `>` is noise, not evidence of a
  broken document type declaration.
- **A missing system identifier when only `PUBLIC` was used (no
  `SYSTEM`) is completely normal, not an error** — `publicIdentifier` gets
  a real string, `systemIdentifier` stays `null` ("missing," from Module
  1's original distinction), and `forceQuirks` stays `false`. This is
  exactly the historically common `<!DOCTYPE html PUBLIC "...">`-only form
  many real DTDs used.
- **`PUBLIC` and `SYSTEM` match case-insensitively**, consistent with
  `DOCTYPE` itself (Module 12) — but note `matchCaseInsensitive` requires
  backing up the input position by one first, since (unlike Module 12's
  markup-declaration-open state) this state has to consume a character
  first to rule out the simpler cases (whitespace, `>`, EOF) before it
  knows a 6-character lookahead is even needed.

## (b) Forced by an external contract

- **`DoctypeToken`'s four fields, and the null-vs-empty-string distinction
  for its identifiers, needed zero changes from Module 1.** This module is
  the first to actually exercise that four-modules-old design decision at
  scale, across sixteen states, and it held up completely unmodified.

## (c) Our convention

- **Three shared helpers, twelve states written directly** — the same
  balance Module 13 struck for comments, for the same reason: the states
  that really are identical (`doctypeIdentifierQuotedState`'s four
  callers, every EOF branch) get a shared helper; the states that only
  *look* similar (the six "before/after keyword/identifier" states) stay
  separate, because their real differences (which state whitespace leads
  to, which specific parse error fires, whether a value starts empty or
  stays missing) are exactly the details worth keeping visible.
- **Java's `doctypeIdentifierQuotedState` takes a `boolean isPublic`**
  rather than a field-name string, since Java has no lightweight
  dynamic-property-access equivalent to JS's `obj[fieldName]` — a genuine,
  language-forced difference in how the same sharing decision gets
  expressed.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Malformed DOCTYPE (before a complete identifier) forces quirks | (a) forced by spec |
| 2 | Trailing garbage AFTER a complete system identifier does NOT force quirks | (a) forced by spec — verified exception |
| 3 | `PUBLIC`-only doctypes are normal, not an error | (a) forced by spec |
| 4 | `PUBLIC`/`SYSTEM` match case-insensitively, via consume-then-back-up lookahead | (a) forced by spec |
| 5 | Three shared helpers, twelve states written directly | (c) convention |
| 6 | Java uses `boolean isPublic`, not dynamic field access | (c) convention — language-forced expression difference |

## What We Proved

- All three real-world DOCTYPE shapes (`<!DOCTYPE html>`, `PUBLIC`-only,
  `PUBLIC`-with-`SYSTEM`) tokenize with exactly the field values a real
  browser's quirks-mode detection would need, verified field-by-field —
  not just "a DoctypeToken was emitted," but that `name`,
  `publicIdentifier`, `systemIdentifier`, and `forceQuirks` are each
  independently correct.
- The single most exam-relevant fact this module teaches — which
  malformations force quirks mode and which don't — was verified as a
  real behavioral distinction, not asserted from the spec text: the
  "trailing garbage" exception was deliberately broken and confirmed to
  be exactly one test's responsibility to catch, in both languages,
  continuing this course's established discipline of proving its own
  "Try it yourself" claims by actually running the broken code.
- A four-module-old data-structure decision (Module 1's `DoctypeToken`
  design) was exercised at the largest scale this course has reached (16
  states) without needing a single change — real evidence the original
  design was sound, not just convenient at the time.
