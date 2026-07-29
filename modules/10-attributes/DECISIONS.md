# Module 10 — DECISIONS.md

## (a) Forced by the spec

- **Duplicate attribute names are dropped, keeping the first occurrence,
  reported as a parse error.** This is the exact rule Module 1's
  `DECISIONS.md` anticipated when it chose a list over a map for
  attributes — this module is where that anticipation is finally verified
  against real behavior.
- **NUL inside an attribute name or value becomes U+FFFD *in the string
  being built*, not a separate character token** — the same "accumulate
  into a field, not the token stream" rule Module 9 established for tag
  names, now applied identically to attribute names and values.
- **EOF at any point while parsing attributes discards the entire tag
  token**, exactly like Module 9's tag-name EOF rule — a malformed,
  truncated tag produces no tag token at all, only the `EOFToken`.
- **`>` unconditionally closes the tag from `TAG_NAME`, `BEFORE_ATTRIBUTE_NAME`,
  `AFTER_ATTRIBUTE_NAME`, `ATTRIBUTE_VALUE_UNQUOTED`, and
  `AFTER_ATTRIBUTE_VALUE_QUOTED`.** Five different states, one shared
  rule — attribute parsing never has an "appropriate tag" ambiguity to
  resolve (unlike RCDATA/RAWTEXT/script-data's end-tag-name states),
  because by the time any of these states runs, Data state already
  committed to tag parsing via `<`.
- **A missing whitespace between two quoted attributes
  (`a="1"b="2"`) is a parse error, not a hard failure** — parsing
  recovers by reconsuming the offending character in
  `BEFORE_ATTRIBUTE_NAME`, so both attributes still end up correctly
  parsed despite the malformed separator.
- **`/` in an unexpected position inside a tag (self-closing-start-tag
  state, seeing anything other than `>`) is `unexpected-solidus-in-tag`, a
  parse error that recovers by reconsuming in `BEFORE_ATTRIBUTE_NAME`** —
  so `<div a="1" / b="2">` still parses both attributes despite the
  stray `/`.

## (b) Forced by an external contract

- None new for Track 1. `CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE` is
  switched into from all three attribute-value states but deliberately
  left unresolved here — Module 11's contract to fulfill, mirroring every
  other seam-before-room handoff this course has built since Module 1.

## (c) Our convention

- **`Attribute`'s fields lost their `final` modifier (Java only).** A
  genuine, small evolution of a Module 1 decision, not a design flaw
  being fixed — Module 1 had no way to anticipate this module's need for
  incremental construction.
- **Duplicate-checking uses a linear scan over the attributes list**, not
  a parallel `Set`/`HashMap` of seen names. The realistic attribute count
  per tag (single digits) makes the asymptotic cost irrelevant, and a
  linear scan avoids maintaining a second data structure in sync with the
  first.
- **`currentAttribute` is a scratch field, separate from
  `currentToken.attributes`, until `finishAttributeName` runs.** This
  mirrors `tempBuffer`'s role from Module 5 — a place to build something
  tentative before committing it, so a discarded duplicate never touches
  the real, observable attribute list at all.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Duplicate attribute names dropped, first wins | (a) forced by spec — verifies Module 1's design |
| 2 | NUL replaced with U+FFFD in the name/value string, not a token | (a) forced by spec |
| 3 | EOF anywhere in attribute parsing discards the whole tag | (a) forced by spec |
| 4 | `>` unconditionally closes from five different states | (a) forced by spec |
| 5 | Missing whitespace between attributes recovers, doesn't fail | (a) forced by spec |
| 6 | Stray `/` recovers via reconsume, doesn't fail | (a) forced by spec |
| 7 | `Attribute` fields made mutable (Java) | (c) convention — evolution of Module 1 |
| 8 | Linear-scan duplicate check, not a parallel Set | (c) convention |
| 9 | `currentAttribute` as a scratch field before commit | (c) convention |

## What We Proved

- **The duplicate-attribute rule works exactly as Module 1 predicted it
  would need to**, verified with real, run output four modules later —
  the single clearest example in this course of a data-structure decision
  made well ahead of the code that would exercise it.
- All three attribute-value quoting styles (double, single, unquoted)
  parse to the identical `{name, value}` shape, confirmed by direct
  comparison, not just individually plausible-looking output.
- Malformed input across five distinct failure modes (missing value,
  missing whitespace, stray `/`, bare `=`, mid-attribute EOF) each recover
  or fail in the specific, distinct way the spec mandates — not a single
  generic "parsing failed" fallback.
- The seam into Module 11 (`CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE`) is
  reachable from all three value-parsing contexts, verified directly.
