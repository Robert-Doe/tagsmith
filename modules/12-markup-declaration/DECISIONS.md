# Module 12 — DECISIONS.md

## (a) Forced by the spec

- **`"DOCTYPE"` matches case-insensitively; `"--"` and `"[CDATA["` match
  case-sensitively.** Verified directly with three spellings
  (`DOCTYPE`/`doctype`/`DocType`), all routing correctly to the same
  state.
- **Bogus comment emits its comment token on EOF, unlike tag parsing
  (Module 9), which discards a truncated tag entirely.** A different
  policy for a different kind of "unfinished" thing — a comment with
  whatever data it managed to collect is still meaningful; a tag with no
  confirmed name is not.
- **The `?` character in Tag Open's malformed-tag branch (Module 9) is
  reconsumed, not discarded** — making it the first character of the
  resulting bogus comment's data. This detail was *specified* back in
  Module 9 but only became observable, and was only actually verified,
  in this module — see "What We Proved" below.
- **Markup Declaration Open's fallback (`incorrectly-opened-comment`)
  consumes nothing before switching to Bogus Comment** — every character
  that didn't match `"--"`, `"DOCTYPE"`, or `"[CDATA["` is still sitting
  unread, and becomes bogus-comment data starting from that exact
  position.

## (b) Forced by an external contract

- None new for Track 1.

## (c) Our convention

- **The CDATA lookahead (`[CDATA[`) is taken unconditionally**, without
  checking whether the tokenizer is "inside foreign content" (SVG/MathML)
  — because this standalone tokenizer has no tree-construction context to
  check against, exactly the same limitation Module 9 already established
  for RCDATA/RAWTEXT/script-data switching. A real browser gates this
  path on tree-construction state; this course's Track 1 tokenizer cannot,
  and says so rather than silently approximating incorrectly.
- **`peekString`/`matchCaseInsensitive`/`matchLiteral` are new primitives**,
  not extensions of `peek()` — this module is the first to need
  multi-character lookahead at all, so these didn't exist to reuse before
  now.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | `"DOCTYPE"` case-insensitive, `"--"`/`"[CDATA["` case-sensitive | (a) forced by spec |
| 2 | Bogus comment emits on EOF; tag parsing discards on EOF | (a) forced by spec |
| 3 | `?` reconsumed into bogus comment data, not discarded | (a) forced by spec (verified this module) |
| 4 | Markup declaration's fallback consumes nothing before switching | (a) forced by spec |
| 5 | CDATA lookahead taken unconditionally (no foreign-content check) | (c) convention — same limitation as Module 9 |
| 6 | New multi-character lookahead primitives | (c) convention — genuinely new need |

## What We Proved

- All three markup-declaration lookaheads correctly route to their
  target states (`COMMENT_START`, `DOCTYPE`, `CDATA_SECTION`), each
  verified by checking both the thrown module number and the tokenizer's
  final `state` field, not just that *something* threw.
- **A specific detail from Module 9's own DECISIONS.md — that the `?`
  character is reconsumed rather than discarded — was wrong in this
  module's first draft of tests, and caught by actually running the code
  and reading the real output.** The fix was to correct the test
  expectation to match verified behavior, not to change the
  implementation to match an assumption. This is the clearest example yet
  in this course of the "verify before documenting" rule catching a real
  mistake in practice, not just in principle.
- Every unrecognized `<!...>` declaration, plus both of Module 9's own
  malformed-tag fallbacks (`<?...`, `</9...`), converge correctly on the
  same bogus-comment mechanism — proof the seam between Modules 9 and 12
  works from all three of its entry points, not just the one most
  directly tested.
