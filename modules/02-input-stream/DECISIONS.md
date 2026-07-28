# Module 2 — DECISIONS.md

## (a) Forced by the spec

- **CRLF and lone CR both normalize to LF, before any state runs.** The
  spec's "Preprocessing the input stream" step states this directly, ahead
  of the state-machine description. It is not something any individual
  state does — it's a global precondition every state is allowed to assume
  is already true.
- **The CRLF pass must be understood as happening before the lone-CR pass
  conceptually**, even though a real implementation can do both in a
  single linear scan — the spec phrases it as "each pair... is replaced...
  and any remaining CR is replaced," (pair-then-remainder), so a
  two-character sequence is never double-counted as two separate newlines.

## (b) Forced by an external contract

- None specific to this module. (Module 1's DOCTYPE-identifier and
  attribute-list decisions still apply; nothing new here interacts with a
  downstream contract.)

## (c) Our convention

- **Implemented as two sequential literal replace passes**
  (`"\r\n"→"\n"`, then `"\r"→"\n"`) rather than a single regex with
  alternation (e.g. `/\r\n|\r/g`). Either is correct and both are O(n).
  The two-pass version was chosen because it reads as a direct transliteration
  of the spec's own two-clause sentence, at the cost of one extra full pass
  over the string — a cost that doesn't matter at any input size this
  course cares about.
- **Order of the two passes is load-bearing, not stylistic.** If the
  lone-CR pass ran first, every `"\r\n"` would become `"\n\n"` (the `\r`
  turns into an `\n`, and the original `\n` is untouched, leaving two
  newlines where the spec requires exactly one). This is deliberately
  exercised as a "Try it yourself" exercise in both `CODE_WALKTHROUGH.md`
  files rather than just asserted here — see it break, don't just read
  about it breaking.
- **`preprocess()` is a standalone function, not a method on `Tokenizer`.**
  Chosen so it can be unit-tested in complete isolation from any state-
  machine behavior — the four new tests in this module never construct a
  `Tokenizer` at all, they call the function directly.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | CRLF/CR → LF normalization happens before tokenizing | (a) forced by spec |
| 2 | Pair-then-remainder handling (no double-counting a CRLF) | (a) forced by spec |
| 3 | Two sequential literal-replace passes, not one regex | (c) convention |
| 4 | CRLF pass must run before lone-CR pass | (c) convention (but correctness-critical) |
| 5 | `preprocess()` is a standalone, independently-testable function | (c) convention |

## What We Proved

- Newline normalization can be implemented, verified, and reasoned about
  completely independently of the state machine — four tests never touch
  `Tokenizer` at all.
- The `Tokenizer` class from Module 1 needed exactly one line changed to
  adopt this behavior, and every one of Module 1's original tests still
  passes unmodified — evidence that this was a genuinely additive change,
  not a rewrite in disguise.
- Order-of-operations bugs in seemingly simple string transformations are
  real and easy to introduce silently; this module's tests would have
  caught the swapped-order bug immediately. Verified directly, not assumed:
  deliberately swapping the two passes drops the JS suite from 13/13 to
  11/13 and the Java suite from 18/18 to 16/18 — **two** failures, not one
  (both the exact-pair test and the mixed-run test that contains a CRLF
  fail; the lone-CR-only and no-CR tests are unaffected because they never
  exercise the now-broken CRLF path).
