# Module 3 — DECISIONS.md

## (a) Forced by the spec

- **`&` and `<` switch state; they do not themselves emit anything.** The
  spec's exact wording is "Switch to the X state," not "emit a token and
  switch." Whatever token (if any) eventually results from encountering an
  `&` or `<` is entirely the responsibility of whatever state comes next
  (Modules 4 and 9), not Data state.
- **A NUL character is a parse error, but tokenizing continues, and the
  literal NUL character is still emitted as a `CharacterToken`.** This is
  this spec snapshot's exact wording ("Parse error. Emit the current input
  character as a character token"). **This is a real point of spec
  divergence worth knowing for a comprehensive exam**: later revisions of
  the WHATWG Living Standard change this behavior to substitute
  U+FFFD REPLACEMENT CHARACTER instead of emitting the literal NUL. This
  course implements the W3C LC snapshot linked in the ROADMAP, verbatim —
  emit-as-is, not substitute.
- **EOF still emits an `EOFToken` and halts** — unchanged from Module 1,
  restated here because it's still part of the same state.

## (b) Forced by an external contract

- None new. The token shapes decided in Module 1 (one `CharacterToken` per
  character, not per run) are exercised here for the first time at scale —
  `"hi"` really does produce two separate `CharacterToken`s, not one
  two-character token — which is a direct, visible consequence of that
  earlier decision, not a new one.

## (c) Our convention

- **Parse errors are collected in an array/list on the tokenizer
  (`parseErrors` / `getParseErrors()`), not thrown, printed, or logged.**
  The spec doesn't mandate any particular mechanism for surfacing parse
  errors to a caller — it only mandates that tokenizing doesn't stop. An
  inspectable list was chosen because it's the easiest thing to write a
  test assertion against.
- **`step()`'s pre-existing generic fallback (from Module 1) was reused
  unchanged** to make the `&`/`<` handoff to not-yet-built states work,
  rather than writing new dispatch logic specific to this handoff. This
  wasn't a deliberate choice made *in* Module 3 so much as a validation
  that Module 1's scaffolding was designed correctly the first time — the
  seam these two modules needed to connect through already existed.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | `&`/`<` only switch state, never emit | (a) forced by spec |
| 2 | NUL is a parse error but still emitted literally (this spec snapshot) | (a) forced by spec — **known divergence from the modern Living Standard** |
| 3 | EOF handling restated, unchanged from Module 1 | (a) forced by spec |
| 4 | Parse errors collected in an inspectable list, not thrown | (c) convention |
| 5 | Reused Module 1's generic dispatch fallback as-is for the `&`/`<` handoff | (c) convention (validates earlier design) |

## What We Proved

- The Data state, in full, correctly turns arbitrary plain text into one
  `CharacterToken` per character, terminated by a single `EOFToken`.
- `&` and `<` correctly hand off to Modules 4 and 9 respectively — proven
  by the *generic* fallback machinery built in Module 1, not by
  special-casing added here, which is exactly the kind of integration this
  course is structured to force you to prove at each step.
- Parse errors (starting with NUL) can be represented, recorded, and
  asserted on without interrupting tokenization, establishing the pattern
  every future "this is a parse error" spec note will reuse.
- A specific, real spec-version divergence (NUL handling: emit vs.
  replace with U+FFFD) is documented with evidence, not asserted from
  memory — exactly the kind of detail a comprehensive exam question could
  probe, and exactly the kind of claim this course's "verify before
  documenting" rule exists to protect against getting wrong.
