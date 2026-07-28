# Module 7 — DECISIONS.md

## (a) Forced by the spec

- **A dash count of "two or more" is a single collapsed state
  (`SCRIPT_DATA_ESCAPED_DASH_DASH`), not counted indefinitely.** The spec
  doesn't need a third, fourth, fifth dash to behave any differently from
  the second — only "zero," "exactly one," and "two-or-more" are
  distinguishable states that matter, because only "two-or-more, then `>`"
  means anything (closes the comment).
- **`>` only means something special in the dash-dash state.** A bare `>`
  encountered anywhere else in escaped mode (zero or one preceding dash)
  is just an ordinary character. This is precisely why `-->` closes a
  hidden comment but a lone `>` inside escaped text does not — and it's
  also exactly the gap this module's "Try it yourself" bug exploits when
  the dash count isn't correctly reset.
- **Any character that isn't `-`, `<`, or NUL immediately resets the dash
  count to zero** (returns to `SCRIPT_DATA_ESCAPED`), even from the
  dash-dash state. `--x-->` still closes correctly — the count restarts
  cleanly after `x`, it doesn't carry over.
- **EOF while still inside escaped mode is its OWN distinct parse error**
  (`eof-in-script-html-comment-like-text`), different from the generic EOF
  handling elsewhere. This reflects a real, meaningfully different failure:
  a hidden comment that never closes is a strong signal of malformed
  input, worth a more specific diagnostic than "the document just ended."
- **A nested, literal `<script` inside escaped mode does NOT re-enter
  Module 6's escape mechanism — it enters an entirely different state,
  `SCRIPT_DATA_DOUBLE_ESCAPE_START`.** The spec treats "a script tag
  appearing inside an already-hidden comment" as its own distinct
  situation (Module 8), not a recursive re-application of this module's
  logic.

## (b) Forced by an external contract

- None new. `lastStartTagName` is exercised a third time (after Module 5
  and Module 6), continuing to require no changes — a real cross-module
  contract holding up under repeated, independent use.

## (c) Our convention

- **`scriptDataEscapedLessThanSignState` was written standalone rather
  than folded into the existing `lessThanSignState` helper.** Its
  ASCII-letter branch (emit `<`, reconsume in a different state entirely)
  has no analog in any other less-than-sign state built so far. Forcing it
  into the shared helper would have required a fourth parameter whose
  presence would only make sense for one caller — judged not worth the
  added indirection for a ~15-line method.
- **The dash-count states explicitly re-assign `state =
  State.SCRIPT_DATA_ESCAPED` on every reset**, rather than relying on any
  implicit fallthrough. Verbose, but a single accidentally-omitted
  reassignment is exactly the bug this module's own code walkthroughs
  demonstrate live — explicitness here is a deliberate defense, not
  boilerplate for its own sake.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Dash count collapses to zero/one/two-or-more, not counted indefinitely | (a) forced by spec |
| 2 | `>` only closes the comment from the dash-dash state | (a) forced by spec |
| 3 | Any non-`-`/`<`/NUL character resets the dash count | (a) forced by spec |
| 4 | EOF inside escaped mode is its own distinct parse error | (a) forced by spec |
| 5 | Nested `<script` inside escaped mode enters a different mechanism (Module 8), not recursion | (a) forced by spec |
| 6 | `scriptDataEscapedLessThanSignState` written standalone | (c) convention |
| 7 | Dash-count resets are explicit, not implicit | (c) convention — defensive |

## What We Proved

- A full, real "hidden comment" round-trip (`--comment-->`) tokenizes
  correctly character-for-character and correctly exits back to plain
  script data — verified against real output, not just described.
- The dash-counting sub-machine correctly handles all three states (zero,
  one, two-or-more dashes) independently, including the reset behavior
  each depends on.
- EOF and NUL each produce the exact, distinct parse errors the spec
  associates with hidden-comment content specifically — not the generic
  errors used elsewhere.
- The "appropriate end tag" mechanism, unmodified since Module 5, closes a
  script element correctly even when triggered from deep inside escaped
  mode, and correctly falls back to `SCRIPT_DATA_ESCAPED` (not plain
  `SCRIPT_DATA`) on a non-matching name — confirmed by checking that a
  subsequent EOF still reports the escaped-mode-specific parse error.
- A real, constructible correctness bug (premature comment closure from a
  missing dash-count reset) was deliberately introduced and confirmed to
  slip past all 12/11 existing tests undetected — concrete, run evidence
  that this module's test suite, like any test suite, proves the cases it
  covers and nothing more.
