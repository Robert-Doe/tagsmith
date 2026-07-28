# Module 5 — DECISIONS.md

## (a) Forced by the spec

- **"Appropriate end tag token" is checked only at the moment a terminator
  character (whitespace, `/`, `>`) is seen**, not continuously as the name
  is built. A tag name that grows past a match and then un-matches (e.g.
  content genuinely containing the literal text `</title` followed by more
  letters, inside a `<textarea>`) must keep accumulating and re-evaluate
  fresh at the next terminator — there's no early exit.
- **A failed match dumps `<`, `/`, and the entire buffered attempt as
  literal character tokens**, then reconsumes the terminator character in
  the original state (RCDATA/RAWTEXT) rather than treating it specially.
  This is what makes `<textarea>` content containing an unrelated `</b>`
  or a stray `<` behave exactly like ordinary text rather than corrupting
  the tokenization.
- **PLAINTEXT has no way out, ever — not even via EOF-adjacent tricks.**
  There is no "PLAINTEXT less-than-sign state" at all in the spec; `<` is
  simply never special once PLAINTEXT is entered. This is a real,
  intentional spec asymmetry (RCDATA/RAWTEXT can be exited via a matching
  end tag; PLAINTEXT cannot be exited by anything except the document
  ending) that exists for exactly one legacy HTML element,
  `<plaintext>`, which real browsers still support today for
  compatibility.
- **RAWTEXT has no character-reference handling at all** — `&` inside
  `<script>`, `<style>`, etc. is always literal. This is a real, load-
  bearing difference from RCDATA (used for `<textarea>`, `<title>`), where
  `&amp;` really does decode.

## (b) Forced by an external contract

- **`lastStartTagName` must be tracked globally across the whole
  tokenizer**, not scoped to any single state. The contract here is with
  Module 9 (not yet built): whatever state emits a `StartTagToken` is
  responsible for updating this field, and every RCDATA/RAWTEXT-family end
  tag check depends on that contract being honored correctly later. This
  module builds the *consumer* side of that contract before the
  *producer* side exists — verified here only via tests that set the field
  directly.

## (c) Our convention

- **RCDATA and RAWTEXT's shared structure (text state, less-than-sign
  state, end-tag-open state, end-tag-name state) is implemented as four
  shared methods with thin per-family wrappers**, rather than eight fully
  independent methods. The spec itself describes these as separate
  numbered states per family; collapsing the *implementation* while
  keeping the *dispatch* faithful to all eight distinct `State` enum
  values is a course-specific efficiency choice, not a spec requirement.
- **`tempBuffer` is a plain string that gets rebuilt from scratch (`''`)
  every time a new end-tag attempt starts**, rather than reused across
  attempts. Simpler to reason about at the cost of a small, irrelevant-at-
  this-scale allocation each attempt.
- **The Java `endTagNameState` represents "no character" (EOF) as a
  `boolean atEof` flag plus a boxed `Character`**, rather than throwing and
  catching an exception for control flow. Exceptions-for-control-flow is
  avoided here on both performance and readability grounds — this is a
  hot path that runs once per character across an entire document.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Appropriateness checked only at terminator characters, not continuously | (a) forced by spec |
| 2 | Failed match dumps buffered text and reconsumes the terminator | (a) forced by spec |
| 3 | PLAINTEXT has no exit state at all | (a) forced by spec |
| 4 | RAWTEXT never interprets `&` | (a) forced by spec |
| 5 | `lastStartTagName` tracked globally, set by a module that doesn't exist yet | (b) external contract (Module 9) |
| 6 | Four shared methods + thin per-family wrappers, not eight independent methods | (c) convention |
| 7 | `tempBuffer` rebuilt fresh per attempt | (c) convention |
| 8 | EOF represented via explicit boolean/boxed-null, not exceptions | (c) convention |

## What We Proved

- The "appropriate end tag token" mechanism works correctly in **both**
  directions: a matching name closes the section and emits a real
  `EndTagToken` (verified with real token-by-token output), and a
  non-matching name — even one that looks identical up to the final
  character before `>` — correctly falls back to literal text with zero
  characters lost or corrupted.
- RCDATA's character-reference integration with Module 4 works
  end-to-end, unforced: `<textarea>hi&amp;bye</textarea>`-shaped content
  decodes `&amp;` mid-stream and still finds the correct closing tag
  afterward — proof the two modules compose correctly, not just each in
  isolation.
- RAWTEXT and RCDATA's one real behavioral difference (character
  references) is independently verified, not just described: the same
  `&` character produces different token streams depending only on which
  of the two states is active.
- PLAINTEXT's one-way-door behavior holds even against adversarial input
  specifically designed to look like a tag or an entity
  (`<b>&amp;</b>`) — confirmed by checking the tokenizer's `state` field
  is still `PLAINTEXT` after processing, not just checking the tokens.
