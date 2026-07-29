# Module 15 — DECISIONS.md

## (a) Forced by the spec

- **`]]>` ends the section; a lone `]` or `]]` not immediately followed by
  `>` is just literal content.** Verified precisely, including a
  deliberately-introduced bug (checking only two brackets instead of
  three) that was caught with a specific, constructed input
  (`]]x]]>rest`) rather than assumed safe.
- **CDATA content that never closes before EOF is a parse error**
  (`eof-in-cdata`), and — consistent with every other content-accumulating
  state in this course — still emits everything collected as real
  `CharacterToken`s plus a final `EOFToken`, rather than discarding it.

## (b) Forced by an external contract

- None new.

## (c) Our convention

- **CDATA is a single state (`CDATA_SECTION`), matching this course's
  original 68-state scope**, rather than split into bracket/end
  sub-states the way some later spec revisions structure it. Both
  structurings are behaviorally equivalent; this course models the one its
  Module 1 table-of-contents fetch actually found in the linked spec
  snapshot, not a later revision's structure.
- **`]]>` detection reuses `matchLiteral`**, the same lookahead primitive
  Module 12 built for `--`/`DOCTYPE`/`[CDATA[` — no new lookahead
  mechanism was needed for this module at all.
- **NUL inside CDATA is modeled identically to Data state's own NUL
  rule** (parse error, but still emitted literally) — a deliberate
  consistency choice, not a re-derivation from spec text this course
  isn't fully certain of; CDATA content becoming ordinary character
  tokens makes Data state's precedent the natural one to follow.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | `]]>` (all three characters) required to close the section | (a) forced by spec |
| 2 | EOF mid-section still emits collected content plus EOFToken | (a) forced by spec |
| 3 | Modeled as one state, matching this course's 68-state scope | (c) convention |
| 4 | Reuses Module 12's `matchLiteral` lookahead | (c) convention |
| 5 | NUL handling modeled after Data state's precedent | (c) convention |

## What We Proved

- A complete `<![CDATA[...]]>` section tokenizes correctly starting from
  real Data-state markup — the full pipeline (Data → Tag Open → Markup
  Declaration Open → CDATA Section → back to Data) verified in one
  continuous run, the same standard Module 13 set for comments.
- The close-sequence detection correctly rejects a partial match (a lone
  `]` or an unconfirmed `]]`) rather than closing early — proven not just
  by a passing test, but by deliberately weakening the check to two
  characters and constructing a specific input (`]]x]]>rest`) where the
  two-language implementations both, independently, produced the exact
  same wrong output (`"]]>rest"` instead of `"]]xrest"`) — concrete,
  cross-language evidence that both implementations encode the same real
  bug the same way when deliberately broken, and the same correct
  behavior when not.
