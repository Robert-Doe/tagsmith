# Module 11 — DECISIONS.md

## (a) Forced by the spec

- **The "ambiguous ampersand" exception applies ONLY when a character
  reference is consumed as part of an attribute value.** The exact same
  input (`&amp=x`) decodes differently depending purely on which state
  invoked the algorithm — Data state decodes it; an attribute value does
  not. Verified directly: this module's regression test re-runs Module
  4's own `&amp b` test case unchanged and confirms it still passes,
  proving the new behavior is additive, not a silent change to Data
  state's rules.
- **The exception triggers on exactly two follow-up characters: `=` and
  ASCII alphanumerics** — not whitespace, not punctuation, not EOF. A
  no-semicolon match followed by anything else still decodes normally,
  identically to Data state.
- **The exception applies only to named references, never numeric ones.**
  `&#65;` and `&#x41;` decode identically whether inside or outside an
  attribute; only the named-reference lookup path has this special case.
- **Decoded output (or the literal `&` on failure) is appended to the
  attribute's `value` string, never emitted as a `CharacterToken`.** This
  isn't a new rule so much as a continuation of the pattern established in
  Module 10: everything inside an attribute value accumulates into a
  field, because an attribute's value is a single string, not a stream of
  independent tokens.

## (b) Forced by an external contract

- None new. This module is purely a consumer of Module 4's algorithm and
  Module 10's `currentAttribute` field — both existing contracts, neither
  requiring any change to support this module's addition.

## (c) Our convention

- **`isInAttribute` was added as a new parameter to an existing function**
  (`consumeCharacterReference`/`consumeNamedReference`) rather than as a
  parallel, attribute-specific copy of the whole algorithm. The
  alternative — a second, nearly-identical `consumeCharacterReferenceInAttribute`
  function — would have duplicated the numeric-reference path, the
  bail-out conditions, and the longest-match loop for a difference that's
  really one `if` block. Threading one more parameter through
  well-tested existing code was judged the safer change.
- **`attrValueReturnState` and `additionalAllowedCharacter` are plain
  tokenizer fields, not parameters passed through the state-switch
  mechanism** — consistent with how every other piece of cross-state
  context in this course (`tempBuffer`, `currentAttribute`,
  `lastStartTagName`) has been carried, since state switches in this
  architecture are just assignments to `this.state`, with no way to pass
  arguments directly.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Ambiguous-ampersand exception applies only inside attribute values | (a) forced by spec |
| 2 | Exception triggers only on `=` or alphanumeric follow-up | (a) forced by spec |
| 3 | Exception applies only to named references, not numeric | (a) forced by spec |
| 4 | Decoded/literal output appended to `.value`, never emitted as a token | (a) forced by spec (continuation of Module 10's pattern) |
| 5 | `isInAttribute` as a new parameter on the existing function | (c) convention |
| 6 | Return-state and additional-allowed-character as plain fields | (c) convention |

## What We Proved

- The ambiguous-ampersand exception is real and independently verified in
  three directions: it correctly suppresses decoding for `=` and
  alphanumeric follow-ups, and correctly does NOT suppress decoding for
  anything else — three separate, deliberately contrastive tests, not one
  assumed-representative case.
- Module 4's Data-state behavior is provably unaffected by this module's
  addition — the exact same test input from Module 4 is re-run here and
  still produces the exact same output.
- All three attribute-value contexts (double-quoted, single-quoted,
  unquoted) correctly reach the same shared character-reference logic,
  each remembering its own correct return state.
- Deliberately forcing `isInAttribute = true` onto the Data-state path was
  verified NOT to be caught by any of this course's existing tests —
  honest, checked evidence (not a guess) that this specific spec detail
  needs a test purpose-built to expose it, continuing the lesson Modules 7
  and 8 established about what a passing suite does and doesn't prove.
