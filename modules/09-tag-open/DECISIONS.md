# Module 9 — DECISIONS.md

## (a) Forced by the spec

- **The tokenizer never switches into RCDATA/RAWTEXT/PLAINTEXT/SCRIPT_DATA
  on its own, no matter what tag name it just parsed.** This is arguably
  the single most important architectural fact this course has surfaced
  since Module 1. The spec is explicit that this state-switching is
  performed by the tree construction stage (a separate, later spec
  chapter), which observes emitted tokens and tells the tokenizer what to
  do next. A standalone tokenizer — exactly what Track 1 builds — has no
  such logic, and correctly so.
- **`'>'` unconditionally closes whatever tag is being built in
  `TAG_NAME` state** — there is no "appropriate end tag" check here, unlike
  the RCDATA/RAWTEXT/script-data end-tag-name states (Modules 5–7). Once
  Data state has already committed to tag parsing via `<`, there's no
  ambiguity left to resolve; every character consumed from here on is
  unambiguously part of a real tag.
- **NUL inside a tag name is replaced with U+FFFD *in the name itself***,
  not emitted as a separate character token — a genuinely different rule
  from every content-state NUL handling built so far (Data, RCDATA,
  RAWTEXT, script data all emit NUL literally as its own token). The
  difference exists because a tag name is a string field being assembled,
  not a stream of independent character tokens.
- **EOF mid-tag-name discards the half-built tag token entirely** — only
  an `EOFToken` is emitted, the `StartTagToken`/`EndTagToken` under
  construction simply vanishes. This is different from EOF during
  RCDATA/RAWTEXT/script-data end-tag-name states (Modules 5–7), which
  bail out and re-emit the buffered content as literal text; here, there's
  no "literal text" to fall back to — a malformed, truncated tag is just
  discarded outright.
- **`</>with` no name and `</` at EOF are two distinct, separately-defined
  failure cases**, not the same "malformed end tag" bucket — the first
  produces zero tokens (just a parse error), the second produces two
  literal character tokens. Different enough in real-world consequence
  (silently dropping vs. still surfacing something to whatever reads the
  token stream) that the spec treats them as genuinely separate paths.

## (b) Forced by an external contract

- **`lastStartTagName` is updated here, fulfilling the contract Module 5
  established before this producer existed.** This module is the first
  place that contract's other half is honored — and honoring it correctly
  required no changes to Module 5, 6, or 7's code at all, only this
  module writing to a field they'd already agreed to read.

## (c) Our convention

- **`appendToCurrentTagName` casts to the shared `TagToken` parent (Java)**
  rather than branching on the concrete subtype — a small design choice
  that pays off exactly once (in `emitCurrentTagToken`, where the subtype
  *does* matter) and stays generic everywhere else.
- **`endTagOpenState` was NOT built on top of Module 5's shared
  `endTagOpenState` helper**, despite the similar name, because their
  failure-path behavior is genuinely different (bogus comment vs. literal
  `<`/`/` text) — reusing the helper would have required threading a new
  parameter through code written for a different purpose, for a savings
  of maybe ten lines.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Tokenizer never auto-switches to RCDATA/RAWTEXT/etc. based on tag name | (a) forced by spec — architectural |
| 2 | `>` unconditionally closes a tag in TAG_NAME state, no appropriateness check | (a) forced by spec |
| 3 | NUL in a tag name → U+FFFD in the name field, not a character token | (a) forced by spec |
| 4 | EOF mid-tag-name discards the token entirely | (a) forced by spec |
| 5 | `</>` (no name) vs. `</` at EOF are distinct failure cases | (a) forced by spec |
| 6 | `lastStartTagName` finally gets a real producer | (b) external contract fulfilled |
| 7 | `appendToCurrentTagName` casts to shared `TagToken`, not per-subtype | (c) convention |
| 8 | `endTagOpenState` written fresh, not reusing Module 5's helper | (c) convention |

## What We Proved

- Real markup (`<div>`, `</div>`, `<DIV>`) now produces real
  `StartTagToken`/`EndTagToken` objects with correctly lowercased names —
  the first time in this course actual tag tokens have come from anything
  other than a hand-set test fixture.
- The `lastStartTagName` contract genuinely connects two modules built
  four modules apart (5 and 9), verified by running real markup through
  both and checking the field end-to-end, not just re-testing each side
  in isolation.
- **The architectural boundary between tokenizing and tree construction is
  real and directly observable**: feeding `<textarea>x</textarea>` into
  this pure tokenizer produces four ordinary tokens (start tag, one
  character, end tag, EOF) — proof, not assertion, that RCDATA-style
  content handling requires a driver outside the tokenizer itself.
- That same boundary has a real, demonstrable failure mode when treated
  naively: a tag nested inside what *should* be RCDATA content
  (`<textarea><b></textarea>`) silently corrupts `lastStartTagName` when
  no tree constructor is present to switch state first — concrete
  motivation for why Track 2's Module A1 exists at all.
