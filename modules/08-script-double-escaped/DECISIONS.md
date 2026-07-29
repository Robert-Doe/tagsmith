# Module 8 — DECISIONS.md

## (a) Forced by the spec

- **The "script" match, both entering and leaving double-escaped mode, is
  case-SENSITIVE**, comparing the temp buffer as literally typed against
  the lowercase string `"script"`. This is a genuine, deliberate asymmetry
  from every other name comparison in this course (tag names are always
  lowercased as they're built). Verified by construction, not assumption:
  `<SCRIPT>` inside a hidden comment does not trigger double-escaping;
  `<script>` does.
- **`'<'` is emitted immediately in double-escaped states**, unlike every
  less-than-sign handling in single-escaped mode (Module 7), which always
  defers. Confirmed by direct token-count comparison in this module's
  tests.
- **`-->` from double-escaped mode exits all the way to plain
  `SCRIPT_DATA`**, never back to single-escaped mode, regardless of
  nesting depth. There is exactly one "outer" hidden comment; seeing its
  close is always a full exit.
- **The double-escaped less-than-sign state has no letter branch at all** —
  only `/` matters. Once inside double-escaped mode, there's no further
  nesting to detect; the only next milestone is finding the matching
  `</script>` that ends the *inner* nested block.

## (b) Forced by an external contract

- None new. `tempBuffer` (Module 5's field) is reused a third time, for a
  genuinely different comparison rule (case-sensitive exact match, vs.
  Module 5/6/7's lowercase-as-built tag names) — the field itself needed
  no changes to support this, only the code reading it.

## (c) Our convention

- **`isDoubleEscapeTerminator` is a standalone function/static method**,
  not folded into the shared helper machinery from earlier modules — its
  six-character check is specific to exactly these two states and shares
  no structure with `lessThanSignState`, `endTagOpenState`, or
  `endTagNameState`.
- **`scriptDataDoubleEscapeStartState` and `scriptDataDoubleEscapeEndState`
  were written as two separate, near-identical methods** rather than one
  parametrized method (the way Module 6 parametrized `lessThanSignState`).
  The two differ in which state they land on when the match succeeds vs.
  fails (opposite targets), which would require the same kind of
  parametrization already used elsewhere — the choice here was to keep
  each method readable as a standalone unit given how central the
  case-sensitivity quirk is to understanding either one; a shared version
  was judged to obscure that quirk rather than clarify it.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Case-sensitive exact "script" match, both directions | (a) forced by spec |
| 2 | `'<'` emitted immediately in double-escaped mode | (a) forced by spec |
| 3 | `-->` always exits to plain SCRIPT_DATA, skipping single-escaped | (a) forced by spec |
| 4 | No letter branch in the double-escaped less-than-sign state | (a) forced by spec |
| 5 | Terminator check as a standalone function | (c) convention |
| 6 | Start/end states written separately, not parametrized into one | (c) convention |

## What We Proved

- A complete, real, three-level-nested script body
  (`<script>...<script>x</script>-->...</script>`-shaped content) tokenizes
  correctly end-to-end, exiting through single-escaped mode back to plain
  script data — verified as one continuous run, not three separate,
  disconnected module tests.
- The case-sensitivity quirk is real and independently verified in both
  directions (entering AND leaving double-escaped mode), not just
  asserted from spec-reading — confirmed by constructing inputs where
  case is the *only* variable that changes, and observing the token
  stream and final state differ exactly as the spec predicts.
- The deliberate `'<'`-emission-timing difference between single- and
  double-escaped modes was directly measured (token count), not just
  described.
- A real, deliberately-introduced correctness bug (loosening the
  case-sensitive check to case-insensitive) was caught by exactly one
  test in each language — concrete, run-verified evidence that this
  specific spec quirk has real test coverage, not just documentation.
