# Module 6 — DECISIONS.md

## (a) Forced by the spec

- **`<!` inside script data emits BOTH characters immediately**, unlike
  the `/` branch of the same state, which emits nothing and defers
  everything to what happens next. This asymmetry is exactly what the spec
  states, and it matters: whatever Module 7 builds on top of
  `SCRIPT_DATA_ESCAPE_START`, the `<` and `!` are already permanently
  committed to the token stream by the time it runs — that state can never
  "undo" them.
- **Script data has no character-reference handling**, same as RAWTEXT —
  `&` is always literal. Not a coincidence: script data and RAWTEXT share
  this property because both hold content a browser hands to something
  other than an HTML text renderer (a script engine or, historically, a
  CSS engine) — HTML entity decoding would be actively wrong there.
- **The base text/end-tag-name mechanism (appropriate end tag, bail-out
  behavior) is identical to Module 5's**, because the spec's own text for
  these states is nearly a copy of RCDATA/RAWTEXT's, differing only in
  which states they transition to. This is a case where the spec's own
  structure already told us reuse was safe, not just convenient.

## (b) Forced by an external contract

- None new. `lastStartTagName` (Module 5's contract with the not-yet-built
  Module 9) is exercised again here with a different value (`'script'`),
  confirming the mechanism generalizes rather than being accidentally
  RCDATA/RAWTEXT-specific.

## (c) Our convention

- **`lessThanSignState` grew a third parameter instead of becoming a
  wholly separate script-data-specific method.** The alternative (a
  distinct `scriptDataLessThanSignState` written from scratch) would have
  duplicated the '/' branch's logic for a third time. Threading one more
  parameter through a method already proven correct by nine passing tests
  was judged lower-risk than a fresh implementation.
- **JS's `bangState !== undefined` vs. Java's `bangState != null`** reflect
  each language's native "nothing was passed" idiom — not a deliberate
  divergence, just each version speaking its own language's dialect for
  the same concept.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | `<!` emits both characters immediately, unlike `/` | (a) forced by spec |
| 2 | Script data never interprets `&` | (a) forced by spec |
| 3 | End-tag mechanism identical to Module 5, reused not reimplemented | (a) forced by spec (and confirmed safe to reuse) |
| 4 | `lessThanSignState` extended with a third param rather than duplicated | (c) convention |

## What We Proved

- Module 5's shared helper methods generalize correctly to a *third*
  family (script data) without any changes to their core logic — only
  `lessThanSignState` needed a genuinely new branch, and even that was an
  additive extension, not a rewrite.
- The seam between Module 6 and Module 7 works exactly like every other
  seam this course has built: `<!` inside script data correctly emits its
  two tokens and switches into `SCRIPT_DATA_ESCAPE_START`, which
  immediately throws a `NotImplementedError` naming Module 7 — proof the
  handoff point is wired correctly before the room behind it exists.
- The "appropriate end tag" mechanism, first proven for RCDATA/RAWTEXT in
  Module 5, is now proven a second time for an unrelated tag name
  (`script`), with zero changes to the mechanism itself — real evidence it
  was built generically, not accidentally coupled to `<textarea>`/`<title>`
  specifics.
